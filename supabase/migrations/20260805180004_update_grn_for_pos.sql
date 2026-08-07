-- Update post_goods_receipt to handle Purchase Orders
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
  v_po_id          uuid;
  v_unfulfilled    int;
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

  -- Handle Purchase Order Auto-Status Update if linked
  if v_grn.purchase_order_id is not null then
    v_po_id := v_grn.purchase_order_id;
    
    -- Check if there are any items in the PO that have received less than their requested converted_base_quantity
    select count(*) into v_unfulfilled
    from public.purchase_order_items poi
    where poi.po_id = v_po_id
      and poi.converted_base_quantity > COALESCE((
          select sum(gri.converted_base_quantity)
          from public.goods_receipt_items gri
          join public.goods_receipts gr on gr.id = gri.goods_receipt_id
          where gr.purchase_order_id = v_po_id
            and gr.status = 'POSTED'
            and gri.ingredient_id = poi.ingredient_id
      ), 0);

    if v_unfulfilled > 0 then
      update public.purchase_orders
        set status = 'PARTIAL'
        where id = v_po_id and status in ('APPROVED', 'SENT', 'PARTIAL');
    else
      update public.purchase_orders
        set status = 'COMPLETED'
        where id = v_po_id and status in ('APPROVED', 'SENT', 'PARTIAL');
    end if;
  end if;

  -- Audit
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
    values (v_grn.organization_id, v_actor_id, 'GRN_POSTED', 'goods_receipts', p_grn_id);
end;
$$;
