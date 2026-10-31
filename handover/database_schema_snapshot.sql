-- ========================================================
-- TEA CHAIN ERP: BASELINE SCHEMA SNAPSHOT FOR CLEAN SETUP
-- Generated: 2026-10-31
-- Contains complete ordered migrations 01 to 32
-- ========================================================


-- ========================================================
-- MIGRATION: 20260804140000_identity_and_rbac.sql
-- ========================================================

-- Tea Chain ERP: identity, organizations, and data-driven authorization.
-- This migration only creates `tea_erp` objects; it does not alter existing user tables.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  legal_name text,
  currency_code char(3) not null default 'INR' check (currency_code = upper(currency_code)),
  timezone text not null default 'Asia/Kolkata',
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists organizations_active_name_key
  on public.organizations (lower(name)) where deleted_at is null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INVITED', 'SUSPENDED')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_user_active_idx
  on public.organization_memberships (user_id, organization_id)
  where deleted_at is null and status = 'ACTIVE';

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code ~ '^[A-Z][A-Z0-9_]{1,62}$'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_.]{2,126}$'),
  name text not null,
  module text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.membership_roles (
  membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id uuid,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists audit_log_organization_occurred_idx
  on public.audit_log (organization_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists organization_memberships_set_updated_at on public.organization_memberships;
create trigger organization_memberships_set_updated_at before update on public.organization_memberships
  for each row execute function public.set_updated_at();
drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.permissions (code, name, module, description)
values
  ('organization.manage', 'Manage organization', 'organization', 'Manage organization settings.'),
  ('members.manage', 'Manage members', 'organization', 'Invite, suspend, and assign member roles.'),
  ('orders.create', 'Create orders', 'orders', 'Create customer orders at permitted locations.'),
  ('orders.read', 'Read orders', 'orders', 'Read customer orders at permitted locations.'),
  ('payments.create', 'Record payments', 'payments', 'Record payments for customer orders.'),
  ('bills.generate', 'Generate bills', 'billing', 'Generate bills for finalized customer orders.'),
  ('inventory.read', 'Read inventory', 'inventory', 'Read inventory balances and transaction history.'),
  ('inventory.manage', 'Manage inventory', 'inventory', 'Post inventory operational documents.'),
  ('master_data.manage', 'Manage master data', 'master_data', 'Maintain ingredients, locations, units, suppliers, and taxes.'),
  ('reports.read', 'Read reports', 'reports', 'Read owner reporting views.')
on conflict (code) do update set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description;

create or replace function public.seed_organization_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_role_id uuid;
  employee_role_id uuid;
begin
  insert into public.roles (organization_id, code, name, description, is_system)
  values
    (new.id, 'OWNER', 'Owner', 'Full operational access.', true),
    (new.id, 'EMPLOYEE', 'Employee', 'Create orders, record payments, and generate bills.', true)
  on conflict (organization_id, code) do nothing;

  select id into owner_role_id from public.roles where organization_id = new.id and code = 'OWNER';
  select id into employee_role_id from public.roles where organization_id = new.id and code = 'EMPLOYEE';

  insert into public.role_permissions (role_id, permission_id)
  select owner_role_id, id from public.permissions
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select employee_role_id, id
  from public.permissions
  where code in ('orders.create', 'orders.read', 'payments.create', 'bills.generate')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists organizations_seed_roles on public.organizations;
create trigger organizations_seed_roles
  after insert on public.organizations
  for each row execute function public.seed_organization_roles();

create or replace function public.is_active_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'ACTIVE'
      and membership.deleted_at is null
  );
$$;

create or replace function public.has_permission(target_organization_id uuid, required_permission_code text)
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
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'ACTIVE'
      and membership.deleted_at is null
      and permission.code = required_permission_code
  );
$$;

create or replace function public.bootstrap_organization(
  organization_name text,
  organization_legal_name text default null,
  organization_gstin text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  new_membership_id uuid;
  owner_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  if char_length(trim(organization_name)) < 2 then
    raise exception 'Organization name must contain at least two characters' using errcode = '22023';
  end if;

  insert into public.organizations (name, legal_name, gstin)
  values (trim(organization_name), nullif(trim(organization_legal_name), ''), nullif(trim(organization_gstin), ''))
  returning id into new_organization_id;

  insert into public.organization_memberships (organization_id, user_id, status, joined_at)
  values (new_organization_id, auth.uid(), 'ACTIVE', now())
  returning id into new_membership_id;

  select id into owner_role_id
  from public.roles
  where organization_id = new_organization_id and code = 'OWNER';

  insert into public.membership_roles (membership_id, role_id)
  values (new_membership_id, owner_role_id);

  return new_organization_id;
end;
$$;

revoke all on function public.bootstrap_organization(text, text, text) from public;
grant execute on function public.bootstrap_organization(text, text, text) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_log enable row level security;

create policy "members can view their organizations" on public.organizations for select to authenticated
  using (public.is_active_member(id));
create policy "users can view their profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "users can update their profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "members can view organization memberships" on public.organization_memberships for select to authenticated
  using (public.is_active_member(organization_id));
create policy "owners can manage organization memberships" on public.organization_memberships for all to authenticated
  using (public.has_permission(organization_id, 'members.manage'))
  with check (public.has_permission(organization_id, 'members.manage'));
create policy "members can view roles" on public.roles for select to authenticated
  using (public.is_active_member(organization_id));
create policy "owners can manage roles" on public.roles for all to authenticated
  using (public.has_permission(organization_id, 'members.manage'))
  with check (public.has_permission(organization_id, 'members.manage'));
create policy "authenticated users can view permissions" on public.permissions for select to authenticated
  using (true);
create policy "members can view role permissions" on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles role where role.id = role_id and public.is_active_member(role.organization_id)));
create policy "owners can manage role permissions" on public.role_permissions for all to authenticated
  using (exists (select 1 from public.roles role where role.id = role_id and public.has_permission(role.organization_id, 'members.manage')))
  with check (exists (select 1 from public.roles role where role.id = role_id and public.has_permission(role.organization_id, 'members.manage')));
create policy "members can view membership roles" on public.membership_roles for select to authenticated
  using (exists (select 1 from public.organization_memberships membership where membership.id = membership_id and public.is_active_member(membership.organization_id)));
create policy "owners can manage membership roles" on public.membership_roles for all to authenticated
  using (exists (select 1 from public.organization_memberships membership where membership.id = membership_id and public.has_permission(membership.organization_id, 'members.manage')))
  with check (exists (select 1 from public.organization_memberships membership where membership.id = membership_id and public.has_permission(membership.organization_id, 'members.manage')));
create policy "owners can view organization audit logs" on public.audit_log for select to authenticated
  using (organization_id is not null and public.has_permission(organization_id, 'organization.manage'));

revoke all on public.audit_log from anon, authenticated;
grant select on public.organizations, public.profiles, public.organization_memberships,
  public.roles, public.permissions, public.role_permissions, public.membership_roles to authenticated;


-- ========================================================
-- MIGRATION: 20260804153000_enforce_totp_and_single_owner.sql
-- ========================================================

-- Requires the identity and RBAC migration to have been applied first.

create or replace function public.has_mfa_assurance()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.enforce_single_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_organization_id uuid;
begin
  if tg_op = 'INSERT' then
    select role.organization_id into owner_organization_id
    from public.roles role where role.id = new.role_id and role.code = 'OWNER';

    if owner_organization_id is not null and exists (
      select 1
      from public.membership_roles existing_membership_role
      join public.organization_memberships existing_membership on existing_membership.id = existing_membership_role.membership_id
      join public.roles existing_role on existing_role.id = existing_membership_role.role_id
      where existing_role.organization_id = owner_organization_id
        and existing_role.code = 'OWNER'
        and existing_membership.status = 'ACTIVE'
        and existing_membership.deleted_at is null
    ) then
      raise exception 'An organization can have only one active owner' using errcode = '23505';
    end if;
    return new;
  end if;

  select role.organization_id into owner_organization_id
  from public.roles role where role.id = old.role_id and role.code = 'OWNER';

  if owner_organization_id is not null and not exists (
    select 1
    from public.membership_roles remaining_membership_role
    join public.organization_memberships remaining_membership on remaining_membership.id = remaining_membership_role.membership_id
    join public.roles remaining_role on remaining_role.id = remaining_membership_role.role_id
    where remaining_role.organization_id = owner_organization_id
      and remaining_role.code = 'OWNER'
      and remaining_membership.status = 'ACTIVE'
      and remaining_membership.deleted_at is null
      and remaining_membership_role.membership_id <> old.membership_id
  ) then
    raise exception 'Transfer ownership before removing the current owner' using errcode = '23514';
  end if;
  return old;
end;
$$;

drop trigger if exists membership_roles_single_owner_guard on public.membership_roles;
create trigger membership_roles_single_owner_guard
  before insert or delete on public.membership_roles
  for each row execute function public.enforce_single_owner_membership();

create or replace function public.assign_employee_by_email(target_organization_id uuid, employee_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_user_id uuid;
  employee_membership_id uuid;
  employee_role_id uuid;
begin
  if not public.has_mfa_assurance() or not public.has_permission(target_organization_id, 'members.manage') then
    raise exception 'Not authorized to manage members' using errcode = '42501';
  end if;

  select id into employee_user_id
  from auth.users
  where lower(email) = lower(trim(employee_email)) and email_confirmed_at is not null;

  if employee_user_id is null then
    raise exception 'No confirmed user exists for this email address' using errcode = 'P0001';
  end if;

  insert into public.profiles (id) values (employee_user_id) on conflict (id) do nothing;
  select id into employee_role_id from public.roles
    where organization_id = target_organization_id and code = 'EMPLOYEE' and deleted_at is null;

  insert into public.organization_memberships (organization_id, user_id, status, joined_at)
  values (target_organization_id, employee_user_id, 'ACTIVE', now())
  on conflict (organization_id, user_id) do update
    set status = 'ACTIVE', joined_at = coalesce(public.organization_memberships.joined_at, now()), deleted_at = null
  returning id into employee_membership_id;

  insert into public.membership_roles (membership_id, role_id)
  values (employee_membership_id, employee_role_id)
  on conflict do nothing;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, new_data)
  values (target_organization_id, auth.uid(), 'employee.assigned', 'organization_membership', employee_membership_id,
    jsonb_build_object('user_id', employee_user_id));
  return employee_membership_id;
