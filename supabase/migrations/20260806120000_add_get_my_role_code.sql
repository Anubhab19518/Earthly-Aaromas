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
