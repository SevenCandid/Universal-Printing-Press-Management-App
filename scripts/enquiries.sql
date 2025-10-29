create table public.enquiries (
  id serial not null,
  client_name text null,
  contact_number text null,
  message text null,
  status text null default 'Pending'::text,
  follow_up_date date null,
  created_at timestamp without time zone null default now(),
  converted_to_order boolean null default false,
  whatsapp_number text null,
  constraint enquiries_pkey primary key (id)
) TABLESPACE pg_default;