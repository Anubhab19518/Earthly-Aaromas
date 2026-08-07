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
