create table public.attendance (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  check_in timestamp with time zone null,
  check_out timestamp with time zone null,
  status text null,
  latitude double precision null,
  longitude double precision null,
  created_at timestamp with time zone null default now(),
  constraint attendance_pkey primary key (id),
  constraint attendance_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint attendance_status_check check (
    (
      status = any (
        array[
          'checked_in'::text,
          'checked_out'::text,
          'absent'::text,
          'manual'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists attendance_user_idx on public.attendance using btree (user_id) TABLESPACE pg_default;

create index IF not exists attendance_date_idx on public.attendance using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_attendance_user_id on public.attendance using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_attendance_check_in on public.attendance using btree (check_in desc) TABLESPACE pg_default;

create index IF not exists idx_attendance_status on public.attendance using btree (status) TABLESPACE pg_default;