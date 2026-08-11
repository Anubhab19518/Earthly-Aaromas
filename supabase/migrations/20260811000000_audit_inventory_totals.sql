-- ============================================================
-- Migration: Add old_data and new_data to Inventory Audit Log
-- ============================================================
-- Description:
-- Updates the `post_inventory_movement` RPC to accurately record the 
-- old and new total inventory quantity_on_hand in the audit log.
-- ============================================================

create or replace function public.post_inventory_movement(
  p_organization_id   uuid,
  p_location_id       uuid,
  p_ingredient_id     uuid,
  p_transaction_type  text,
  p_quantity_change   numeric,
  p_unit_id           uuid,
  p_reference_type    text default null,
  p_reference_id      text default null,
  p_running_cost      numeric default null,
  p_remarks           text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id  uuid;
  v_ledger_id uuid;
  v_old_qty   numeric;
  v_new_qty   numeric;
begin
  -- 1. Grab the current user (requires our auth_context function)
  v_actor_id := public.get_auth_user_id();
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Validate transaction type
  if p_transaction_type not in (
    'GOODS_RECEIPT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'SALE',
    'RECIPE_CONSUMPTION',
    'STOCK_ADJUSTMENT',
    'WASTAGE',
    'RETURN'
  ) then
    raise exception 'Invalid transaction type: %', p_transaction_type;
  end if;

  -- 3. Insert Ledger Entry
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

  -- 4. Get current quantity_on_hand before update
  select quantity_on_hand into v_old_qty
  from public.inventory_snapshot
  where organization_id = p_organization_id
    and location_id = p_location_id
    and ingredient_id = p_ingredient_id;

  if v_old_qty is null then
    v_old_qty := 0;
  end if;

  v_new_qty := v_old_qty + p_quantity_change;

  -- 5. Atomically upsert Snapshot
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

  -- 6. Audit log
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'total_quantity_on_hand', v_old_qty
    ),
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks,
      'total_quantity_on_hand', v_new_qty
    )
  );

  return v_ledger_id;
end;
$$;
