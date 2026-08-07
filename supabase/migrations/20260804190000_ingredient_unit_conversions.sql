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
