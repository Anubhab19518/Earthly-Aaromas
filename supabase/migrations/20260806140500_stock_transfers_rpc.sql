-- Stock Transfer Posting RPC
create or replace function public.post_stock_transfer(
  p_transfer_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer       record;
  v_item           record;
  v_actor_id       uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Lock and fetch Transfer
  select * into v_transfer
    from public.stock_transfers
    where id = p_transfer_id
    for update;

  if not found then
    raise exception 'Transfer not found.' using errcode = '23514';
  end if;

  if v_transfer.status <> 'SHIPPED' then
    raise exception 'Only SHIPPED transfers can be received. Current status: %', v_transfer.status
      using errcode = '23514';
  end if;

  if not exists (select 1 from public.stock_transfer_items where transfer_id = p_transfer_id) then
    raise exception 'Cannot receive a transfer with no items.' using errcode = '23514';
  end if;

  -- Process each item atomically
  for v_item in
    select * from public.stock_transfer_items where transfer_id = p_transfer_id
  loop
    declare
      v_base_unit_id uuid;
    begin
      select base_unit_id into v_base_unit_id
        from public.ingredients
        where id = v_item.ingredient_id;

      -- 1. Deduct from Source Location
      perform public.post_inventory_movement(
        p_organization_id  => v_transfer.organization_id,
        p_location_id      => v_transfer.source_location_id,
        p_ingredient_id    => v_item.ingredient_id,
        p_transaction_type => 'TRANSFER_OUT',
        p_reference_type   => 'STOCK_TRANSFER',
        p_reference_id     => v_transfer.transfer_number,
        p_quantity_change  => -v_item.converted_base_quantity,
        p_unit_id          => v_base_unit_id,
        p_running_cost     => 0,
        p_remarks          => 'Transfer Out: ' || v_transfer.transfer_number
      );

      -- 2. Add to Destination Location
      perform public.post_inventory_movement(
        p_organization_id  => v_transfer.organization_id,
        p_location_id      => v_transfer.destination_location_id,
        p_ingredient_id    => v_item.ingredient_id,
        p_transaction_type => 'TRANSFER_IN',
        p_reference_type   => 'STOCK_TRANSFER',
        p_reference_id     => v_transfer.transfer_number,
        p_quantity_change  => v_item.converted_base_quantity,
        p_unit_id          => v_base_unit_id,
        p_running_cost     => 0,
        p_remarks          => 'Transfer In: ' || v_transfer.transfer_number
      );
    end;
  end loop;

  -- Mark Transfer as RECEIVED
  update public.stock_transfers
    set status = 'RECEIVED'
    where id = p_transfer_id;

  -- Audit
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
    values (v_transfer.organization_id, v_actor_id, 'TRANSFER_RECEIVED', 'stock_transfers', p_transfer_id);
end;
$$;
