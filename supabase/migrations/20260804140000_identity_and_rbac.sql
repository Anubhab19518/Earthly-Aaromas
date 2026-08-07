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
