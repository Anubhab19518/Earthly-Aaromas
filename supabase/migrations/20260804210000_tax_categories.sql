-- Tea Chain ERP: Tax Categories

create table if not exists public.tax_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists tax_categories_active_name_key
  on public.tax_categories (organization_id, name)
  where deleted_at is null;

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  tax_category_id uuid not null references public.tax_categories(id) on delete cascade,
  rate_percentage numeric(5, 2) not null check (rate_percentage >= 0 and rate_percentage <= 100),
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists tax_rates_active_effective_key
  on public.tax_rates (tax_category_id, effective_from)
  where deleted_at is null;

-- Triggers for updated_at
drop trigger if exists tax_categories_set_updated_at on public.tax_categories;
create trigger tax_categories_set_updated_at
  before update on public.tax_categories
  for each row execute function public.set_updated_at();

drop trigger if exists tax_rates_set_updated_at on public.tax_rates;
create trigger tax_rates_set_updated_at
  before update on public.tax_rates
  for each row execute function public.set_updated_at();

-- RLS for tax_categories
alter table public.tax_categories enable row level security;

create policy "users with permission can view tax categories"
  on public.tax_categories for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage tax categories"
  on public.tax_categories for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

grant all on public.tax_categories to authenticated;

-- RLS for tax_rates
alter table public.tax_rates enable row level security;

-- Need to join with tax_categories to check organization_id
create policy "users with permission can view tax rates"
  on public.tax_rates for select to authenticated
  using (
    public.has_mfa_assurance() and 
    exists (
      select 1 from public.tax_categories c
      where c.id = tax_category_id
        and public.has_permission(c.organization_id, 'master_data.manage')
    )
  );

create policy "users with permission can manage tax rates"
  on public.tax_rates for all to authenticated
  using (
    public.has_mfa_assurance() and 
    exists (
      select 1 from public.tax_categories c
      where c.id = tax_category_id
        and public.has_permission(c.organization_id, 'master_data.manage')
    )
  )
  with check (
    public.has_mfa_assurance() and 
    exists (
      select 1 from public.tax_categories c
      where c.id = tax_category_id
        and public.has_permission(c.organization_id, 'master_data.manage')
    )
  );

grant all on public.tax_rates to authenticated;
