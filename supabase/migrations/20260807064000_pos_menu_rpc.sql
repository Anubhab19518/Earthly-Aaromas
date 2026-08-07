-- Security-definer RPC to load POS menu data for employees (aal1).
-- Returns only variants that are available at the given location,
-- with branch-specific price overrides already resolved.

create or replace function public.get_pos_menu(
  p_organization_id uuid,
  p_location_id uuid
)
returns table(
  category_id uuid,
  category_name text,
  item_id uuid,
  item_name text,
  image_url text,
  tax_rate numeric,
  variant_id uuid,
  variant_name text,
  default_price numeric,
  price_override numeric,
  effective_price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mc.id as category_id,
    mc.name as category_name,
    mi.id as item_id,
    mi.name as item_name,
    mi.image_url,
    coalesce(tr.rate_percentage, 0) as tax_rate,
    mv.id as variant_id,
    mv.name as variant_name,
    mv.default_price,
    bmc.price_override,
    coalesce(bmc.price_override, mv.default_price) as effective_price
  from public.menu_variants mv
  join public.menu_items mi on mi.id = mv.menu_item_id
  join public.menu_categories mc on mc.id = mi.category_id
  left join public.tax_categories tc on tc.id = mi.tax_category_id
  left join public.tax_rates tr
    on tr.tax_category_id = tc.id
    and tr.deleted_at is null
    and tr.effective_from <= current_date
  left join public.branch_menu_configs bmc
    on bmc.variant_id = mv.id
    and bmc.location_id = p_location_id
    and bmc.organization_id = p_organization_id
  where mv.organization_id = p_organization_id
    and mv.is_active = true
    and mv.deleted_at is null
    and mi.is_active = true
    and mi.deleted_at is null
    and mc.deleted_at is null
    -- Exclude items explicitly marked unavailable at this branch
    and (bmc.id is null or bmc.is_available = true)
  order by mc.name, mi.name, mv.name;
$$;

revoke all on function public.get_pos_menu(uuid, uuid) from public, anon;
grant execute on function public.get_pos_menu(uuid, uuid) to authenticated;
