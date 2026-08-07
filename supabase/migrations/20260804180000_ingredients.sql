-- Tea Chain ERP: Ingredients Management

create table if not exists public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists ingredient_categories_active_name_key on public.ingredient_categories (organization_id, lower(name)) where deleted_at is null;

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 160),
  sku text not null check (sku ~ '^[A-Z0-9_-]+$'),
  category_id uuid not null references public.ingredient_categories(id) on delete restrict,
  base_unit_id uuid not null references public.units(id) on delete restrict,
  default_purchase_unit_id uuid references public.units(id) on delete restrict,
  min_stock numeric(15, 6),
  max_stock numeric(15, 6),
  standard_cost numeric(12, 4),
  is_perishable boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists ingredients_active_sku_key on public.ingredients (organization_id, sku) where deleted_at is null;

drop trigger if exists ingredient_categories_set_updated_at on public.ingredient_categories;
create trigger ingredient_categories_set_updated_at before update on public.ingredient_categories
  for each row execute function public.set_updated_at();

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();

create or replace function public.enforce_ingredient_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_unit_category text;
  purchase_unit_category text;
begin
  -- Tenant isolation: category must belong to the same organization as the ingredient
  if exists (
    select 1
    from public.ingredient_categories c
    where c.id = new.category_id
      and c.organization_id <> new.organization_id
  ) then
    raise exception 'Ingredient category must belong to the same organization as the ingredient' using errcode = '23514';
  end if;

  -- Unit category consistency: purchase unit must share the same measurement category as the base unit
  if new.default_purchase_unit_id is not null then
    select measurement_category into base_unit_category from public.units where id = new.base_unit_id;
    select measurement_category into purchase_unit_category from public.units where id = new.default_purchase_unit_id;

    if base_unit_category != purchase_unit_category then
      raise exception 'Default purchase unit must be of the same measurement category as the base unit' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ingredients_enforce_rules on public.ingredients;
create trigger ingredients_enforce_rules
  before insert or update on public.ingredients
  for each row execute function public.enforce_ingredient_rules();

alter table public.ingredient_categories enable row level security;
alter table public.ingredients enable row level security;

create policy "users with permission can view ingredient categories" on public.ingredient_categories for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage ingredient categories" on public.ingredient_categories for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can view ingredients" on public.ingredients for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage ingredients" on public.ingredients for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

grant all on public.ingredient_categories, public.ingredients to authenticated;