end;
$$;

revoke all on function public.assign_employee_by_email(uuid, text) from public;
grant execute on function public.assign_employee_by_email(uuid, text) to authenticated;

create or replace function public.bootstrap_organization(
  organization_name text,
  organization_legal_name text default null,
  organization_gstin text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  new_membership_id uuid;
  owner_role_id uuid;
begin
  if auth.uid() is null or not public.has_mfa_assurance() then
    raise exception 'A verified authenticator is required' using errcode = '28000';
  end if;
  if char_length(trim(organization_name)) < 2 then
    raise exception 'Organization name must contain at least two characters' using errcode = '22023';
  end if;
  insert into public.organizations (name, legal_name, gstin)
  values (trim(organization_name), nullif(trim(organization_legal_name), ''), nullif(trim(organization_gstin), ''))
  returning id into new_organization_id;
  insert into public.organization_memberships (organization_id, user_id, status, joined_at)
  values (new_organization_id, auth.uid(), 'ACTIVE', now()) returning id into new_membership_id;
  select id into owner_role_id from public.roles where organization_id = new_organization_id and code = 'OWNER';
  insert into public.membership_roles (membership_id, role_id) values (new_membership_id, owner_role_id);
  return new_organization_id;
end;
$$;

alter policy "members can view their organizations" on public.organizations using (public.has_mfa_assurance() and public.is_active_member(id));
alter policy "users can view their profile" on public.profiles using (public.has_mfa_assurance() and id = auth.uid());
alter policy "users can update their profile" on public.profiles using (public.has_mfa_assurance() and id = auth.uid()) with check (public.has_mfa_assurance() and id = auth.uid());
alter policy "members can view organization memberships" on public.organization_memberships using (public.has_mfa_assurance() and public.is_active_member(organization_id));
alter policy "owners can manage organization memberships" on public.organization_memberships using (public.has_mfa_assurance() and public.has_permission(organization_id, 'members.manage')) with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'members.manage'));
alter policy "members can view roles" on public.roles using (public.has_mfa_assurance() and public.is_active_member(organization_id));
alter policy "owners can manage roles" on public.roles using (public.has_mfa_assurance() and public.has_permission(organization_id, 'members.manage')) with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'members.manage'));
alter policy "authenticated users can view permissions" on public.permissions using (public.has_mfa_assurance());


-- ========================================================
-- MIGRATION: 20260804160000_locations.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260804170000_units.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260804180000_ingredients.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260804190000_ingredient_unit_conversions.sql
-- ========================================================

-- Tea Chain ERP: Ingredient Unit Conversions

create table if not exists public.ingredient_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  from_unit_id uuid not null references public.units(id) on delete restrict,
  to_unit_id uuid not null references public.units(id) on delete restrict,
  conversion_factor numeric(15, 6) not null check (conversion_factor > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint from_and_to_units_differ check (from_unit_id <> to_unit_id)
);

-- No duplicate active conversion for the same (ingredient, from_unit) pair
create unique index if not exists ingredient_unit_conversions_active_key
  on public.ingredient_unit_conversions (ingredient_id, from_unit_id)
  where deleted_at is null;

drop trigger if exists ingredient_unit_conversions_set_updated_at on public.ingredient_unit_conversions;
create trigger ingredient_unit_conversions_set_updated_at
  before update on public.ingredient_unit_conversions
  for each row execute function public.set_updated_at();

create or replace function public.enforce_ingredient_conversion_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ingredient_base_unit_id uuid;
  ingredient_org_id uuid;
begin
  -- Fetch ingredient details once
  select base_unit_id, organization_id
    into ingredient_base_unit_id, ingredient_org_id
    from public.ingredients
   where id = new.ingredient_id;

  -- Rule 1: Tenant isolation — conversion must belong to the same org as the ingredient
  if new.organization_id <> ingredient_org_id then
    raise exception 'Conversion must belong to the same organization as the ingredient'
      using errcode = '23514';
  end if;

  -- Rule 2: to_unit_id must equal the ingredient's base unit (always convert TO base)
  if new.to_unit_id <> ingredient_base_unit_id then
    raise exception 'to_unit_id must equal the ingredient''s base unit (id: %)', ingredient_base_unit_id
      using errcode = '23514';
  end if;


  return new;
end;
$$;

drop trigger if exists ingredient_unit_conversions_enforce_rules on public.ingredient_unit_conversions;
create trigger ingredient_unit_conversions_enforce_rules
  before insert or update on public.ingredient_unit_conversions
  for each row execute function public.enforce_ingredient_conversion_rules();

alter table public.ingredient_unit_conversions enable row level security;

create policy "users with permission can view ingredient unit conversions"
  on public.ingredient_unit_conversions for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage ingredient unit conversions"
  on public.ingredient_unit_conversions for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

grant all on public.ingredient_unit_conversions to authenticated;


-- ========================================================
-- MIGRATION: 20260804200000_suppliers.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260804210000_tax_categories.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260804220000_inventory_alert_policies.sql
-- ========================================================

-- Tea Chain ERP: Inventory Alert Policies

create table if not exists public.inventory_alert_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  warning_level numeric(15, 6) not null,
  critical_level numeric(15, 6) not null,
  out_of_stock_level numeric(15, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint alert_levels_check check (warning_level > critical_level and critical_level >= out_of_stock_level)
);

create unique index if not exists inventory_alert_policies_active_key
  on public.inventory_alert_policies (location_id, ingredient_id)
  where deleted_at is null;

drop trigger if exists inventory_alert_policies_set_updated_at on public.inventory_alert_policies;
create trigger inventory_alert_policies_set_updated_at
  before update on public.inventory_alert_policies
  for each row execute function public.set_updated_at();

create or replace function public.enforce_alert_policy_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  loc_org_id uuid;
  ing_org_id uuid;
begin
  select organization_id into loc_org_id from public.locations where id = new.location_id;
  select organization_id into ing_org_id from public.ingredients where id = new.ingredient_id;

  if new.organization_id <> loc_org_id then
    raise exception 'Location belongs to a different organization' using errcode = '23514';
  end if;

  if new.organization_id <> ing_org_id then
    raise exception 'Ingredient belongs to a different organization' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_alert_policies_enforce_tenant on public.inventory_alert_policies;
create trigger inventory_alert_policies_enforce_tenant
  before insert or update on public.inventory_alert_policies
  for each row execute function public.enforce_alert_policy_tenant();

alter table public.inventory_alert_policies enable row level security;

create policy "users with permission can view inventory alert policies"
  on public.inventory_alert_policies for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage inventory alert policies"
  on public.inventory_alert_policies for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

grant all on public.inventory_alert_policies to authenticated;


-- ========================================================
-- MIGRATION: 20260804230000_inventory_engine.sql
-- ========================================================

-- Tea Chain ERP: Inventory Engine (Phase 1)
-- Regenerated from scratch.

-- ============================================================
-- 1. INVENTORY LEDGER (Immutable Source of Truth)
-- ============================================================

create table if not exists public.inventory_ledger (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete restrict,
  location_id     uuid        not null references public.locations(id)     on delete restrict,
  ingredient_id   uuid        not null references public.ingredients(id)   on delete restrict,
  transaction_type text       not null check (transaction_type in (
                                  'GOODS_RECEIPT',
                                  'TRANSFER_IN',
                                  'TRANSFER_OUT',
                                  'SALE',
                                  'RECIPE_CONSUMPTION',
                                  'STOCK_ADJUSTMENT',
                                  'WASTAGE',
                                  'RETURN'
                                )),
  reference_type  text,
  reference_id    text,
  quantity_change numeric(15, 6) not null,
  unit_id         uuid        not null references public.units(id) on delete restrict,
  running_cost    numeric(12, 4),
  remarks         text,
  performed_by    uuid        not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now()
);

create index if not exists inventory_ledger_org_loc_ing_idx
  on public.inventory_ledger (organization_id, location_id, ingredient_id);

create index if not exists inventory_ledger_created_at_idx
  on public.inventory_ledger (created_at desc);

-- ============================================================
-- Immutable Ledger Triggers (block UPDATE and DELETE)
-- ============================================================

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Inventory ledger entries are immutable and cannot be updated or deleted.'
    using errcode = '27000';
end;
$$;

drop trigger if exists inventory_ledger_prevent_update on public.inventory_ledger;
create trigger inventory_ledger_prevent_update
  before update on public.inventory_ledger
  for each row execute function public.prevent_ledger_mutation();

drop trigger if exists inventory_ledger_prevent_delete on public.inventory_ledger;
create trigger inventory_ledger_prevent_delete
  before delete on public.inventory_ledger
  for each row execute function public.prevent_ledger_mutation();

-- ============================================================
-- 2. INVENTORY SNAPSHOT (Cache / Materialized current stock)
-- ============================================================

