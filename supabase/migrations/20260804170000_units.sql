-- Tea Chain ERP: Unit Management

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  symbol text not null check (char_length(trim(symbol)) between 1 and 20),
  measurement_category text not null check (measurement_category in ('WEIGHT', 'VOLUME', 'COUNT', 'COOKING')),
  is_base_unit boolean not null default false,
  base_unit_id uuid references public.units(id) on delete restrict,
  conversion_factor numeric(15, 6),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists units_active_name_key on public.units (lower(name)) where deleted_at is null;
create unique index if not exists units_active_symbol_key on public.units (symbol) where deleted_at is null;

drop trigger if exists units_set_updated_at on public.units;
create trigger units_set_updated_at before update on public.units
  for each row execute function public.set_updated_at();

create or replace function public.enforce_unit_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_category text;
begin
  if new.is_base_unit then
    if new.base_unit_id is not null or new.conversion_factor is not null then
      raise exception 'Base unit cannot have a base_unit_id or conversion_factor' using errcode = '23514';
    end if;
  else
    if new.base_unit_id is null or new.conversion_factor is null then
      raise exception 'Non-base unit must have a base_unit_id and conversion_factor' using errcode = '23514';
    end if;
    
    if new.conversion_factor <= 0 then
      raise exception 'Conversion factor must be positive' using errcode = '23514';
    end if;

    select measurement_category into parent_category from public.units where id = new.base_unit_id;
    if parent_category != new.measurement_category then
      raise exception 'Base unit must be of the same measurement category' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists units_enforce_rules on public.units;
create trigger units_enforce_rules
  before insert or update on public.units
  for each row execute function public.enforce_unit_rules();

create or replace function public.has_global_permission(required_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    join public.membership_roles membership_role on membership_role.membership_id = membership.id
    join public.role_permissions role_permission on role_permission.role_id = membership_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where membership.user_id = auth.uid()
      and membership.status = 'ACTIVE'
      and membership.deleted_at is null
      and permission.code = required_permission_code
  );
$$;

alter table public.units enable row level security;

create policy "users with permission can view units" on public.units for select to authenticated
  using (public.has_mfa_assurance() and public.has_global_permission('master_data.manage'));

create policy "users with permission can manage units" on public.units for all to authenticated
  using (public.has_mfa_assurance() and public.has_global_permission('master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_global_permission('master_data.manage'));

grant all on public.units to authenticated;
