-- Tea Chain ERP: Supplier Management

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 160),
  phone text check (phone ~ '^[+]?[0-9\s\-().]{7,20}$'),
  email text check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  gstin text check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
  address text,
  notes text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists suppliers_active_gstin_key
  on public.suppliers (organization_id, gstin)
  where deleted_at is null and gstin is not null;

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

create policy "users with permission can view suppliers"
  on public.suppliers for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage suppliers"
  on public.suppliers for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

grant all on public.suppliers to authenticated;