create table if not exists public.inventory_snapshot (
  id              uuid           primary key default gen_random_uuid(),
  organization_id uuid           not null references public.organizations(id) on delete restrict,
  location_id     uuid           not null references public.locations(id)     on delete restrict,
  ingredient_id   uuid           not null references public.ingredients(id)   on delete restrict,
  quantity_on_hand numeric(15, 6) not null default 0,
  average_cost     numeric(12, 4),
  last_movement_at timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

create unique index if not exists inventory_snapshot_unique_key
  on public.inventory_snapshot (location_id, ingredient_id);

drop trigger if exists inventory_snapshot_set_updated_at on public.inventory_snapshot;
create trigger inventory_snapshot_set_updated_at
  before update on public.inventory_snapshot
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. INVENTORY POSTING SERVICE RPC
-- ============================================================
-- This is the ONLY authorised entry point for writing inventory movements.
-- Future modules (GRN, Transfers, Sales, Recipes, Wastage) MUST call this function.
-- `performed_by` is resolved from auth.uid() — it is NOT a parameter.
-- ============================================================

create or replace function public.post_inventory_movement(
  p_organization_id  uuid,
  p_location_id      uuid,
  p_ingredient_id    uuid,
  p_transaction_type text,
  p_reference_type   text,
  p_reference_id     text,
  p_quantity_change  numeric,
  p_unit_id          uuid,
  p_running_cost     numeric,
  p_remarks          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id       uuid;
  v_base_unit_id    uuid;
  v_loc_org_id      uuid;
  v_actor_id        uuid;
begin
  -- Resolve the authenticated user
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Validate: location belongs to the given organization
  select organization_id into v_loc_org_id
    from public.locations
    where id = p_location_id
      and deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> p_organization_id then
    raise exception 'Location not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: ingredient belongs to the given organization, fetch base unit
  select base_unit_id into v_base_unit_id
    from public.ingredients
    where id = p_ingredient_id
      and organization_id = p_organization_id
      and deleted_at is null;

  if v_base_unit_id is null then
    raise exception 'Ingredient not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: unit_id must match ingredient base unit
  if v_base_unit_id <> p_unit_id then
    raise exception 'Inventory must be posted in the ingredient''s base unit.' using errcode = '23514';
  end if;

  -- Insert into immutable Ledger
  insert into public.inventory_ledger (
    organization_id,
    location_id,
    ingredient_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    unit_id,
    running_cost,
    remarks,
    performed_by,
    created_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_quantity_change,
    p_unit_id,
    p_running_cost,
    p_remarks,
    v_actor_id,
    now()
  )
  returning id into v_ledger_id;

  -- Atomically upsert Snapshot
  insert into public.inventory_snapshot (
    organization_id,
    location_id,
    ingredient_id,
    quantity_on_hand,
    last_movement_at,
    updated_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_quantity_change,
    now(),
    now()
  )
  on conflict (location_id, ingredient_id) do update set
    quantity_on_hand  = public.inventory_snapshot.quantity_on_hand + excluded.quantity_on_hand,
    last_movement_at  = excluded.last_movement_at,
    updated_at        = excluded.updated_at;

  -- Audit log
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks
    )
  );

  return v_ledger_id;
end;
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.inventory_ledger   enable row level security;
alter table public.inventory_snapshot enable row level security;

-- Ledger: select only — writes go exclusively through the security-definer RPC
create policy "users with permission can view inventory ledger"
  on public.inventory_ledger for select to authenticated
  using (
    public.has_mfa_assurance()
    and public.has_permission(organization_id, 'master_data.manage')
  );

-- Snapshot: read-only for the dashboard
create policy "users with permission can view inventory snapshot"
  on public.inventory_snapshot for select to authenticated
  using (
    public.has_mfa_assurance()
    and public.has_permission(organization_id, 'master_data.manage')
  );

-- Grant read access; writes happen only through the RPC (security definer)
grant select on public.inventory_ledger   to authenticated;
grant select on public.inventory_snapshot to authenticated;


-- ========================================================
-- MIGRATION: 20260804240000_goods_receipts.sql
-- ========================================================

-- Tea Chain ERP: Goods Receipt (GRN) Module

-- ============================================================
-- 0. PER-ORGANIZATION SEQUENCE TABLE
-- Used for generating unique, gapless, concurrent-safe document numbers.
-- Pattern: UPDATE ... RETURNING takes a row lock, serializing concurrent inserts.
-- ============================================================

create table if not exists public.organization_sequences (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sequence_name   text not null,
  last_value      bigint not null default 0,
  primary key (organization_id, sequence_name)
);

-- Only owners/internal functions should manipulate sequences
alter table public.organization_sequences enable row level security;

create policy "service role can manage sequences"
  on public.organization_sequences for all
  to service_role using (true);

grant all on public.organization_sequences to service_role;

