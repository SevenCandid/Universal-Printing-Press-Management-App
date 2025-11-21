-- Create rental_inventory table
create table if not exists public.rental_inventory (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  item_name text not null,
  total integer not null default 0,
  working integer not null default 0,
  faulty integer not null default 0,
  inactive integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Basic data integrity
  constraint rental_inventory_total_non_negative check (total >= 0),
  constraint rental_inventory_working_non_negative check (working >= 0),
  constraint rental_inventory_faulty_non_negative check (faulty >= 0),
  constraint rental_inventory_inactive_non_negative check (inactive >= 0),
  constraint rental_inventory_status_totals_valid
    check (working + faulty + inactive <= total)
);

comment on table public.rental_inventory is
  'Inventory of rental items, including status breakdown (working, faulty, inactive).';

comment on column public.rental_inventory.category is
  'High-level category of the rental item (e.g. "Printers", "Binding Machines").';

comment on column public.rental_inventory.item_name is
  'Specific item name/identifier.';

-- Keep updated_at in sync
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rental_inventory_updated_at on public.rental_inventory;

create trigger set_rental_inventory_updated_at
before update on public.rental_inventory
for each row
execute procedure public.set_updated_at_timestamp();

-- Enable Row Level Security
alter table public.rental_inventory enable row level security;

-- Optional: index to speed up common queries
create index if not exists rental_inventory_category_idx
  on public.rental_inventory (category, item_name);

--------------------------------------------------------------------------------
-- RLS POLICIES
--
-- Assumptions:
-- 1. All real users authenticate via Supabase Auth and receive the "authenticated"
--    Postgres role.
-- 2. A custom JWT claim "role" is set on the access token
--    (e.g. user.app_metadata.role in Supabase Auth),
--    with values like 'ceo', 'manager', 'staff', etc.
-- 3. CEO users have role = 'ceo'. All other authenticated users have some other role.
--
-- This configuration enforces:
--   - Only authenticated users can read/write.
--   - CEO users have full read/write/delete access.
--   - Non-CEO authenticated users are read-only.
--------------------------------------------------------------------------------

-- Helper expression for CEO role
-- (Uses JWT custom claim: auth.jwt()->>'role')

-- Read access for all authenticated users
drop policy if exists "rental_inventory_authenticated_read" on public.rental_inventory;
create policy "rental_inventory_authenticated_read"
on public.rental_inventory
for select
to authenticated
using (true);

-- CEO full access (insert, update, delete)
drop policy if exists "rental_inventory_ceo_full_access" on public.rental_inventory;
create policy "rental_inventory_ceo_full_access"
on public.rental_inventory
for all
to authenticated
using (auth.jwt()->>'role' = 'ceo')
with check (auth.jwt()->>'role' = 'ceo');

-- Optional: explicitly prevent anon access by not defining any policies for "anon"
-- and ensuring no legacy broad policies exist.

-- Recommended grants - rely on RLS for row-level enforcement
revoke all on public.rental_inventory from public;
revoke all on public.rental_inventory from anon;
grant select, insert, update, delete on public.rental_inventory to authenticated;










