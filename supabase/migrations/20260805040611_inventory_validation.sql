-- Atomic validation for inventory movements

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
  v_current_stock   numeric;
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

  -- Atomically lock the snapshot row to validate negative stock
  select quantity_on_hand into v_current_stock
    from public.inventory_snapshot
    where location_id = p_location_id and ingredient_id = p_ingredient_id
    for update;
    
  if not found then
    v_current_stock := 0;
  end if;

  if p_quantity_change < 0 and (v_current_stock + p_quantity_change) < 0 then
    raise exception 'Insufficient inventory. Current stock: %, Attempted deduction: %', v_current_stock, abs(p_quantity_change) using errcode = '23514';
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
