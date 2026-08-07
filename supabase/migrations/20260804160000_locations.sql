-- Tea Chain ERP: Location Management

create table if not exists public.location_types (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z_]+$'),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code)
);

insert into public.location_types (code, name, description)
values
  ('WAREHOUSE', 'Warehouse', 'Central storage location'),
  ('SHOP', 'Shop', 'Retail location'),
  ('KITCHEN', 'Kitchen', 'Preparation location'),
  ('COUNTER', 'Counter', 'Service counter'),
  ('COLD_STORAGE', 'Cold Storage', 'Refrigerated storage')
on conflict (code) do nothing;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  parent_id uuid references public.locations(id) on delete restrict,
  location_type_id uuid not null references public.location_types(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 160),
  code text not null check (code ~ '^[A-Z0-9_-]+$'),
  address text,
  phone text,
  email text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);

create index if not exists locations_organization_idx on public.locations (organization_id) where deleted_at is null;

drop trigger if exists location_types_set_updated_at on public.location_types;
create trigger location_types_set_updated_at before update on public.location_types
  for each row execute function public.set_updated_at();

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

create or replace function public.enforce_location_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  type_code text;
  parent_type_code text;
begin
  select code into type_code from public.location_types where id = new.location_type_id;

  if type_code = 'WAREHOUSE' then
    if new.parent_id is not null then
      raise exception 'Warehouse cannot have a parent location' using errcode = '23514';
    end if;
  elsif type_code = 'SHOP' then
    if new.parent_id is null then
      raise exception 'Shop must have a parent location' using errcode = '23514';
    end if;
    
    select lt.code into parent_type_code
    from public.locations p
    join public.location_types lt on lt.id = p.location_type_id
    where p.id = new.parent_id;

    if parent_type_code != 'WAREHOUSE' then
      raise exception 'Shop parent must be a Warehouse' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists locations_enforce_rules on public.locations;
create trigger locations_enforce_rules
  before insert or update on public.locations
  for each row execute function public.enforce_location_rules();

alter table public.location_types enable row level security;
alter table public.locations enable row level security;

-- location_types is a global reference table, readable by any authenticated user
create policy "authenticated users can view location types" on public.location_types for select to authenticated
  using (public.has_mfa_assurance());

-- locations are scoped by organization. 
-- Right now, only master_data.manage permission can manage AND read.
create policy "users with permission can view locations" on public.locations for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage locations" on public.locations for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

grant select on public.location_types to authenticated;
grant all on public.locations to authenticated;