-- Helper function: safely increment and return next sequence value
create or replace function public.next_sequence_value(
  p_organization_id uuid,
  p_sequence_name   text
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  -- INSERT the sequence row if it doesn't exist yet, then increment atomically.
  insert into public.organization_sequences (organization_id, sequence_name, last_value)
    values (p_organization_id, p_sequence_name, 1)
    on conflict (organization_id, sequence_name) do update
      set last_value = public.organization_sequences.last_value + 1
    returning last_value into v_next;

  return v_next;
end;
$$;

-- ============================================================
-- 1. GOODS RECEIPTS (Header)
-- ============================================================

create table if not exists public.goods_receipts (
  id                    uuid        primary key default gen_random_uuid(),
  organization_id       uuid        not null references public.organizations(id) on delete restrict,
  grn_number            text        not null,
  supplier_id           uuid        not null references public.suppliers(id) on delete restrict,
  warehouse_location_id uuid        not null references public.locations(id) on delete restrict,
  invoice_number        text,
  invoice_date          date,
  received_date         date        not null,
  remarks               text,
  status                text        not null default 'DRAFT'
                                    check (status in ('DRAFT', 'POSTED', 'CANCELLED')),
  created_by            uuid        not null references public.profiles(id) on delete restrict,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- GRN number is unique per organization
create unique index if not exists goods_receipts_grn_number_key
  on public.goods_receipts (organization_id, grn_number)
  where deleted_at is null;

drop trigger if exists goods_receipts_set_updated_at on public.goods_receipts;
create trigger goods_receipts_set_updated_at
  before update on public.goods_receipts
  for each row execute function public.set_updated_at();

-- Validate warehouse location belongs to same org and is WAREHOUSE type
create or replace function public.enforce_grn_header_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc_org_id  uuid;
  v_loc_type    text;
begin
  -- Check location ownership
  select l.organization_id, lt.code
    into v_loc_org_id, v_loc_type
    from public.locations l
    join public.location_types lt on lt.id = l.location_type_id
    where l.id = new.warehouse_location_id
      and l.deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> new.organization_id then
    raise exception 'Warehouse location does not belong to this organization.' using errcode = '23514';
  end if;

  if v_loc_type <> 'WAREHOUSE' then
    raise exception 'Goods receipts can only be received into a WAREHOUSE location.' using errcode = '23514';
  end if;

  -- Block mutations once POSTED
  if TG_OP = 'UPDATE' and old.status = 'POSTED' then
    raise exception 'A posted GRN is immutable and cannot be modified.' using errcode = '27000';
  end if;

  return new;
end;
$$;

drop trigger if exists goods_receipts_enforce_rules on public.goods_receipts;
create trigger goods_receipts_enforce_rules
  before insert or update on public.goods_receipts
  for each row execute function public.enforce_grn_header_rules();

-- ============================================================
-- 2. GOODS RECEIPT ITEMS (Lines)
-- ============================================================

create table if not exists public.goods_receipt_items (
  id                     uuid           primary key default gen_random_uuid(),
  goods_receipt_id       uuid           not null references public.goods_receipts(id) on delete restrict,
  ingredient_id          uuid           not null references public.ingredients(id) on delete restrict,
  purchase_unit_id       uuid           not null references public.units(id) on delete restrict,
  received_quantity      numeric(15, 6) not null check (received_quantity > 0),
  converted_base_quantity numeric(15, 6) not null,
  unit_cost              numeric(12, 4) not null check (unit_cost >= 0),
  tax_category_id        uuid           references public.tax_categories(id) on delete restrict,
  line_total             numeric(14, 4) not null,
  created_at             timestamptz    not null default now(),
  updated_at             timestamptz    not null default now()
);

drop trigger if exists goods_receipt_items_set_updated_at on public.goods_receipt_items;
create trigger goods_receipt_items_set_updated_at
  before update on public.goods_receipt_items
  for each row execute function public.set_updated_at();

-- Block mutations on items once parent GRN is POSTED
create or replace function public.enforce_grn_item_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grn_status text;
begin
  select status into v_grn_status
    from public.goods_receipts
    where id = coalesce(new.goods_receipt_id, old.goods_receipt_id);

  if v_grn_status = 'POSTED' then
    raise exception 'Items on a posted GRN are immutable and cannot be modified or deleted.' using errcode = '27000';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists goods_receipt_items_enforce_rules on public.goods_receipt_items;
create trigger goods_receipt_items_enforce_rules
  before insert or update or delete on public.goods_receipt_items
  for each row execute function public.enforce_grn_item_rules();

-- ============================================================
-- 3. POST GOODS RECEIPT RPC
-- Atomically posts all GRN lines to the Inventory Posting Service.
-- ============================================================

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

  -- Audit
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
    values (v_grn.organization_id, v_actor_id, 'GRN_POSTED', 'goods_receipts', p_grn_id);
end;
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.goods_receipts       enable row level security;
alter table public.goods_receipt_items  enable row level security;

create policy "users with permission can view goods receipts"
  on public.goods_receipts for select to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can manage goods receipts"
  on public.goods_receipts for all to authenticated
  using (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'))
  with check (public.has_mfa_assurance() and public.has_permission(organization_id, 'master_data.manage'));

create policy "users with permission can view grn items"
  on public.goods_receipt_items for select to authenticated
  using (
    public.has_mfa_assurance() and
    exists (
      select 1 from public.goods_receipts gr
       where gr.id = goods_receipt_id
         and public.has_permission(gr.organization_id, 'master_data.manage')
    )
  );

create policy "users with permission can manage grn items"
  on public.goods_receipt_items for all to authenticated
  using (
    public.has_mfa_assurance() and
    exists (
      select 1 from public.goods_receipts gr
       where gr.id = goods_receipt_id
         and public.has_permission(gr.organization_id, 'master_data.manage')
    )
  )
  with check (
    public.has_mfa_assurance() and
    exists (
      select 1 from public.goods_receipts gr
       where gr.id = goods_receipt_id
         and public.has_permission(gr.organization_id, 'master_data.manage')
    )
  );

grant all on public.goods_receipts      to authenticated;
grant all on public.goods_receipt_items to authenticated;


-- ========================================================
-- MIGRATION: 20260805000000_employee_invitations.sql
-- ========================================================

-- Tea Chain ERP: Employee Invitations

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role_id uuid not null references public.roles(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict, -- Optional branch assignment
  invited_by uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Unique index to prevent multiple active invitations for the same email in the same organization
create unique index if not exists organization_invitations_active_email_idx 
  on public.organization_invitations(organization_id, lower(email)) 
  where deleted_at is null and accepted_at is null and expires_at > now();

drop trigger if exists organization_invitations_set_updated_at on public.organization_invitations;
create trigger organization_invitations_set_updated_at
  before update on public.organization_invitations
  for each row execute function public.set_updated_at();

alter table public.organization_invitations enable row level security;

-- Only owners can view/manage invitations for their organization
create policy "owners can manage organization invitations" 
  on public.organization_invitations for all to authenticated
  using (public.has_permission(organization_id, 'members.manage'))
  with check (public.has_permission(organization_id, 'members.manage'));

-- Unauthenticated users cannot read this table directly via PostgREST. 
-- The validation RPC runs securely with 'security definer' privileges.

create or replace function public.validate_invitation_token(p_token_hash text)
returns table (
  invitation_id uuid,
  organization_id uuid,
  organization_name text,
  email text,
  role_id uuid,
  role_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    i.id as invitation_id,
    o.id as organization_id,
    o.name as organization_name,
    i.email,
    r.id as role_id,
    r.name as role_name
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  join public.roles r on r.id = i.role_id
  where i.token_hash = p_token_hash
    and i.accepted_at is null
    and i.deleted_at is null
    and i.expires_at > now();
end;
$$;


-- ========================================================
-- MIGRATION: 20260805040611_inventory_validation.sql
-- ========================================================

-- Atomic validation for inventory movements

create or replace function public.post_inventory_movement(
  p_organization_id  uuid,
  p_location_id      uuid,
  p_ingredient_id    uuid,
  p_transaction_type text,
  p_reference_type   text,
  p_reference_id     text,
  p_quantity_change  numeric,
  p_unit_id          uuid,
  p_running_cost     numeric,
  p_remarks          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id       uuid;
  v_base_unit_id    uuid;
  v_loc_org_id      uuid;
  v_actor_id        uuid;
  v_current_stock   numeric;
begin
  -- Resolve the authenticated user
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Validate: location belongs to the given organization
  select organization_id into v_loc_org_id
    from public.locations
    where id = p_location_id
      and deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> p_organization_id then
    raise exception 'Location not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: ingredient belongs to the given organization, fetch base unit
  select base_unit_id into v_base_unit_id
    from public.ingredients
    where id = p_ingredient_id
      and organization_id = p_organization_id
      and deleted_at is null;

  if v_base_unit_id is null then
    raise exception 'Ingredient not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: unit_id must match ingredient base unit
  if v_base_unit_id <> p_unit_id then
    raise exception 'Inventory must be posted in the ingredient''s base unit.' using errcode = '23514';
  end if;

  -- Atomically lock the snapshot row to validate negative stock
  select quantity_on_hand into v_current_stock
    from public.inventory_snapshot
    where location_id = p_location_id and ingredient_id = p_ingredient_id
    for update;
    
  if not found then
    v_current_stock := 0;
  end if;

  if p_quantity_change < 0 and (v_current_stock + p_quantity_change) < 0 then
    raise exception 'Insufficient inventory. Current stock: %, Attempted deduction: %', v_current_stock, abs(p_quantity_change) using errcode = '23514';
  end if;

  -- Insert into immutable Ledger
  insert into public.inventory_ledger (
    organization_id,
    location_id,
    ingredient_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    unit_id,
    running_cost,
    remarks,
    performed_by,
    created_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_quantity_change,
    p_unit_id,
    p_running_cost,
    p_remarks,
    v_actor_id,
    now()
  )
  returning id into v_ledger_id;

  -- Atomically upsert Snapshot
  insert into public.inventory_snapshot (
    organization_id,
    location_id,
    ingredient_id,
    quantity_on_hand,
    last_movement_at,
    updated_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_quantity_change,
    now(),
    now()
  )
  on conflict (location_id, ingredient_id) do update set
    quantity_on_hand  = public.inventory_snapshot.quantity_on_hand + excluded.quantity_on_hand,
    last_movement_at  = excluded.last_movement_at,
    updated_at        = excluded.updated_at;

  -- Audit log
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks
    )
  );

  return v_ledger_id;
end;
$$;


-- ========================================================
-- MIGRATION: 20260805175804_purchase_orders.sql
-- ========================================================

-- Purchase Orders
CREATE TYPE purchase_order_status AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED');

CREATE TABLE purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    status purchase_order_status NOT NULL DEFAULT 'DRAFT',
    po_number text NOT NULL,
    expected_delivery_date date,
    total_expected_cost numeric(12,2) NOT NULL DEFAULT 0,
    notes text,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, po_number)
);

CREATE TABLE purchase_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity numeric(10,3) NOT NULL CHECK (quantity > 0),
    unit_id uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    converted_base_quantity numeric(10,3) NOT NULL,
    expected_cost numeric(12,2) NOT NULL DEFAULT 0,
    tax_category_id uuid REFERENCES tax_categories(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Update Goods Receipts to link to PO
ALTER TABLE goods_receipts ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for purchase_orders
CREATE POLICY "Users can view purchase_orders in their organization" ON purchase_orders
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users with inventory.manage can insert purchase_orders" ON purchase_orders
    FOR INSERT WITH CHECK (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can update purchase_orders" ON purchase_orders
    FOR UPDATE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can delete purchase_orders" ON purchase_orders
    FOR DELETE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

-- Policies for purchase_order_items (Inherits access from PO via organization_id check, but we need to join or just simplify)
-- To simplify, we can add organization_id to items or just join in policy. Joining in policy:
CREATE POLICY "Users can view purchase_order_items in their organization" ON purchase_order_items
    FOR SELECT USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE organization_id IN (
                SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
            )
        )
    );

CREATE POLICY "Users can insert purchase_order_items" ON purchase_order_items
    FOR INSERT WITH CHECK (
        po_id IN (
            SELECT id FROM purchase_orders WHERE public.has_permission(purchase_orders.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can update purchase_order_items" ON purchase_order_items
    FOR UPDATE USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE public.has_permission(purchase_orders.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can delete purchase_order_items" ON purchase_order_items
    FOR DELETE USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE public.has_permission(purchase_orders.organization_id, 'inventory.manage')
        )
    );

-- Function to auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS trigger AS $$
DECLARE
    next_seq int;
    org_prefix text;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq 
    FROM purchase_orders 
    WHERE organization_id = NEW.organization_id;
    
    NEW.po_number := 'PO-' || to_char(now(), 'YYYYMM') || '-' || lpad(next_seq::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
    EXECUTE FUNCTION generate_po_number();

-- Update updated_at trigger
CREATE TRIGGER tr_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();



-- ========================================================
-- MIGRATION: 20260805175912_stock_transfers.sql
-- ========================================================

-- Atomic validation for inventory movements

create or replace function public.post_inventory_movement(
  p_organization_id  uuid,
  p_location_id      uuid,
  p_ingredient_id    uuid,
  p_transaction_type text,
  p_reference_type   text,
  p_reference_id     text,
  p_quantity_change  numeric,
  p_unit_id          uuid,
  p_running_cost     numeric,
  p_remarks          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id       uuid;
  v_base_unit_id    uuid;
  v_loc_org_id      uuid;
  v_actor_id        uuid;
  v_current_stock   numeric;
begin
  -- Resolve the authenticated user
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Validate: location belongs to the given organization
  select organization_id into v_loc_org_id
    from public.locations
    where id = p_location_id
      and deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> p_organization_id then
    raise exception 'Location not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: ingredient belongs to the given organization, fetch base unit
  select base_unit_id into v_base_unit_id
    from public.ingredients
    where id = p_ingredient_id
      and organization_id = p_organization_id
      and deleted_at is null;

  if v_base_unit_id is null then
    raise exception 'Ingredient not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: unit_id must match ingredient base unit
  if v_base_unit_id <> p_unit_id then
    raise exception 'Inventory must be posted in the ingredient''s base unit.' using errcode = '23514';
  end if;

  -- Atomically lock the snapshot row to validate negative stock
  select quantity_on_hand into v_current_stock
    from public.inventory_snapshot
    where location_id = p_location_id and ingredient_id = p_ingredient_id
    for update;
    
  if not found then
    v_current_stock := 0;
  end if;

  if p_quantity_change < 0 and (v_current_stock + p_quantity_change) < 0 then
    raise exception 'Insufficient inventory. Current stock: %, Attempted deduction: %', v_current_stock, abs(p_quantity_change) using errcode = '23514';
  end if;

  -- Insert into immutable Ledger
  insert into public.inventory_ledger (
    organization_id,
    location_id,
    ingredient_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    unit_id,
    running_cost,
    remarks,
    performed_by,
    created_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_quantity_change,
    p_unit_id,
    p_running_cost,
    p_remarks,
    v_actor_id,
    now()
  )
  returning id into v_ledger_id;

  -- Atomically upsert Snapshot
  insert into public.inventory_snapshot (
    organization_id,
    location_id,
    ingredient_id,
    quantity_on_hand,
    last_movement_at,
    updated_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_quantity_change,
    now(),
    now()
  )
  on conflict (location_id, ingredient_id) do update set
    quantity_on_hand  = public.inventory_snapshot.quantity_on_hand + excluded.quantity_on_hand,
    last_movement_at  = excluded.last_movement_at,
    updated_at        = excluded.updated_at;

  -- Audit log
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks
    )
  );

  return v_ledger_id;
end;
$$;


-- ========================================================
-- MIGRATION: 20260805180004_update_grn_for_pos.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260806120000_add_get_my_role_code.sql
-- ========================================================

-- Migration: Add a security-definer RPC for middleware routing
-- This function is called by proxy.ts BEFORE MFA verification, so it must
-- bypass RLS completely. It returns the authenticated user's primary role code.
-- Returns NULL if the user has no active membership.

create or replace function public.get_my_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from public.organization_memberships m
  join public.membership_roles mr on mr.membership_id = m.id
  join public.roles r on r.id = mr.role_id
  where m.user_id = auth.uid()
    and m.status = 'ACTIVE'
    and m.deleted_at is null
  order by
    case when r.code = 'OWNER' then 0 else 1 end
  limit 1;
$$;

-- Only authenticated users can call this
revoke all on function public.get_my_role_code() from public, anon;
grant execute on function public.get_my_role_code() to authenticated;


-- ========================================================
-- MIGRATION: 20260806130000_add_get_my_employee_info.sql
-- ========================================================

-- Add a security-definer RPC for the employee dashboard.
-- Employees are at aal1 (no TOTP). The organization_memberships, organizations,
-- profiles, and roles tables all require has_mfa_assurance() (aal2) via RLS.
-- This function bypasses RLS to return the info the employee dashboard needs.

create or replace function public.get_my_employee_info()
returns table(
  organization_name text,
  role_name         text,
  role_code         text,
  full_name         text,
  joined_at         timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.name          as organization_name,
    r.name          as role_name,
    r.code          as role_code,
    p.full_name     as full_name,
    m.joined_at     as joined_at
  from public.organization_memberships m
  join public.organizations            o  on o.id = m.organization_id
  join public.membership_roles         mr on mr.membership_id = m.id
  join public.roles                    r  on r.id = mr.role_id
  join public.profiles                 p  on p.id = m.user_id
  where m.user_id     = auth.uid()
    and m.status      = 'ACTIVE'
    and m.deleted_at  is null
  limit 1;
$$;

revoke all on function public.get_my_employee_info() from public, anon;
grant execute on function public.get_my_employee_info() to authenticated;


-- ========================================================
-- MIGRATION: 20260806140000_stock_transfers_schema.sql
-- ========================================================

-- Stock Transfers Module
CREATE TYPE stock_transfer_status AS ENUM ('DRAFT', 'SHIPPED', 'RECEIVED', 'CANCELLED');

CREATE TABLE stock_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    destination_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    status stock_transfer_status NOT NULL DEFAULT 'DRAFT',
    transfer_number text NOT NULL,
    notes text,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, transfer_number),
    CHECK (source_location_id != destination_location_id)
);

CREATE TABLE stock_transfer_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity numeric(10,3) NOT NULL CHECK (quantity > 0),
    unit_id uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    converted_base_quantity numeric(10,3) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Policies for stock_transfers
CREATE POLICY "Users can view stock_transfers in their organization" ON stock_transfers
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users with inventory.manage can insert stock_transfers" ON stock_transfers
    FOR INSERT WITH CHECK (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can update stock_transfers" ON stock_transfers
    FOR UPDATE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can delete stock_transfers" ON stock_transfers
    FOR DELETE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

-- Policies for stock_transfer_items
CREATE POLICY "Users can view stock_transfer_items in their organization" ON stock_transfer_items
    FOR SELECT USING (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE organization_id IN (
                SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
            )
        )
    );

CREATE POLICY "Users can insert stock_transfer_items" ON stock_transfer_items
    FOR INSERT WITH CHECK (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE public.has_permission(stock_transfers.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can update stock_transfer_items" ON stock_transfer_items
    FOR UPDATE USING (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE public.has_permission(stock_transfers.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can delete stock_transfer_items" ON stock_transfer_items
    FOR DELETE USING (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE public.has_permission(stock_transfers.organization_id, 'inventory.manage')
        )
    );

-- Function to auto-generate Transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS trigger AS $$
DECLARE
    next_seq int;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq 
    FROM stock_transfers 
    WHERE organization_id = NEW.organization_id;
    
    NEW.transfer_number := 'TR-' || to_char(now(), 'YYYYMM') || '-' || lpad(next_seq::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_transfer_number
    BEFORE INSERT ON stock_transfers
    FOR EACH ROW
    WHEN (NEW.transfer_number IS NULL OR NEW.transfer_number = '')
    EXECUTE FUNCTION generate_transfer_number();

-- Update updated_at trigger
CREATE TRIGGER tr_stock_transfers_updated_at
    BEFORE UPDATE ON stock_transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- ========================================================
-- MIGRATION: 20260806140500_stock_transfers_rpc.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260807051200_menu_management.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260807060000_sales_pos.sql
-- ========================================================

-- POS and Sales Engine
-- Creates sales orders, sales order items, payments, and the atomic processing RPC.

-- 1. Sales Orders
create table if not exists public.sales_orders (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    location_id uuid not null references public.locations(id) on delete restrict,
    order_number text not null,
    order_status text not null check (order_status in ('DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    subtotal numeric(12,2) not null check (subtotal >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    grand_total numeric(12,2) not null check (grand_total >= 0),
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists sales_orders_org_idx on public.sales_orders (organization_id);
create index if not exists sales_orders_loc_idx on public.sales_orders (location_id);
create unique index if not exists sales_orders_org_order_num_idx on public.sales_orders (organization_id, order_number);

-- 2. Sales Order Items
create table if not exists public.sales_order_items (
    id uuid primary key default gen_random_uuid(),
    sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
    menu_variant_id uuid not null references public.menu_variants(id) on delete restrict,
    quantity integer not null check (quantity > 0),
    unit_price numeric(12,2) not null check (unit_price >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    line_total numeric(12,2) not null check (line_total >= 0),
    created_at timestamptz not null default now()
);

create index if not exists sales_order_items_order_idx on public.sales_order_items (sales_order_id);

-- 3. Payments
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
    payment_method text not null check (payment_method in ('Cash', 'UPI', 'Card')),
    amount numeric(12,2) not null check (amount > 0),
    payment_status text not null check (payment_status in ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    transaction_reference text,
    paid_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (sales_order_id);

-- Trigger for updated_at
create trigger sales_orders_set_updated_at before update on public.sales_orders for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.payments enable row level security;

-- Policies
create policy "members can read sales orders" on public.sales_orders
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy "members can read sales order items" on public.sales_order_items
  for select to authenticated
  using (sales_order_id in (select id from public.sales_orders where organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid() and status = 'ACTIVE')));

create policy "members can read payments" on public.payments
  for select to authenticated
  using (sales_order_id in (select id from public.sales_orders where organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid() and status = 'ACTIVE')));

-- 4. Atomic RPC to Process a Sale
create or replace function public.process_sale(
  p_location_id uuid,
  p_items jsonb,      -- array of { variant_id, quantity, unit_price, tax_amount, line_total }
  p_payments jsonb,   -- array of { method, amount, reference }
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_grand_total numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_actor_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_today text;
  v_daily_count integer;
  rec record;
  p_rec record;
begin
  -- 1. Validate employee and branch context
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select organization_id into v_org_id
  from public.locations
  where id = p_location_id and deleted_at is null;

  if v_org_id is null then
    raise exception 'Invalid location.' using errcode = '23514';
  end if;

  if not public.is_active_member(v_org_id) then
    raise exception 'Not an active member of this organization.' using errcode = '23514';
  end if;

  -- Generate order ID early so we can use it as a reference
  v_order_id := gen_random_uuid();
  
  -- Generate simple order number (e.g., ORD-YYYYMMDD-001)
  v_today := to_char(now(), 'YYYYMMDD');
  select count(*) into v_daily_count from public.sales_orders where location_id = p_location_id and order_number like 'ORD-' || v_today || '-%';
  v_order_number := 'ORD-' || v_today || '-' || lpad((v_daily_count + 1)::text, 3, '0');

  -- 2. Compute recipe consumption & 3. Validate and Post Inventory
  for rec in (
    select 
      r.ingredient_id, 
      ing.base_unit_id, 
      sum(r.quantity_in_base_unit * (i.value->>'quantity')::numeric) as total_qty
    from jsonb_array_elements(p_items) as i
    join public.recipe_items r on r.variant_id = (i.value->>'variant_id')::uuid
    join public.ingredients ing on ing.id = r.ingredient_id
    where r.organization_id = v_org_id
    group by r.ingredient_id, ing.base_unit_id
  ) loop
    -- Deduct inventory; this will throw if stock is insufficient, aborting the entire transaction safely.
    perform public.post_inventory_movement(
       v_org_id,
       p_location_id,
       rec.ingredient_id,
       'RECIPE_CONSUMPTION',
       'SALE',
       v_order_id::text,
       -(rec.total_qty),
       rec.base_unit_id,
       0,
       'Automated consumption for Sale ' || v_order_number
    );
  end loop;

  -- 4. Create Sales Order
  insert into public.sales_orders (
    id, organization_id, location_id, order_number, order_status, 
    subtotal, discount_amount, tax_amount, grand_total, created_by, completed_at
  ) values (
    v_order_id, v_org_id, p_location_id, v_order_number, 'COMPLETED',
    p_subtotal, p_discount, p_tax, p_grand_total, v_actor_id, now()
  );

  -- 5. Create Sales Order Items
  for rec in (
    select * from jsonb_array_elements(p_items)
  ) loop
    insert into public.sales_order_items (
      sales_order_id, menu_variant_id, quantity, unit_price, tax_amount, line_total
    ) values (
      v_order_id, 
      (rec.value->>'variant_id')::uuid, 
      (rec.value->>'quantity')::integer, 
      (rec.value->>'unit_price')::numeric, 
      (rec.value->>'tax_amount')::numeric, 
      (rec.value->>'line_total')::numeric
    );
  end loop;

  -- 6. Record Payment
  for p_rec in (
    select * from jsonb_array_elements(p_payments)
  ) loop
    insert into public.payments (
      sales_order_id, payment_method, amount, payment_status, transaction_reference
    ) values (
      v_order_id,
      p_rec.value->>'method',
      (p_rec.value->>'amount')::numeric,
      'COMPLETED',
      p_rec.value->>'reference'
    );
  end loop;

  -- 7. Audit Log
  insert into public.audit_log (
    organization_id, actor_id, action, entity_type, entity_id, new_data
  ) values (
    v_org_id, v_actor_id, 'SALE_COMPLETED', 'sales_orders', v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'location_id', p_location_id,
      'grand_total', p_grand_total
    )
  );

  return v_order_id;
end;
$$;


-- ========================================================
-- MIGRATION: 20260807063000_employee_branch_assignment.sql
-- ========================================================

-- Add location_id to organization_memberships so employees are tied to a branch.
-- Extend get_my_employee_info to return organization_id and location_id for POS.

-- 1. Add location_id column
alter table public.organization_memberships
  add column if not exists location_id uuid references public.locations(id) on delete set null;

-- 2. Drop and recreate get_my_employee_info with new return columns
drop function if exists public.get_my_employee_info();

create or replace function public.get_my_employee_info()
returns table(
  organization_id   uuid,
  location_id       uuid,
  organization_name text,
  role_name         text,
  role_code         text,
  full_name         text,
  joined_at         timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.organization_id as organization_id,
    m.location_id     as location_id,
    o.name            as organization_name,
    r.name            as role_name,
    r.code            as role_code,
    p.full_name       as full_name,
    m.joined_at       as joined_at
  from public.organization_memberships m
  join public.organizations            o  on o.id = m.organization_id
  join public.membership_roles         mr on mr.membership_id = m.id
  join public.roles                    r  on r.id = mr.role_id
  join public.profiles                 p  on p.id = m.user_id
  where m.user_id     = auth.uid()
    and m.status      = 'ACTIVE'
    and m.deleted_at  is null
  limit 1;
$$;

revoke all on function public.get_my_employee_info() from public, anon;
grant execute on function public.get_my_employee_info() to authenticated;

-- 3. Drop and recreate validate_invitation_token to also return location_id
drop function if exists public.validate_invitation_token(text);

create or replace function public.validate_invitation_token(p_token_hash text)
returns table (
  invitation_id uuid,
  organization_id uuid,
  organization_name text,
  email text,
  role_id uuid,
  role_name text,
  location_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    i.id as invitation_id,
    o.id as organization_id,
    o.name as organization_name,
    i.email,
    r.id as role_id,
    r.name as role_name,
    i.location_id
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  join public.roles r on r.id = i.role_id
  where i.token_hash = p_token_hash
    and i.accepted_at is null
    and i.deleted_at is null
    and i.expires_at > now();
end;
$$;


-- ========================================================
-- MIGRATION: 20260807064000_pos_menu_rpc.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260808010000_order_queue_schema.sql
-- ========================================================

-- Phase 4A: Order Queue Schema Extension
-- Adds customer information to sales_orders for the order-based POS workflow.

-- Add customer_name and customer_phone to sales_orders
alter table public.sales_orders
  add column if not exists customer_name text not null default '',
  add column if not exists customer_phone text;

-- Add index for customer lookups
create index if not exists sales_orders_customer_name_idx
  on public.sales_orders (organization_id, lower(customer_name))
  where order_status not in ('CANCELLED', 'COMPLETED');


-- ========================================================
-- MIGRATION: 20260808020000_order_queue_rpcs.sql
-- ========================================================

-- Phase 4A: Order Queue RPCs
-- Implements the deferred inventory consumption workflow.
-- Replaces process_sale() for the order-based POS workflow.

-- ============================================================
-- HELPER: get the authenticated employee's organization_id and
-- location_id from organization_memberships (bypasses aal2 RLS).
-- Used internally by security-definer order RPCs.
-- ============================================================

create or replace function public._get_employee_context()
returns table(organization_id uuid, location_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id, m.location_id
  from public.organization_memberships m
  where m.user_id = auth.uid()
    and m.status = 'ACTIVE'
    and m.deleted_at is null
  limit 1;
$$;

-- ============================================================
-- 1. create_order — Place an order (CONFIRMED). NO inventory movement.
--    Validates all pricing server-side. Does NOT trust client totals.
-- ============================================================

create or replace function public.create_order(
  p_location_id    uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_items          jsonb,  -- [{ variant_id, quantity, unit_price, tax_amount, line_total }]
  p_subtotal       numeric,
  p_discount       numeric,
  p_tax            numeric,
  p_grand_total    numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id       uuid;
  v_org_id         uuid;
  v_emp_location   uuid;
  v_order_id       uuid;
  v_order_number   text;
  v_today          text;
  v_daily_count    integer;
  v_item           jsonb;
  v_variant_id     uuid;
  v_quantity       integer;
  v_client_price   numeric;
  v_variant        record;
  v_server_price   numeric;
  v_tax_rate       numeric;
  v_server_subtotal  numeric := 0;
  v_server_tax       numeric := 0;
  v_item_line_total  numeric;
  v_item_tax         numeric;
begin
  -- 1. Authenticate
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- 2. Resolve employee org + location (security definer to bypass aal2 RLS)
  select ec.organization_id, ec.location_id
    into v_org_id, v_emp_location
  from public._get_employee_context() ec;

  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  -- 3. Validate that p_location_id belongs to employee's org
  if not exists (
    select 1 from public.locations
    where id = p_location_id
      and organization_id = v_org_id
      and deleted_at is null
  ) then
    raise exception 'Invalid location.' using errcode = '23514';
  end if;

  -- 4. Validate employee is assigned to this location
  if v_emp_location is distinct from p_location_id then
    raise exception 'You are not assigned to this branch.' using errcode = '23514';
  end if;

  -- 5. Validate customer name
  if p_customer_name is null or trim(p_customer_name) = '' then
    raise exception 'Customer name is required.' using errcode = '23514';
  end if;

  -- 6. Validate items is non-empty array
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Order must have at least one item.' using errcode = '23514';
  end if;

  -- 7. Validate each item: variant ownership, availability, pricing
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id   := (v_item->>'variant_id')::uuid;
    v_quantity     := (v_item->>'quantity')::integer;
    v_client_price := (v_item->>'unit_price')::numeric;

    -- Quantity must be positive
    if v_quantity is null or v_quantity < 1 then
      raise exception 'Item quantity must be at least 1.' using errcode = '23514';
    end if;

    -- Fetch variant + item + tax info, validating org ownership & active status
    select
      mv.id,
      mv.default_price,
      mv.is_active,
      mv.deleted_at,
      coalesce(bmc.price_override, mv.default_price) as effective_price,
      bmc.is_available,
      coalesce(tr.rate_percentage, 0) as tax_rate
    into v_variant
    from public.menu_variants mv
    join public.menu_items mi on mi.id = mv.menu_item_id
    left join public.branch_menu_configs bmc
      on bmc.variant_id = mv.id
     and bmc.location_id = p_location_id
     and bmc.organization_id = v_org_id
    left join public.tax_categories tc on tc.id = mi.tax_category_id
    left join public.tax_rates tr
      on tr.tax_category_id = tc.id
     and tr.deleted_at is null
     and tr.effective_from <= current_date
    where mv.id = v_variant_id
      and mv.organization_id = v_org_id;

    if not found then
      raise exception 'Variant % not found or does not belong to this organization.', v_variant_id
        using errcode = '23514';
    end if;

    if not v_variant.is_active or v_variant.deleted_at is not null then
      raise exception 'Variant % is not active.', v_variant_id using errcode = '23514';
    end if;

    -- Check branch availability (null config means available by default)
    if v_variant.is_available is not null and v_variant.is_available = false then
      raise exception 'Variant % is not available at this branch.', v_variant_id
        using errcode = '23514';
    end if;

    v_server_price := v_variant.effective_price;

    -- Validate client-submitted unit_price matches server price (±0.01 tolerance)
    if abs(v_client_price - v_server_price) > 0.01 then
      raise exception 'Price mismatch for variant %. Expected %, received %.',
        v_variant_id, v_server_price, v_client_price
        using errcode = '23514';
    end if;

    -- Accumulate server-side totals
    v_tax_rate       := v_variant.tax_rate;
    v_item_line_total := v_server_price * v_quantity;
    v_item_tax        := round((v_item_line_total * v_tax_rate / 100), 2);
    v_server_subtotal := v_server_subtotal + v_item_line_total;
    v_server_tax      := v_server_tax + v_item_tax;
  end loop;

  -- 8. Validate totals submitted by client (±0.10 tolerance for rounding)
  if abs(p_subtotal - v_server_subtotal) > 0.10 then
    raise exception 'Subtotal mismatch. Expected %, received %.', v_server_subtotal, p_subtotal
      using errcode = '23514';
  end if;

  if abs(p_tax - v_server_tax) > 0.10 then
    raise exception 'Tax amount mismatch. Expected %, received %.', v_server_tax, p_tax
      using errcode = '23514';
  end if;

  declare
    v_server_grand_total numeric := round(v_server_subtotal - coalesce(p_discount, 0) + v_server_tax, 2);
  begin
    if abs(p_grand_total - v_server_grand_total) > 0.10 then
      raise exception 'Grand total mismatch. Expected %, received %.', v_server_grand_total, p_grand_total
        using errcode = '23514';
    end if;
  end;

  -- 9. Generate order number
  v_order_id   := gen_random_uuid();
  v_today      := to_char(now(), 'YYYYMMDD');
  select count(*) into v_daily_count
    from public.sales_orders
   where location_id = p_location_id
     and order_number like 'ORD-' || v_today || '-%';
  v_order_number := 'ORD-' || v_today || '-' || lpad((v_daily_count + 1)::text, 3, '0');

  -- 10. Insert sales order (CONFIRMED, using server-calculated totals)
  insert into public.sales_orders (
    id, organization_id, location_id, order_number, order_status,
    customer_name, customer_phone,
    subtotal, discount_amount, tax_amount, grand_total, created_by
  ) values (
    v_order_id, v_org_id, p_location_id, v_order_number, 'CONFIRMED',
    trim(p_customer_name), nullif(trim(coalesce(p_customer_phone, '')), ''),
    v_server_subtotal, coalesce(p_discount, 0), v_server_tax,
    round(v_server_subtotal - coalesce(p_discount, 0) + v_server_tax, 2),
    v_actor_id
  );

  -- 11. Insert order items (use server-verified unit_price)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;

    -- Re-fetch server price for each item (already validated above)
    select coalesce(bmc.price_override, mv.default_price),
           coalesce(tr.rate_percentage, 0)
      into v_server_price, v_tax_rate
    from public.menu_variants mv
    left join public.branch_menu_configs bmc
      on bmc.variant_id = mv.id
     and bmc.location_id = p_location_id
     and bmc.organization_id = v_org_id
    left join public.menu_items mi on mi.id = mv.menu_item_id
    left join public.tax_categories tc on tc.id = mi.tax_category_id
    left join public.tax_rates tr
      on tr.tax_category_id = tc.id
     and tr.deleted_at is null
     and tr.effective_from <= current_date
    where mv.id = v_variant_id;

    v_item_line_total := v_server_price * v_quantity;
    v_item_tax        := round(v_item_line_total * v_tax_rate / 100, 2);

    insert into public.sales_order_items (
      sales_order_id, menu_variant_id, quantity,
      unit_price, tax_amount, line_total
    ) values (
      v_order_id, v_variant_id, v_quantity,
      v_server_price, v_item_tax, v_item_line_total
    );
  end loop;

  -- 12. Audit
  insert into public.audit_log (
    organization_id, actor_id, action, entity_type, entity_id, new_data
  ) values (
    v_org_id, v_actor_id, 'ORDER_CREATED', 'sales_orders', v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'customer_name', p_customer_name,
      'location_id', p_location_id
    )
  );

  return v_order_id;
end;
$$;

-- ============================================================
-- 2. start_preparing_order — Atomically consume recipe ingredients.
--    Transitions CONFIRMED → PREPARING.
-- ============================================================

create or replace function public.start_preparing_order(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
  rec            record;
  v_avail        numeric;
  v_ing_name     text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Get employee context
  select ec.organization_id, ec.location_id
    into v_org_id, v_emp_location
  from public._get_employee_context() ec;

  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  -- Lock the order row (prevents concurrent double-starts)
  select * into v_order
  from public.sales_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;

  -- Validate org ownership
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;

  -- Validate employee is at the right location
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;

  -- Validate status is CONFIRMED (prevents double consumption)
  if v_order.order_status <> 'CONFIRMED' then
    raise exception 'Order is not in CONFIRMED status (current: %). Cannot start preparation.',
      v_order.order_status using errcode = '23514';
  end if;

  -- Pre-validate: check all ingredients have sufficient stock before deducting anything
  for rec in (
    select
      r.ingredient_id,
      ing.name as ingredient_name,
      ing.base_unit_id,
      u.symbol as unit_symbol,
      sum(r.quantity_in_base_unit * soi.quantity) as total_required
    from public.sales_order_items soi
    join public.recipe_items r on r.variant_id = soi.menu_variant_id
    join public.ingredients ing on ing.id = r.ingredient_id
    join public.units u on u.id = ing.base_unit_id
    where soi.sales_order_id = p_order_id
      and r.organization_id = v_org_id
    group by r.ingredient_id, ing.name, ing.base_unit_id, u.symbol
  ) loop
    -- Check current stock
    select coalesce(snap.quantity_on_hand, 0) into v_avail
    from public.inventory_snapshot snap
    where snap.location_id = v_order.location_id
      and snap.ingredient_id = rec.ingredient_id;

    if v_avail is null then
      v_avail := 0;
    end if;

    if v_avail < rec.total_required then
      raise exception 'Insufficient stock: %. Required: % %, Available: % %.',
        rec.ingredient_name,
        round(rec.total_required, 3), rec.unit_symbol,
        round(v_avail, 3), rec.unit_symbol
        using errcode = '23514';
    end if;
  end loop;

  -- Deduct inventory for each ingredient (atomically — any failure rolls back all)
  for rec in (
    select
      r.ingredient_id,
      ing.base_unit_id,
      sum(r.quantity_in_base_unit * soi.quantity) as total_qty
    from public.sales_order_items soi
    join public.recipe_items r on r.variant_id = soi.menu_variant_id
    join public.ingredients ing on ing.id = r.ingredient_id
    where soi.sales_order_id = p_order_id
      and r.organization_id = v_org_id
    group by r.ingredient_id, ing.base_unit_id
  ) loop
    perform public.post_inventory_movement(
      v_org_id,
      v_order.location_id,
      rec.ingredient_id,
      'RECIPE_CONSUMPTION',
      'SALE',
      p_order_id::text,
      -(rec.total_qty),
      rec.base_unit_id,
      0,
      'Recipe consumption for order ' || v_order.order_number
    );
  end loop;

  -- Transition to PREPARING
  update public.sales_orders
    set order_status = 'PREPARING', updated_at = now()
  where id = p_order_id;

  -- Audit
  insert into public.audit_log (
    organization_id, actor_id, action, entity_type, entity_id
  ) values (
    v_org_id, v_actor_id, 'ORDER_PREPARING_STARTED', 'sales_orders', p_order_id
  );
end;
$$;

-- ============================================================
-- 3. mark_order_ready — PREPARING → READY. No inventory movement.
-- ============================================================

create or replace function public.mark_order_ready(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;
  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;
  if v_order.order_status <> 'PREPARING' then
    raise exception 'Order must be in PREPARING status to mark as READY (current: %).', v_order.order_status
      using errcode = '23514';
  end if;

  update public.sales_orders
    set order_status = 'READY', updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_actor_id, 'ORDER_READY', 'sales_orders', p_order_id);
end;
$$;

-- ============================================================
-- 4. complete_order — READY → COMPLETED. No inventory movement.
-- ============================================================

create or replace function public.complete_order(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;
  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;
  if v_order.order_status <> 'READY' then
    raise exception 'Order must be in READY status to complete (current: %).', v_order.order_status
      using errcode = '23514';
  end if;

  update public.sales_orders
    set order_status = 'COMPLETED', completed_at = now(), updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_actor_id, 'ORDER_COMPLETED', 'sales_orders', p_order_id);
end;
$$;

-- ============================================================
-- 5. cancel_order — CONFIRMED → CANCELLED only.
--    PREPARING/READY/COMPLETED cancellation is BLOCKED.
-- ============================================================

create or replace function public.cancel_order(
  p_order_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid;
  v_org_id       uuid;
  v_emp_location uuid;
  v_order        record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;
  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = '23514';
  end if;
  if v_order.organization_id <> v_org_id then
    raise exception 'Access denied.' using errcode = '23514';
  end if;
  if v_order.location_id is distinct from v_emp_location then
    raise exception 'You are not assigned to the branch for this order.' using errcode = '23514';
  end if;

  if v_order.order_status in ('PREPARING', 'READY', 'COMPLETED') then
    raise exception 'Cannot cancel an order that is already %. Inventory has been consumed. Contact your manager.',
      v_order.order_status using errcode = '23514';
  end if;
  if v_order.order_status = 'CANCELLED' then
    raise exception 'Order is already cancelled.' using errcode = '23514';
  end if;
  if v_order.order_status <> 'CONFIRMED' then
    raise exception 'Only CONFIRMED orders can be cancelled.' using errcode = '23514';
  end if;

  update public.sales_orders
    set order_status = 'CANCELLED', updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_actor_id, 'ORDER_CANCELLED', 'sales_orders', p_order_id);
end;
$$;

-- ============================================================
-- 6. get_location_orders — Fetch active orders for a location (employee use)
-- ============================================================

create or replace function public.get_location_orders(
  p_location_id uuid
) returns table(
  order_id       uuid,
  order_number   text,
  order_status   text,
  customer_name  text,
  customer_phone text,
  subtotal       numeric,
  tax_amount     numeric,
  grand_total    numeric,
  created_at     timestamptz,
  updated_at     timestamptz,
  items          jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id       uuid;
  v_emp_location uuid;
begin
  select ec.organization_id, ec.location_id into v_org_id, v_emp_location
  from public._get_employee_context() ec;

  if v_org_id is null then
    raise exception 'No active membership found.' using errcode = '23514';
  end if;

  if v_emp_location is distinct from p_location_id then
    raise exception 'You are not assigned to this branch.' using errcode = '23514';
  end if;

  return query
  select
    so.id as order_id,
    so.order_number,
    so.order_status,
    so.customer_name,
    so.customer_phone,
    so.subtotal,
    so.tax_amount,
    so.grand_total,
    so.created_at,
    so.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_id',      soi.id,
          'variant_id',   soi.menu_variant_id,
          'variant_name', mv.name,
          'item_name',    mi.name,
          'quantity',     soi.quantity,
          'unit_price',   soi.unit_price,
          'line_total',   soi.line_total
        )
        order by soi.created_at
      ) filter (where soi.id is not null),
      '[]'::jsonb
    ) as items
  from public.sales_orders so
  left join public.sales_order_items soi on soi.sales_order_id = so.id
  left join public.menu_variants mv on mv.id = soi.menu_variant_id
  left join public.menu_items mi on mi.id = mv.menu_item_id
  where so.location_id = p_location_id
    and so.organization_id = v_org_id
    and so.order_status in ('CONFIRMED', 'PREPARING', 'READY')
  group by so.id
  order by so.created_at asc;
end;
$$;

-- Revoke public access, grant to authenticated (employees are authenticated)
revoke all on function public._get_employee_context() from public, anon;
grant execute on function public._get_employee_context() to authenticated;

revoke all on function public.create_order(uuid, text, text, jsonb, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.create_order(uuid, text, text, jsonb, numeric, numeric, numeric, numeric) to authenticated;

revoke all on function public.start_preparing_order(uuid) from public, anon;
grant execute on function public.start_preparing_order(uuid) to authenticated;

revoke all on function public.mark_order_ready(uuid) from public, anon;
grant execute on function public.mark_order_ready(uuid) to authenticated;

revoke all on function public.complete_order(uuid) from public, anon;
grant execute on function public.complete_order(uuid) to authenticated;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

revoke all on function public.get_location_orders(uuid) from public, anon;
grant execute on function public.get_location_orders(uuid) to authenticated;


-- ========================================================
-- MIGRATION: 20260808030000_order_queue_rls.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260808040000_audit_log_grant.sql
-- ========================================================

-- Grant select on public.audit_log to authenticated users so they can query it
-- (It was accidentally revoked in the initial RBAC migration)
grant select on public.audit_log to authenticated;


-- ========================================================
-- MIGRATION: 20260811000000_audit_inventory_totals.sql
-- ========================================================

-- ============================================================
-- Migration: Add old_data and new_data to Inventory Audit Log
-- ============================================================
-- Description:
-- Updates the `post_inventory_movement` RPC to accurately record the 
-- old and new total inventory quantity_on_hand in the audit log.
-- ============================================================

create or replace function public.post_inventory_movement(
  p_organization_id   uuid,
  p_location_id       uuid,
  p_ingredient_id     uuid,
  p_transaction_type  text,
  p_quantity_change   numeric,
  p_unit_id           uuid,
  p_reference_type    text default null,
  p_reference_id      text default null,
  p_running_cost      numeric default null,
  p_remarks           text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id  uuid;
  v_ledger_id uuid;
  v_old_qty   numeric;
  v_new_qty   numeric;
begin
  -- 1. Grab the current user (requires our auth_context function)
  v_actor_id := public.get_auth_user_id();
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Validate transaction type
  if p_transaction_type not in (
    'GOODS_RECEIPT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'SALE',
    'RECIPE_CONSUMPTION',
    'STOCK_ADJUSTMENT',
    'WASTAGE',
    'RETURN'
  ) then
    raise exception 'Invalid transaction type: %', p_transaction_type;
  end if;

  -- 3. Insert Ledger Entry
  insert into public.inventory_ledger (
    organization_id,
    location_id,
    ingredient_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    unit_id,
    running_cost,
    remarks,
    performed_by,
    created_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_quantity_change,
    p_unit_id,
    p_running_cost,
    p_remarks,
    v_actor_id,
    now()
  )
  returning id into v_ledger_id;

  -- 4. Get current quantity_on_hand before update
  select quantity_on_hand into v_old_qty
  from public.inventory_snapshot
  where organization_id = p_organization_id
    and location_id = p_location_id
    and ingredient_id = p_ingredient_id;

  if v_old_qty is null then
    v_old_qty := 0;
  end if;

  v_new_qty := v_old_qty + p_quantity_change;

  -- 5. Atomically upsert Snapshot
  insert into public.inventory_snapshot (
    organization_id,
    location_id,
    ingredient_id,
    quantity_on_hand,
    last_movement_at,
    updated_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_quantity_change,
    now(),
    now()
  )
  on conflict (location_id, ingredient_id) do update set
    quantity_on_hand  = public.inventory_snapshot.quantity_on_hand + excluded.quantity_on_hand,
    last_movement_at  = excluded.last_movement_at,
    updated_at        = excluded.updated_at;

  -- 6. Audit log
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'total_quantity_on_hand', v_old_qty
    ),
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks,
      'total_quantity_on_hand', v_new_qty
    )
  );

  return v_ledger_id;
end;
$$;


-- ========================================================
-- MIGRATION: 20260811100000_fix_inventory_movement_overload.sql
-- ========================================================

-- ============================================================
-- Fix: Restore post_inventory_movement to the canonical signature
-- ============================================================
-- PROBLEM SUMMARY:
-- Migration 20260811000000_audit_inventory_totals.sql created a NEW overload of
-- post_inventory_movement with a DIFFERENT parameter order AND used a non-existent
-- helper function `public.get_auth_user_id()`.
--
-- This left TWO incompatible overloads in the DB:
--   OLD (all callers use this): (..., p_reference_type, p_reference_id, p_quantity_change, ...)
--   NEW (20260811):             (..., p_quantity_change, p_unit_id, p_reference_type [default], ...)
--
-- Callers that use POSITIONAL args (sales_pos, order_queue_rpcs) target the OLD signature.
-- Callers that use NAMED args (stock_transfers_rpc, grns, update_grn_for_pos) hit ambiguity.
--
-- FIX STRATEGY:
-- 1. Drop BOTH overloads to fully clean up.
-- 2. Recreate ONE canonical function using the ORIGINAL signature (old param order, auth.uid())
--    but INCLUDING the old_data/new_data audit enhancements from the 20260811 migration.
-- ============================================================

-- Step 1: Drop the NEW overload (quantity_change before reference params, with defaults)
drop function if exists public.post_inventory_movement(
  uuid,    -- p_organization_id
  uuid,    -- p_location_id
  uuid,    -- p_ingredient_id
  text,    -- p_transaction_type
  numeric, -- p_quantity_change  <-- NEW position (position 5)
  uuid,    -- p_unit_id
  text,    -- p_reference_type  (default null)
  text,    -- p_reference_id    (default null)
  numeric, -- p_running_cost    (default null)
  text     -- p_remarks         (default null)
);

-- Step 2: Recreate the ONE canonical function with the ORIGINAL signature + old/new audit data
create or replace function public.post_inventory_movement(
  p_organization_id  uuid,
  p_location_id      uuid,
  p_ingredient_id    uuid,
  p_transaction_type text,
  p_reference_type   text,
  p_reference_id     text,
  p_quantity_change  numeric,
  p_unit_id          uuid,
  p_running_cost     numeric,
  p_remarks          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id       uuid;
  v_base_unit_id    uuid;
  v_loc_org_id      uuid;
  v_actor_id        uuid;
  v_old_qty         numeric;
  v_new_qty         numeric;
begin
  -- Resolve the authenticated user
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- Validate: location belongs to the given organization
  select organization_id into v_loc_org_id
    from public.locations
    where id = p_location_id
      and deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> p_organization_id then
    raise exception 'Location not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: ingredient belongs to the given organization, fetch base unit
  select base_unit_id into v_base_unit_id
    from public.ingredients
    where id = p_ingredient_id
      and organization_id = p_organization_id
      and deleted_at is null;

  if v_base_unit_id is null then
    raise exception 'Ingredient not found or does not belong to organization.' using errcode = '23514';
  end if;

  -- Validate: unit_id must match ingredient base unit
  if v_base_unit_id <> p_unit_id then
    raise exception 'Inventory must be posted in the ingredient''s base unit.' using errcode = '23514';
  end if;

  -- Insert into immutable Ledger
  insert into public.inventory_ledger (
    organization_id,
    location_id,
    ingredient_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    unit_id,
    running_cost,
    remarks,
    performed_by,
    created_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_quantity_change,
    p_unit_id,
    p_running_cost,
    p_remarks,
    v_actor_id,
    now()
  )
  returning id into v_ledger_id;

  -- Get current quantity_on_hand BEFORE update (for audit old_data)
  select quantity_on_hand into v_old_qty
  from public.inventory_snapshot
  where organization_id = p_organization_id
    and location_id = p_location_id
    and ingredient_id = p_ingredient_id;

  if v_old_qty is null then
    v_old_qty := 0;
  end if;

  v_new_qty := v_old_qty + p_quantity_change;

  -- Atomically upsert Snapshot
  insert into public.inventory_snapshot (
    organization_id,
    location_id,
    ingredient_id,
    quantity_on_hand,
    last_movement_at,
    updated_at
  ) values (
    p_organization_id,
    p_location_id,
    p_ingredient_id,
    p_quantity_change,
    now(),
    now()
  )
  on conflict (location_id, ingredient_id) do update set
    quantity_on_hand  = public.inventory_snapshot.quantity_on_hand + excluded.quantity_on_hand,
    last_movement_at  = excluded.last_movement_at,
    updated_at        = excluded.updated_at;

  -- Audit log with old_data and new_data (enhanced from 20260811 migration)
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) values (
    p_organization_id,
    v_actor_id,
    'INVENTORY_MOVEMENT_POSTED',
    'inventory_ledger',
    v_ledger_id,
    jsonb_build_object(
      'total_quantity_on_hand', v_old_qty
    ),
    jsonb_build_object(
      'transaction_type', p_transaction_type,
      'location_id',      p_location_id,
      'ingredient_id',    p_ingredient_id,
      'quantity_change',  p_quantity_change,
      'unit_id',          p_unit_id,
      'reference_type',   p_reference_type,
      'reference_id',     p_reference_id,
      'remarks',          p_remarks,
      'total_quantity_on_hand', v_new_qty
    )
  );

  return v_ledger_id;
end;
$$;


-- ========================================================
-- MIGRATION: 20260814173100_entity_comments.sql
-- ========================================================

-- Create comments table
CREATE TABLE comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    goods_receipt_id uuid REFERENCES goods_receipts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_comment_entity CHECK (
        (purchase_order_id IS NOT NULL)::integer + 
        (goods_receipt_id IS NOT NULL)::integer = 1
    )
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for comments
CREATE POLICY "Users can view comments in their organization" ON comments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can insert comments in their organization" ON comments
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );


-- ========================================================
-- MIGRATION: 20260826000000_grn_independent_receipts.sql
-- ========================================================

-- Independent GRN receipts & PO fulfillment migration

-- 1. Add purchase_order_item_id to goods_receipt_items
alter table public.goods_receipt_items
  add column if not exists purchase_order_item_id uuid references public.purchase_order_items(id) on delete set null;

create index if not exists goods_receipt_items_poi_idx
  on public.goods_receipt_items (purchase_order_item_id)
  where purchase_order_item_id is not null;

-- 2. Update enforce_grn_header_rules to allow any active facility (Warehouse or Shop)
create or replace function public.enforce_grn_header_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc_org_id  uuid;
begin
  -- Check location ownership
  select l.organization_id
    into v_loc_org_id
    from public.locations l
    where l.id = new.warehouse_location_id
      and l.deleted_at is null;

  if v_loc_org_id is null or v_loc_org_id <> new.organization_id then
    raise exception 'Receiving facility location does not belong to this organization.' using errcode = '23514';
  end if;

  -- Block mutations once POSTED
  if TG_OP = 'UPDATE' and old.status = 'POSTED' then
    raise exception 'A posted GRN is immutable and cannot be modified.' using errcode = '27000';
  end if;

  return new;
end;
$$;

-- 3. Update post_goods_receipt function to handle independent & unplanned items and accurate PO completion
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
            and (
              gri.purchase_order_item_id = poi.id
              or (gri.purchase_order_item_id is null and gri.ingredient_id = poi.ingredient_id)
            )
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

