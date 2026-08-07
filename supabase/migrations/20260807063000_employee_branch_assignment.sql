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
