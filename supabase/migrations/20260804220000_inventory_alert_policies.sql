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
