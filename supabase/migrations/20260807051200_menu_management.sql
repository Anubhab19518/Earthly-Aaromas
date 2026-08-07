-- Menu Management Module
-- Creates menu categories, items, variants, recipes, and branch configurations.

-- 1. Menu Categories
create table if not exists public.menu_categories (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    name text not null check (char_length(trim(name)) > 0),
    description text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists menu_categories_org_idx on public.menu_categories (organization_id) where deleted_at is null;

-- 2. Menu Items
create table if not exists public.menu_items (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    category_id uuid not null references public.menu_categories(id) on delete restrict,
    name text not null check (char_length(trim(name)) > 0),
    description text,
    image_url text,
    tax_category_id uuid references public.tax_categories(id) on delete set null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists menu_items_org_idx on public.menu_items (organization_id) where deleted_at is null;
create index if not exists menu_items_category_idx on public.menu_items (category_id) where deleted_at is null;

-- 3. Menu Variants
create table if not exists public.menu_variants (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    menu_item_id uuid not null references public.menu_items(id) on delete restrict,
    name text not null check (char_length(trim(name)) > 0),
    default_price numeric(12,2) not null check (default_price >= 0),
    sku text,
    serving_size text,
    prep_time_mins integer check (prep_time_mins >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists menu_variants_item_idx on public.menu_variants (menu_item_id) where deleted_at is null;

-- 4. Recipe Items (Bill of Materials)
create table if not exists public.recipe_items (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    variant_id uuid not null references public.menu_variants(id) on delete restrict,
    ingredient_id uuid not null references public.ingredients(id) on delete restrict,
    quantity_in_base_unit numeric(12,4) not null check (quantity_in_base_unit > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (variant_id, ingredient_id)
);

-- 5. Branch Menu Configurations (Availability and Price Overrides)
create table if not exists public.branch_menu_configs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    location_id uuid not null references public.locations(id) on delete restrict,
    variant_id uuid not null references public.menu_variants(id) on delete restrict,
    is_available boolean not null default true,
    price_override numeric(12,2) check (price_override >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (location_id, variant_id)
);

-- Triggers for updated_at
create trigger menu_categories_set_updated_at before update on public.menu_categories for each row execute function public.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger menu_variants_set_updated_at before update on public.menu_variants for each row execute function public.set_updated_at();
create trigger recipe_items_set_updated_at before update on public.recipe_items for each row execute function public.set_updated_at();
create trigger branch_menu_configs_set_updated_at before update on public.branch_menu_configs for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_variants enable row level security;
alter table public.recipe_items enable row level security;
alter table public.branch_menu_configs enable row level security;

-- Policies

-- menu_categories
create policy "members can read menu categories" on public.menu_categories
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "authorized members can manage menu categories" on public.menu_categories
  for all to authenticated
  using (public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_permission(organization_id, 'master_data.manage'));

-- menu_items
create policy "members can read menu items" on public.menu_items
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "authorized members can manage menu items" on public.menu_items
  for all to authenticated
  using (public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_permission(organization_id, 'master_data.manage'));

-- menu_variants
create policy "members can read menu variants" on public.menu_variants
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "authorized members can manage menu variants" on public.menu_variants
  for all to authenticated
  using (public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_permission(organization_id, 'master_data.manage'));

-- recipe_items
create policy "members can read recipe items" on public.recipe_items
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "authorized members can manage recipe items" on public.recipe_items
  for all to authenticated
  using (public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_permission(organization_id, 'master_data.manage'));

-- branch_menu_configs
create policy "members can read branch menu configs" on public.branch_menu_configs
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "authorized members can manage branch menu configs" on public.branch_menu_configs
  for all to authenticated
  using (public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_permission(organization_id, 'master_data.manage'));
