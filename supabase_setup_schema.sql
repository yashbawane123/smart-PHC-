-- =====================================================================
-- SMART PHC TRACKER — SUPABASE PRODUCTION SQL SCHEMA & RPC MIGRATION
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com)
-- =====================================================================

-- 1. Create PHC & Profiles Tables
create table if not exists phcs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phc_id uuid not null references phcs(id),
  role text not null default 'worker' check (role in ('admin','worker')),
  full_name text,
  preferred_language text not null default 'hi' check (preferred_language in ('hi','mr','en')),
  created_at timestamptz not null default now()
);

-- 2. Setup Data Tables
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_hi text not null, name_mr text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  phc_id uuid not null references phcs(id) on delete cascade,
  name_en text not null, name_hi text, name_mr text,
  photo_url text not null,
  unit text not null check (unit in ('tablet','strip','bottle','ml','vial','sachet')),
  threshold int not null default 0 check (threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  phc_id uuid not null references phcs(id) on delete cascade,
  full_name text not null,
  photo_url text not null,
  department_id uuid references departments(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Module Tables
create table if not exists medicine_stock (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null unique references medicines(id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  expiry_date date,
  updated_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  change int not null,
  reason text not null check (reason in ('restock','dispense','adjustment','expired')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists patient_footfall (
  id uuid primary key default gen_random_uuid(),
  phc_id uuid not null references phcs(id) on delete cascade,
  department_id uuid not null references departments(id),
  visit_date date not null default current_date,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  unique (department_id, visit_date)
);

create table if not exists doctor_attendance (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  attendance_date date not null default current_date,
  session text not null default 'full_day' check (session in ('full_day','morning','evening')),
  status text not null check (status in ('present','absent')),
  marked_by uuid references profiles(id),
  marked_at timestamptz not null default now(),
  unique (doctor_id, attendance_date, session)
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  phc_id uuid not null references phcs(id) on delete cascade,
  type text not null check (type in ('low_stock','expiring_soon')),
  medicine_id uuid references medicines(id) on delete cascade,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  created_at timestamptz not null default now()
);

-- 4. Atomic Counter RPC Functions
create or replace function increment_stock(p_medicine_id uuid, p_delta int, p_reason text, p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare new_qty int;
begin
  insert into medicine_stock (medicine_id, quantity)
  values (p_medicine_id, greatest(p_delta, 0))
  on conflict (medicine_id) do update
    set quantity = greatest(0, medicine_stock.quantity + p_delta), updated_at = now()
  returning quantity into new_qty;
  
  insert into stock_movements (medicine_id, change, reason, created_by)
  values (p_medicine_id, p_delta, p_reason, p_user);
  
  return new_qty;
end $$;

create or replace function increment_footfall(p_department_id uuid, p_phc_id uuid, p_delta int, p_user text)
returns int language plpgsql security definer set search_path = public as $$
declare new_cnt int;
begin
  insert into patient_footfall (department_id, phc_id, count)
  values (p_department_id, p_phc_id, greatest(p_delta, 0))
  on conflict (department_id, visit_date) do update
    set count = greatest(0, patient_footfall.count + p_delta), updated_at = now()
  returning count into new_cnt;
  return new_cnt;
end $$;

-- 5. Low-Stock Status View
create or replace view low_stock_view as
select m.id as medicine_id, m.phc_id, m.name_en, m.photo_url, m.unit, m.threshold,
       coalesce(s.quantity, 0) as quantity, s.expiry_date,
       case
         when coalesce(s.quantity,0) = 0 then 'red'
         when coalesce(s.quantity,0) <= m.threshold then 'yellow'
         when s.expiry_date is not null and s.expiry_date <= current_date + interval '30 days' then 'yellow'
         else 'green'
       end as status
from medicines m left join medicine_stock s on s.medicine_id = m.id
where m.is_active = true;

-- 6. Enable Row Level Security (RLS)
alter table phcs enable row level security;
alter table profiles enable row level security;
alter table medicines enable row level security;
alter table medicine_stock enable row level security;
alter table stock_movements enable row level security;
alter table patient_footfall enable row level security;
alter table doctor_attendance enable row level security;
alter table doctors enable row level security;
alter table departments enable row level security;
alter table alerts enable row level security;

create policy "public_read_medicines" on medicines for select using (true);
create policy "public_read_doctors" on doctors for select using (true);
create policy "public_read_departments" on departments for select using (true);
create policy "public_all_stock" on medicine_stock for all using (true);
create policy "public_all_movements" on stock_movements for all using (true);
create policy "public_all_footfall" on patient_footfall for all using (true);
create policy "public_all_attendance" on doctor_attendance for all using (true);
