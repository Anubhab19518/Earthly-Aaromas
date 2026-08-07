-- POS and Sales Engine
-- Creates sales orders, sales order items, payments, and the atomic processing RPC.

-- 1. Sales Orders
create table if not exists public.sales_orders (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    location_id uuid not null references public.locations(id) on delete restrict,
    order_number text not null,
    order_status text not null check (order_status in ('DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    subtotal numeric(12,2) not null check (subtotal >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    grand_total numeric(12,2) not null check (grand_total >= 0),
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists sales_orders_org_idx on public.sales_orders (organization_id);
create index if not exists sales_orders_loc_idx on public.sales_orders (location_id);
create unique index if not exists sales_orders_org_order_num_idx on public.sales_orders (organization_id, order_number);

-- 2. Sales Order Items
create table if not exists public.sales_order_items (
    id uuid primary key default gen_random_uuid(),
    sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
    menu_variant_id uuid not null references public.menu_variants(id) on delete restrict,
    quantity integer not null check (quantity > 0),
    unit_price numeric(12,2) not null check (unit_price >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    line_total numeric(12,2) not null check (line_total >= 0),
    created_at timestamptz not null default now()
);

create index if not exists sales_order_items_order_idx on public.sales_order_items (sales_order_id);

-- 3. Payments
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
    payment_method text not null check (payment_method in ('Cash', 'UPI', 'Card')),
    amount numeric(12,2) not null check (amount > 0),
    payment_status text not null check (payment_status in ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    transaction_reference text,
    paid_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (sales_order_id);

-- Trigger for updated_at
create trigger sales_orders_set_updated_at before update on public.sales_orders for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.payments enable row level security;

-- Policies
create policy "members can read sales orders" on public.sales_orders
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "members can read sales order items" on public.sales_order_items
  for select to authenticated
  using (sales_order_id in (select id from public.sales_orders where organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid() and status = 'ACTIVE')));

create policy "members can read payments" on public.payments
  for select to authenticated
  using (sales_order_id in (select id from public.sales_orders where organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid() and status = 'ACTIVE')));

-- 4. Atomic RPC to Process a Sale
create or replace function public.process_sale(
  p_location_id uuid,
  p_items jsonb,      -- array of { variant_id, quantity, unit_price, tax_amount, line_total }
  p_payments jsonb,   -- array of { method, amount, reference }
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_grand_total numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_actor_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_today text;
  v_daily_count integer;
  rec record;
  p_rec record;
begin
  -- 1. Validate employee and branch context
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select organization_id into v_org_id
  from public.locations
  where id = p_location_id and deleted_at is null;

  if v_org_id is null then
    raise exception 'Invalid location.' using errcode = '23514';
  end if;

  if not public.is_active_member(v_org_id) then
    raise exception 'Not an active member of this organization.' using errcode = '23514';
  end if;

  -- Generate order ID early so we can use it as a reference
  v_order_id := gen_random_uuid();
  
  -- Generate simple order number (e.g., ORD-YYYYMMDD-001)
  v_today := to_char(now(), 'YYYYMMDD');
  select count(*) into v_daily_count from public.sales_orders where location_id = p_location_id and order_number like 'ORD-' || v_today || '-%';
  v_order_number := 'ORD-' || v_today || '-' || lpad((v_daily_count + 1)::text, 3, '0');

  -- 2. Compute recipe consumption & 3. Validate and Post Inventory
  for rec in (
    select 
      r.ingredient_id, 
      ing.base_unit_id, 
      sum(r.quantity_in_base_unit * (i.value->>'quantity')::numeric) as total_qty
    from jsonb_array_elements(p_items) as i
    join public.recipe_items r on r.variant_id = (i.value->>'variant_id')::uuid
    join public.ingredients ing on ing.id = r.ingredient_id
    where r.organization_id = v_org_id
    group by r.ingredient_id, ing.base_unit_id
  ) loop
    -- Deduct inventory; this will throw if stock is insufficient, aborting the entire transaction safely.
    perform public.post_inventory_movement(
       v_org_id,
       p_location_id,
       rec.ingredient_id,
       'RECIPE_CONSUMPTION',
       'SALE',
       v_order_id::text,
       -(rec.total_qty),
       rec.base_unit_id,
       0,
       'Automated consumption for Sale ' || v_order_number
    );
  end loop;

  -- 4. Create Sales Order
  insert into public.sales_orders (
    id, organization_id, location_id, order_number, order_status, 
    subtotal, discount_amount, tax_amount, grand_total, created_by, completed_at
  ) values (
    v_order_id, v_org_id, p_location_id, v_order_number, 'COMPLETED',
    p_subtotal, p_discount, p_tax, p_grand_total, v_actor_id, now()
  );

  -- 5. Create Sales Order Items
  for rec in (
    select * from jsonb_array_elements(p_items)
  ) loop
    insert into public.sales_order_items (
      sales_order_id, menu_variant_id, quantity, unit_price, tax_amount, line_total
    ) values (
      v_order_id, 
      (rec.value->>'variant_id')::uuid, 
      (rec.value->>'quantity')::integer, 
      (rec.value->>'unit_price')::numeric, 
      (rec.value->>'tax_amount')::numeric, 
      (rec.value->>'line_total')::numeric
    );
  end loop;

  -- 6. Record Payment
  for p_rec in (
    select * from jsonb_array_elements(p_payments)
  ) loop
    insert into public.payments (
      sales_order_id, payment_method, amount, payment_status, transaction_reference
    ) values (
      v_order_id,
      p_rec.value->>'method',
      (p_rec.value->>'amount')::numeric,
      'COMPLETED',
      p_rec.value->>'reference'
    );
  end loop;

  -- 7. Audit Log
  insert into public.audit_log (
    organization_id, actor_id, action, entity_type, entity_id, new_data
  ) values (
    v_org_id, v_actor_id, 'SALE_COMPLETED', 'sales_orders', v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'location_id', p_location_id,
      'grand_total', p_grand_total
    )
  );

  return v_order_id;
end;
$$;
