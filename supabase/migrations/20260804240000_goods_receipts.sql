-- Tea Chain ERP: Goods Receipt (GRN) Module

-- ============================================================
-- 0. PER-ORGANIZATION SEQUENCE TABLE
-- Used for generating unique, gapless, concurrent-safe document numbers.
-- Pattern: UPDATE ... RETURNING takes a row lock, serializing concurrent inserts.
-- ============================================================

create table if not exists public.organization_sequences (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sequence_name   text not null,
  last_value      bigint not null default 0,
  primary key (organization_id, sequence_name)
);

-- Only owners/internal functions should manipulate sequences
alter table public.organization_sequences enable row level security;

create policy "service role can manage sequences"
  on public.organization_sequences for all
  to service_role using (true);

grant all on public.organization_sequences to service_role;

-- Helper function: safely increment and return next sequence value
create or replace function public.next_sequence_value(
  p_organization_id uuid,
  p_sequence_name   text
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  -- INSERT the sequence row if it doesn't exist yet, then increment atomically.
  insert into public.organization_sequences (organization_id, sequence_name, last_value)
    values (p_organization_id, p_sequence_name, 1)
    on conflict (organization_id, sequence_name) do update
      set last_value = public.organization_sequences.last_value + 1
    returning last_value into v_next;

  return v_next;
end;
$$;

-- ============================================================
-- 1. GOODS RECEIPTS (Header)
-- ============================================================

create table if not exists public.goods_receipts (
  id                    uuid        primary key default gen_random_uuid(),
  organization_id       uuid        not null references public.organizations(id) on delete restrict,
  grn_number            text        not null,
  supplier_id           uuid        not null references public.suppliers(id) on delete restrict,
  warehouse_location_id uuid        not null references public.locations(id) on delete restrict,
  invoice_number        text,
  invoice_date          date,
  received_date         date        not null,
  remarks               text,
  status                text        not null default 'DRAFT'
                                    check (status in ('DRAFT', 'POSTED', 'CANCELLED')),
  created_by            uuid        not null references public.profiles(id) on delete restrict,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- GRN number is unique per organization
create unique index if not exists goods_receipts_grn_number_key
  on public.goods_receipts (organization_id, grn_number)
  where deleted_at is null;

drop trigger if exists goods_receipts_set_updated_at on public.goods_receipts;
create trigger goods_receipts_set_updated_at
  before update on public.goods_receipts
  for each row execute function public.set_updated_at();

-- Validate warehouse location belongs to same org and is WAREHOUSE type
create or replace function public.enforce_grn_header_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc_org_id  uuid;
  v_loc_type    text;
begin
  -- Check location ownership
  select l.organization_id, lt.code
    into v_loc_org_id, v_loc_type
    from public.locations l
    join public.location_types lt on lt.id = l.location_type_id
    where l.id = new.warehouse_location_id
      and l.deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> new.organization_id then
    raise exception 'Warehouse location does not belong to this organization.' using errcode = '23514';
  end if;

  if v_loc_type <> 'WAREHOUSE' then
    raise exception 'Goods receipts can only be received into a WAREHOUSE location.' using errcode = '23514';
  end if;

  -- Block mutations once POSTED
  if TG_OP = 'UPDATE' and old.status = 'POSTED' then
    raise exception 'A posted GRN is immutable and cannot be modified.' using errcode = '27000';
  end if;

  return new;
end;
$$;

drop trigger if exists goods_receipts_enforce_rules on public.goods_receipts;
create trigger goods_receipts_enforce_rules
  before insert or update on public.goods_receipts
  for each row execute function public.enforce_grn_header_rules();

-- ============================================================
-- 2. GOODS RECEIPT ITEMS (Lines)
-- ============================================================

create table if not exists public.goods_receipt_items (
  id                     uuid           primary key default gen_random_uuid(),
  goods_receipt_id       uuid           not null references public.goods_receipts(id) on delete restrict,
  ingredient_id          uuid           not null references public.ingredients(id) on delete restrict,
  purchase_unit_id       uuid           not null references public.units(id) on delete restrict,
  received_quantity      numeric(15, 6) not null check (received_quantity > 0),
  converted_base_quantity numeric(15, 6) not null,
  unit_cost              numeric(12, 4) not null check (unit_cost >= 0),
  tax_category_id        uuid           references public.tax_categories(id) on delete restrict,
  line_total             numeric(14, 4) not null,
  created_at             timestamptz    not null default now(),
  updated_at             timestamptz    not null default now()
);

drop trigger if exists goods_receipt_items_set_updated_at on public.goods_receipt_items;
create trigger goods_receipt_items_set_updated_at
  before update on public.goods_receipt_items
  for each row execute function public.set_updated_at();

-- Block mutations on items once parent GRN is POSTED
create or replace function public.enforce_grn_item_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grn_status text;
begin
  select status into v_grn_status
    from public.goods_receipts
    where id = coalesce(new.goods_receipt_id, old.goods_receipt_id);

  if v_grn_status = 'POSTED' then
    raise exception 'Items on a posted GRN are immutable and cannot be modified or deleted.' using errcode = '27000';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists goods_receipt_items_enforce_rules on public.goods_receipt_items;
create trigger goods_receipt_items_enforce_rules
  before insert or update or delete on public.goods_receipt_items
  for each row execute function public.enforce_grn_item_rules();

-- ============================================================
-- 3. POST GOODS RECEIPT RPC
-- Atomically posts all GRN lines to the Inventory Posting Service.
-- ============================================================

create or replace function public.post_goods_receipt(
  p_grn_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grn            record;
  v_item           record;
  v_actor_id       uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Lock and fetch GRN
  select * into v_grn
    from public.goods_receipts
    where id = p_grn_id
    for update;

  if not found then
    raise exception 'GRN not found.' using errcode = '23514';
  end if;

  if v_grn.status <> 'DRAFT' then
    raise exception 'Only DRAFT GRNs can be posted. Current status: %', v_grn.status
      using errcode = '23514';
  end if;

  if not exists (select 1 from public.goods_receipt_items where goods_receipt_id = p_grn_id) then
    raise exception 'Cannot post a GRN with no items.' using errcode = '23514';
  end if;

  -- Post each line item through the Inventory Posting Service
  for v_item in
    select * from public.goods_receipt_items where goods_receipt_id = p_grn_id
  loop
    -- Fetch the ingredient's base_unit_id for posting
    declare
      v_base_unit_id uuid;
    begin
      select base_unit_id into v_base_unit_id
        from public.ingredients
        where id = v_item.ingredient_id;

      perform public.post_inventory_movement(
        p_organization_id  => v_grn.organization_id,
        p_location_id      => v_grn.warehouse_location_id,
        p_ingredient_id    => v_item.ingredient_id,
        p_transaction_type => 'GOODS_RECEIPT',
        p_reference_type   => 'GRN',
        p_reference_id     => v_grn.grn_number,
        p_quantity_change  => v_item.converted_base_quantity,
        p_unit_id          => v_base_unit_id,
        p_running_cost     => v_item.unit_cost,
        p_remarks          => 'GRN: ' || v_grn.grn_number
      );
    end;
  end loop;

  -- Mark GRN as POSTED
  update public.goods_receipts
    set status = 'POSTED'
    where id = p_grn_id;

  -- Audit
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
    values (v_grn.organization_id, v_actor_id, 'GRN_POSTED', 'goods_receipts', p_grn_id);
end;
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.goods_receipts       enable row level security;
alter table public.goods_receipt_items  enable row level security;

create policy "users with permission can view goods receipts"
  on public.goods_receipts for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage goods receipts"
  on public.goods_receipts for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can view grn items"
  on public.goods_receipt_items for select to authenticated
  using (
    public.has_mfa_assurance() and
    exists (
      select 1 from public.goods_receipts gr
       where gr.id = goods_receipt_id
         and public.has_permission(gr.organization_id, 'master_data.manage')
    )
  );

create policy "users with permission can manage grn items"
  on public.goods_receipt_items for all to authenticated
  using (
    public.has_mfa_assurance() and
    exists (
      select 1 from public.goods_receipts gr
       where gr.id = goods_receipt_id
         and public.has_permission(gr.organization_id, 'master_data.manage')
    )
  )
  with check (
    public.has_mfa_assurance() and
    exists (
      select 1 from public.goods_receipts gr
       where gr.id = goods_receipt_id
         and public.has_permission(gr.organization_id, 'master_data.manage')
    )
  );

grant all on public.goods_receipts      to authenticated;
grant all on public.goods_receipt_items to authenticated;
