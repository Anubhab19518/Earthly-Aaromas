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
