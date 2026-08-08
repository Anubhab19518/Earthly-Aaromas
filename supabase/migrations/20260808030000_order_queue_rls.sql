-- Phase 4A: RLS Update for employee access to sales_orders
-- Employees operate at aal1 (no TOTP), so they need to read sales_orders
-- for their assigned location without the aal2 restriction.
-- The security-definer RPCs handle write access; this adds read access.

-- Allow employees to read orders for their assigned location.
-- We use a security-definer wrapper check: the employee's location_id
-- in organization_memberships must match the order's location_id.

create policy "employees can read orders at their location"
  on public.sales_orders
  for select to authenticated
  using (
    location_id in (
      select m.location_id
      from public.organization_memberships m
      where m.user_id = auth.uid()
        and m.status = 'ACTIVE'
        and m.deleted_at is null
        and m.location_id is not null
    )
    and organization_id in (
      select m.organization_id
      from public.organization_memberships m
      where m.user_id = auth.uid()
        and m.status = 'ACTIVE'
        and m.deleted_at is null
    )
  );

-- Allow employees to read their location's order items
create policy "employees can read order items at their location"
  on public.sales_order_items
  for select to authenticated
  using (
    sales_order_id in (
      select so.id
      from public.sales_orders so
      where so.location_id in (
        select m.location_id
        from public.organization_memberships m
        where m.user_id = auth.uid()
          and m.status = 'ACTIVE'
          and m.deleted_at is null
          and m.location_id is not null
      )
    )
  );
