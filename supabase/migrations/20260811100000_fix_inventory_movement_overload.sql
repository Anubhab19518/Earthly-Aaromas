-- ============================================================
-- Fix: Restore post_inventory_movement to the canonical signature
-- ============================================================
-- PROBLEM SUMMARY:
-- Migration 20260811000000_audit_inventory_totals.sql created a NEW overload of
-- post_inventory_movement with a DIFFERENT parameter order AND used a non-existent
-- helper function `public.get_auth_user_id()`.
--
-- This left TWO incompatible overloads in the DB:
--   OLD (all callers use this): (..., p_reference_type, p_reference_id, p_quantity_change, ...)
--   NEW (20260811):             (..., p_quantity_change, p_unit_id, p_reference_type [default], ...)
--
-- Callers that use POSITIONAL args (sales_pos, order_queue_rpcs) target the OLD signature.
-- Callers that use NAMED args (stock_transfers_rpc, grns, update_grn_for_pos) hit ambiguity.
--
-- FIX STRATEGY:
-- 1. Drop BOTH overloads to fully clean up.
-- 2. Recreate ONE canonical function using the ORIGINAL signature (old param order, auth.uid())
--    but INCLUDING the old_data/new_data audit enhancements from the 20260811 migration.
-- ============================================================

-- Step 1: Drop the NEW overload (quantity_change before reference params, with defaults)
drop function if exists public.post_inventory_movement(
  uuid,    -- p_organization_id
  uuid,    -- p_location_id
  uuid,    -- p_ingredient_id
  text,    -- p_transaction_type
  numeric, -- p_quantity_change  <-- NEW position (position 5)
  uuid,    -- p_unit_id
  text,    -- p_reference_type  (default null)
  text,    -- p_reference_id    (default null)
  numeric, -- p_running_cost    (default null)
  text     -- p_remarks         (default null)
);

-- Step 2: Recreate the ONE canonical function with the ORIGINAL signature + old/new audit data
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
  v_old_qty         numeric;
  v_new_qty         numeric;
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

  -- Get current quantity_on_hand BEFORE update (for audit old_data)
  select quantity_on_hand into v_old_qty
  from public.inventory_snapshot
  where organization_id = p_organization_id
    and location_id = p_location_id
    and ingredient_id = p_ingredient_id;

  if v_old_qty is null then
    v_old_qty := 0;
  end if;

  v_new_qty := v_old_qty + p_quantity_change;

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

  -- Audit log with old_data and new_data (enhanced from 20260811 migration)
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
