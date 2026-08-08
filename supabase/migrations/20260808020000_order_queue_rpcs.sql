-- Phase 4A: Order Queue RPCs
-- Implements the deferred inventory consumption workflow.
-- Replaces process_sale() for the order-based POS workflow.

-- ============================================================
-- HELPER: get the authenticated employee's organization_id and
-- location_id from organization_memberships (bypasses aal2 RLS).
-- Used internally by security-definer order RPCs.
-- ============================================================

create or replace function public._get_employee_context()
returns table(organization_id uuid, location_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id, m.location_id
  from public.organization_memberships m
  where m.user_id = auth.uid()
    and m.status = 'ACTIVE'
    and m.deleted_at is null
  limit 1;
$$;

-- ============================================================
-- 1. create_order — Place an order (CONFIRMED). NO inventory movement.
--    Validates all pricing server-side. Does NOT trust client totals.
-- ============================================================

create or replace function public.create_order(
  p_location_id    uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_items          jsonb,  -- [{ variant_id, quantity, unit_price, tax_amount, line_total }]
  p_subtotal       numeric,
  p_discount       numeric,
  p_tax            numeric,
  p_grand_total    numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id       uuid;
  v_org_id         uuid;
  v_emp_location   uuid;
  v_order_id       uuid;
  v_order_number   text;
  v_today          text;
  v_daily_count    integer;
  v_item           jsonb;
  v_variant_id     uuid;
  v_quantity       integer;
  v_client_price   numeric;
  v_variant        record;
  v_server_price   numeric;
  v_tax_rate       numeric;
  v_server_subtotal  numeric := 0;
  v_server_tax       numeric := 0;
  v_item_line_total  numeric;
  v_item_tax         numeric;
begin
  -- 1. Authenticate
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- 2. Resolve employee org + location (security definer to bypass aal2 RLS)
  select ec.organization_id, ec.location_id
    into v_org_id, v_emp_location
  from public._get_employee_context() ec;

  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  -- 3. Validate that p_location_id belongs to employee's org
  if not exists (
    select 1 from public.locations
    where id = p_location_id
      and organization_id = v_org_id
      and deleted_at is null
  ) then
    raise exception 'Invalid location.' using errcode = '23514';
  end if;

  -- 4. Validate employee is assigned to this location
  if v_emp_location is distinct from p_location_id then
    raise exception 'You are not assigned to this branch.' using errcode = '23514';
  end if;

  -- 5. Validate customer name
  if p_customer_name is null or trim(p_customer_name) = '' then
    raise exception 'Customer name is required.' using errcode = '23514';
  end if;

  -- 6. Validate items is non-empty array
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Order must have at least one item.' using errcode = '23514';
  end if;

  -- 7. Validate each item: variant ownership, availability, pricing
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id   := (v_item->>'variant_id')::uuid;
    v_quantity     := (v_item->>'quantity')::integer;
    v_client_price := (v_item->>'unit_price')::numeric;

    -- Quantity must be positive
    if v_quantity is null or v_quantity < 1 then
      raise exception 'Item quantity must be at least 1.' using errcode = '23514';
    end if;

    -- Fetch variant + item + tax info, validating org ownership & active status
    select
      mv.id,
      mv.default_price,
      mv.is_active,
      mv.deleted_at,
      coalesce(bmc.price_override, mv.default_price) as effective_price,
      bmc.is_available,
      coalesce(tr.rate_percentage, 0) as tax_rate
    into v_variant
    from public.menu_variants mv
    join public.menu_items mi on mi.id = mv.menu_item_id
    left join public.branch_menu_configs bmc
      on bmc.variant_id = mv.id
     and bmc.location_id = p_location_id
     and bmc.organization_id = v_org_id
    left join public.tax_categories tc on tc.id = mi.tax_category_id
    left join public.tax_rates tr
      on tr.tax_category_id = tc.id
     and tr.deleted_at is null
     and tr.effective_from <= current_date
    where mv.id = v_variant_id
      and mv.organization_id = v_org_id;

    if not found then
      raise exception 'Variant % not found or does not belong to this organization.', v_variant_id
        using errcode = '23514';
    end if;

    if not v_variant.is_active or v_variant.deleted_at is not null then
      raise exception 'Variant % is not active.', v_variant_id using errcode = '23514';
    end if;

    -- Check branch availability (null config means available by default)
    if v_variant.is_available is not null and v_variant.is_available = false then
      raise exception 'Variant % is not available at this branch.', v_variant_id
        using errcode = '23514';
    end if;

    v_server_price := v_variant.effective_price;

    -- Validate client-submitted unit_price matches server price (±0.01 tolerance)
    if abs(v_client_price - v_server_price) > 0.01 then
      raise exception 'Price mismatch for variant %. Expected %, received %.',
        v_variant_id, v_server_price, v_client_price
        using errcode = '23514';
    end if;

    -- Accumulate server-side totals
    v_tax_rate       := v_variant.tax_rate;
    v_item_line_total := v_server_price * v_quantity;
    v_item_tax        := round((v_item_line_total * v_tax_rate / 100), 2);
    v_server_subtotal := v_server_subtotal + v_item_line_total;
    v_server_tax      := v_server_tax + v_item_tax;
  end loop;

  -- 8. Validate totals submitted by client (±0.10 tolerance for rounding)
  if abs(p_subtotal - v_server_subtotal) > 0.10 then
    raise exception 'Subtotal mismatch. Expected %, received %.', v_server_subtotal, p_subtotal
      using errcode = '23514';
  end if;

  if abs(p_tax - v_server_tax) > 0.10 then
    raise exception 'Tax amount mismatch. Expected %, received %.', v_server_tax, p_tax
      using errcode = '23514';
  end if;

  declare
    v_server_grand_total numeric := round(v_server_subtotal - coalesce(p_discount, 0) + v_server_tax, 2);
  begin
    if abs(p_grand_total - v_server_grand_total) > 0.10 then
      raise exception 'Grand total mismatch. Expected %, received %.', v_server_grand_total, p_grand_total
        using errcode = '23514';
    end if;
  end;

  -- 9. Generate order number
  v_order_id   := gen_random_uuid();
  v_today      := to_char(now(), 'YYYYMMDD');
  select count(*) into v_daily_count
    from public.sales_orders
   where location_id = p_location_id
     and order_number like 'ORD-' || v_today || '-%';
  v_order_number := 'ORD-' || v_today || '-' || lpad((v_daily_count + 1)::text, 3, '0');

  -- 10. Insert sales order (CONFIRMED, using server-calculated totals)
  insert into public.sales_orders (
    id, organization_id, location_id, order_number, order_status,
    customer_name, customer_phone,
    subtotal, discount_amount, tax_amount, grand_total, created_by
  ) values (
    v_order_id, v_org_id, p_location_id, v_order_number, 'CONFIRMED',
    trim(p_customer_name), nullif(trim(coalesce(p_customer_phone, '')), ''),
    v_server_subtotal, coalesce(p_discount, 0), v_server_tax,
    round(v_server_subtotal - coalesce(p_discount, 0) + v_server_tax, 2),
    v_actor_id
  );

  -- 11. Insert order items (use server-verified unit_price)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;

    -- Re-fetch server price for each item (already validated above)
    select coalesce(bmc.price_override, mv.default_price),
           coalesce(tr.rate_percentage, 0)
      into v_server_price, v_tax_rate
    from public.menu_variants mv
    left join public.branch_menu_configs bmc
      on bmc.variant_id = mv.id
     and bmc.location_id = p_location_id
     and bmc.organization_id = v_org_id
    left join public.menu_items mi on mi.id = mv.menu_item_id
    left join public.tax_categories tc on tc.id = mi.tax_category_id
    left join public.tax_rates tr
      on tr.tax_category_id = tc.id
     and tr.deleted_at is null
     and tr.effective_from <= current_date
    where mv.id = v_variant_id;

    v_item_line_total := v_server_price * v_quantity;
    v_item_tax        := round(v_item_line_total * v_tax_rate / 100, 2);

    insert into public.sales_order_items (
      sales_order_id, menu_variant_id, quantity,
      unit_price, tax_amount, line_total
    ) values (
      v_order_id, v_variant_id, v_quantity,
      v_server_price, v_item_tax, v_item_line_total
    );
  end loop;

  -- 12. Audit
  insert into public.audit_log (
    organization_id, actor_id, action, entity_type, entity_id, new_data
  ) values (
    v_org_id, v_actor_id, 'ORDER_CREATED', 'sales_orders', v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'customer_name', p_customer_name,
      'location_id', p_location_id
    )
  );

  return v_order_id;
end;
$$;

-- ============================================================
-- 2. start_preparing_order — Atomically consume recipe ingredients.
--    Transitions CONFIRMED → PREPARING.
-- ============================================================

create or replace function public.start_preparing_order(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
  rec            record;
  v_avail        numeric;
  v_ing_name     text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Get employee context
  select ec.organization_id, ec.location_id
    into v_org_id, v_emp_location
  from public._get_employee_context() ec;

  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  -- Lock the order row (prevents concurrent double-starts)
  select * into v_order
  from public.sales_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;

  -- Validate org ownership
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;

  -- Validate employee is at the right location
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;

  -- Validate status is CONFIRMED (prevents double consumption)
  if v_order.order_status <> 'CONFIRMED' then
    raise exception 'Order is not in CONFIRMED status (current: %). Cannot start preparation.',
      v_order.order_status using errcode = '23514';
  end if;

  -- Pre-validate: check all ingredients have sufficient stock before deducting anything
  for rec in (
    select
      r.ingredient_id,
      ing.name as ingredient_name,
      ing.base_unit_id,
      u.symbol as unit_symbol,
      sum(r.quantity_in_base_unit * soi.quantity) as total_required
    from public.sales_order_items soi
    join public.recipe_items r on r.variant_id = soi.menu_variant_id
    join public.ingredients ing on ing.id = r.ingredient_id
    join public.units u on u.id = ing.base_unit_id
    where soi.sales_order_id = p_order_id
      and r.organization_id = v_org_id
    group by r.ingredient_id, ing.name, ing.base_unit_id, u.symbol
  ) loop
    -- Check current stock
    select coalesce(snap.quantity_on_hand, 0) into v_avail
    from public.inventory_snapshot snap
    where snap.location_id = v_order.location_id
      and snap.ingredient_id = rec.ingredient_id;

    if v_avail is null then
      v_avail := 0;
    end if;

    if v_avail < rec.total_required then
      raise exception 'Insufficient stock: %. Required: % %, Available: % %.',
        rec.ingredient_name,
        round(rec.total_required, 3), rec.unit_symbol,
        round(v_avail, 3), rec.unit_symbol
        using errcode = '23514';
    end if;
  end loop;

  -- Deduct inventory for each ingredient (atomically — any failure rolls back all)
  for rec in (
    select
      r.ingredient_id,
      ing.base_unit_id,
      sum(r.quantity_in_base_unit * soi.quantity) as total_qty
    from public.sales_order_items soi
    join public.recipe_items r on r.variant_id = soi.menu_variant_id
    join public.ingredients ing on ing.id = r.ingredient_id
    where soi.sales_order_id = p_order_id
      and r.organization_id = v_org_id
    group by r.ingredient_id, ing.base_unit_id
  ) loop
    perform public.post_inventory_movement(
      v_org_id,
      v_order.location_id,
      rec.ingredient_id,
      'RECIPE_CONSUMPTION',
      'SALE',
      p_order_id::text,
      -(rec.total_qty),
      rec.base_unit_id,
      0,
      'Recipe consumption for order ' || v_order.order_number
    );
  end loop;

  -- Transition to PREPARING
  update public.sales_orders
    set order_status = 'PREPARING', updated_at = now()
  where id = p_order_id;

  -- Audit
  insert into public.audit_log (
    organization_id, actor_id, action, entity_type, entity_id
  ) values (
    v_org_id, v_actor_id, 'ORDER_PREPARING_STARTED', 'sales_orders', p_order_id
  );
end;
$$;

-- ============================================================
-- 3. mark_order_ready — PREPARING → READY. No inventory movement.
-- ============================================================

create or replace function public.mark_order_ready(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;
  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;
  if v_order.order_status <> 'PREPARING' then
    raise exception 'Order must be in PREPARING status to mark as READY (current: %).', v_order.order_status
      using errcode = '23514';
  end if;

  update public.sales_orders
    set order_status = 'READY', updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_actor_id, 'ORDER_READY', 'sales_orders', p_order_id);
end;
$$;

-- ============================================================
-- 4. complete_order — READY → COMPLETED. No inventory movement.
-- ============================================================

create or replace function public.complete_order(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;
  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;
  if v_order.order_status <> 'READY' then
    raise exception 'Order must be in READY status to complete (current: %).', v_order.order_status
      using errcode = '23514';
  end if;

  update public.sales_orders
    set order_status = 'COMPLETED', completed_at = now(), updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_actor_id, 'ORDER_COMPLETED', 'sales_orders', p_order_id);
end;
$$;

-- ============================================================
-- 5. cancel_order — CONFIRMED → CANCELLED only.
--    PREPARING/READY/COMPLETED cancellation is BLOCKED.
-- ============================================================

create or replace function public.cancel_order(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;
  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;

  if v_order.order_status in ('PREPARING', 'READY', 'COMPLETED') then
    raise exception 'Cannot cancel an order that is already %. Inventory has been consumed. Contact your manager.',
      v_order.order_status using errcode = '23514';
  end if;
  if v_order.order_status = 'CANCELLED' then
    raise exception 'Order is already cancelled.' using errcode = '23514';
  end if;
  if v_order.order_status <> 'CONFIRMED' then
    raise exception 'Only CONFIRMED orders can be cancelled.' using errcode = '23514';
  end if;

  update public.sales_orders
    set order_status = 'CANCELLED', updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_actor_id, 'ORDER_CANCELLED', 'sales_orders', p_order_id);
end;
$$;

-- ============================================================
-- 6. get_location_orders — Fetch active orders for a location (employee use)
-- ============================================================

create or replace function public.get_location_orders(
  p_location_id uuid
) returns table(
  order_id       uuid,
  order_number   text,
  order_status   text,
  customer_name  text,
  customer_phone text,
  subtotal       numeric,
  tax_amount     numeric,
  grand_total    numeric,
  created_at     timestamptz,
  updated_at     timestamptz,
  items          jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id       uuid;
  v_emp_location uuid;
begin
  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;

  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  if v_emp_location is distinct from p_location_id then
    raise exception 'You are not assigned to this branch.' using errcode = '23514';
  end if;

  return query
  select
    so.id as order_id,
    so.order_number,
    so.order_status,
    so.customer_name,
    so.customer_phone,
    so.subtotal,
    so.tax_amount,
    so.grand_total,
    so.created_at,
    so.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_id',      soi.id,
          'variant_id',   soi.menu_variant_id,
          'variant_name', mv.name,
          'item_name',    mi.name,
          'quantity',     soi.quantity,
          'unit_price',   soi.unit_price,
          'line_total',   soi.line_total
        )
        order by soi.created_at
      ) filter (where soi.id is not null),
      '[]'::jsonb
    ) as items
  from public.sales_orders so
  left join public.sales_order_items soi on soi.sales_order_id = so.id
  left join public.menu_variants mv on mv.id = soi.menu_variant_id
  left join public.menu_items mi on mi.id = mv.menu_item_id
  where so.location_id = p_location_id
    and so.organization_id = v_org_id
    and so.order_status in ('CONFIRMED', 'PREPARING', 'READY')
  group by so.id
  order by so.created_at asc;
end;
$$;

-- Revoke public access, grant to authenticated (employees are authenticated)
revoke all on function public._get_employee_context() from public, anon;
grant execute on function public._get_employee_context() to authenticated;

revoke all on function public.create_order(uuid, text, text, jsonb, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.create_order(uuid, text, text, jsonb, numeric, numeric, numeric, numeric) to authenticated;

revoke all on function public.start_preparing_order(uuid) from public, anon;
grant execute on function public.start_preparing_order(uuid) to authenticated;

revoke all on function public.mark_order_ready(uuid) from public, anon;
grant execute on function public.mark_order_ready(uuid) to authenticated;

revoke all on function public.complete_order(uuid) from public, anon;
grant execute on function public.complete_order(uuid) to authenticated;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

revoke all on function public.get_location_orders(uuid) from public, anon;
grant execute on function public.get_location_orders(uuid) to authenticated;
