-- Tea Chain ERP: Inventory Engine (Phase 1)
-- Regenerated from scratch.

-- ============================================================
-- 1. INVENTORY LEDGER (Immutable Source of Truth)
-- ============================================================

create table if not exists public.inventory_ledger (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete restrict,
  location_id     uuid        not null references public.locations(id)     on delete restrict,
  ingredient_id   uuid        not null references public.ingredients(id)   on delete restrict,
  transaction_type text       not null check (transaction_type in (
                                  'GOODS_RECEIPT',
                                  'TRANSFER_IN',
                                  'TRANSFER_OUT',
                                  'SALE',
                                  'RECIPE_CONSUMPTION',
                                  'STOCK_ADJUSTMENT',
                                  'WASTAGE',
                                  'RETURN'
                                )),
  reference_type  text,
  reference_id    text,
  quantity_change numeric(15, 6) not null,
  unit_id         uuid        not null references public.units(id) on delete restrict,
  running_cost    numeric(12, 4),
  remarks         text,
  performed_by    uuid        not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now()
);

create index if not exists inventory_ledger_org_loc_ing_idx
  on public.inventory_ledger (organization_id, location_id, ingredient_id);

create index if not exists inventory_ledger_created_at_idx
  on public.inventory_ledger (created_at desc);

-- ============================================================
-- Immutable Ledger Triggers (block UPDATE and DELETE)
-- ============================================================

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Inventory ledger entries are immutable and cannot be updated or deleted.'
    using errcode = '27000';
end;
$$;

drop trigger if exists inventory_ledger_prevent_update on public.inventory_ledger;
create trigger inventory_ledger_prevent_update
  before update on public.inventory_ledger
  for each row execute function public.prevent_ledger_mutation();

drop trigger if exists inventory_ledger_prevent_delete on public.inventory_ledger;
create trigger inventory_ledger_prevent_delete
  before delete on public.inventory_ledger
  for each row execute function public.prevent_ledger_mutation();

-- ============================================================
-- 2. INVENTORY SNAPSHOT (Cache / Materialized current stock)
-- ============================================================

create table if not exists public.inventory_snapshot (
  id              uuid           primary key default gen_random_uuid(),
  organization_id uuid           not null references public.organizations(id) on delete restrict,
  location_id     uuid           not null references public.locations(id)     on delete restrict,
  ingredient_id   uuid           not null references public.ingredients(id)   on delete restrict,
  quantity_on_hand numeric(15, 6) not null default 0,
  average_cost     numeric(12, 4),
  last_movement_at timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

create unique index if not exists inventory_snapshot_unique_key
  on public.inventory_snapshot (location_id, ingredient_id);

drop trigger if exists inventory_snapshot_set_updated_at on public.inventory_snapshot;
create trigger inventory_snapshot_set_updated_at
  before update on public.inventory_snapshot
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. INVENTORY POSTING SERVICE RPC
-- ============================================================
-- This is the ONLY authorised entry point for writing inventory movements.
-- Future modules (GRN, Transfers, Sales, Recipes, Wastage) MUST call this function.
-- `performed_by` is resolved from auth.uid() — it is NOT a parameter.
-- ============================================================

create or replace function public.post_inventory_movement(
  p_organization_id  uuid,
  p_location_id      uuid,
  p_ingredient_id    uuid,
  p_transaction_type text,
  p_reference_type   text,
  p_reference_id     text,
  p_quantity_change  numeric,
  p_unit_id          uuid,
  p_running_cost     numeric,
  p_remarks          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id       uuid;
  v_base_unit_id    uuid;
  v_loc_org_id      uuid;
  v_actor_id        uuid;
begin
  -- Resolve the authenticated user
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Validate: location belongs to the given organization
  select organization_id into v_loc_org_id
    from public.locations
    where id = p_location_id
      and deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> p_organization_id then
    raise exception 'Location not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: ingredient belongs to the given organization, fetch base unit
  select base_unit_id into v_base_unit_id
    from public.ingredients
    where id = p_ingredient_id
      and organization_id = p_organization_id
      and deleted_at is null;

  if v_base_unit_id is null then
    raise exception 'Ingredient not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: unit_id must match ingredient base unit
  if v_base_unit_id <> p_unit_id then
    raise exception 'Inventory must be posted in the ingredient''s base unit.' using errcode = '23514';
  end if;

  -- Insert into immutable Ledger
  insert into public.inventory_ledger (
    organization_id,
    location_id,
    ingredient_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    unit_id,
    running_cost,
    remarks,
    performed_by,
    created_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_quantity_change,
    p_unit_id,
    p_running_cost,
    p_remarks,
    v_actor_id,
    now()
  )
  returning id into v_ledger_id;

  -- Atomically upsert Snapshot
  insert into public.inventory_snapshot (
    organization_id,
    location_id,
    ingredient_id,
    quantity_on_hand,
    last_movement_at,
    updated_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_quantity_change,
    now(),
    now()
  )
  on conflict (location_id, ingredient_id) do update set
    quantity_on_hand  = public.inventory_snapshot.quantity_on_hand + excluded.quantity_on_hand,
    last_movement_at  = excluded.last_movement_at,
    updated_at        = excluded.updated_at;

  -- Audit log
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks
    )
  );

  return v_ledger_id;
end;
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.inventory_ledger   enable row level security;
alter table public.inventory_snapshot enable row level security;

-- Ledger: select only — writes go exclusively through the security-definer RPC
create policy "users with permission can view inventory ledger"
  on public.inventory_ledger for select to authenticated
  using (
    public.has_mfa_assurance()
    and public.has_permission(organization_id, 'master_data.manage')
  );

-- Snapshot: read-only for the dashboard
create policy "users with permission can view inventory snapshot"
  on public.inventory_snapshot for select to authenticated
  using (
    public.has_mfa_assurance()
    and public.has_permission(organization_id, 'master_data.manage')
  );

-- Grant read access; writes happen only through the RPC (security definer)
grant select on public.inventory_ledger   to authenticated;
grant select on public.inventory_snapshot to authenticated;
