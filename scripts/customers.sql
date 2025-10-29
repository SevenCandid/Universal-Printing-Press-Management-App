create table public.customers (
  id uuid not null default gen_random_uuid (),
  full_name text not null,
  email text null,
  phone text null,
  company text null,
  notes text null,
  category text null default 'other'::text,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint customers_pkey primary key (id),
  constraint customers_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint customers_category_check check (
    (
      category = any (array['top'::text, 'other'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_customers_category on public.customers using btree (category) TABLESPACE pg_default;

create index IF not exists idx_customers_created_at on public.customers using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_customers_full_name on public.customers using btree (full_name) TABLESPACE pg_default;

create trigger update_customers_timestamp BEFORE
update on customers for EACH row
execute FUNCTION update_customers_updated_at ();