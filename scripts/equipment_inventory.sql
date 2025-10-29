create table public.equipment_inventory (
  id uuid not null default gen_random_uuid (),
  name text not null,
  category text not null,
  brand text null,
  model text null,
  status text null default 'Working'::text,
  serial_number text null,
  location text null,
  purchase_date date null,
  vendor_id uuid null,
  remarks text null,
  created_at timestamp with time zone null default now(),
  model_number text null,
  constraint equipment_inventory_pkey primary key (id),
  constraint equipment_inventory_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete set null,
  constraint equipment_inventory_status_check check (
    (
      status = any (
        array[
          'Working'::text,
          'Maintenance'::text,
          'Faulty'::text,
          'Inactive'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;