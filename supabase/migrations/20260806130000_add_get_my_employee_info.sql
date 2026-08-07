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
