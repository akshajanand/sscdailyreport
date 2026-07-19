-- Supabase Schema for SSC WhatsApp-style Daily Study Reports
-- Run the following script in your Supabase SQL Editor:

-- 1. Create the ssc_reports table
create table if not exists public.ssc_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  student_name text not null,
  role text default 'student' not null,
  subject text default 'Social Science' not null,
  topic_covered text not null,
  study_duration text not null,
  message_text text not null,
  photo_url text,
  reactions jsonb default '{}'::jsonb
);

-- 2. Create the ssc_students table to authorize student names
create table if not exists public.ssc_students (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text unique not null,
  password text default 'gurukul' not null
);

-- If the table already exists, run this to add the password column safely:
-- alter table public.ssc_students add column if not exists password text default 'gurukul' not null;

-- Enable Row Level Security (RLS)
alter table public.ssc_reports enable row level security;
alter table public.ssc_students enable row level security;

-- Drop existing policies first to prevent "policy already exists" errors when re-running
drop policy if exists "Allow all public reads" on public.ssc_reports;
drop policy if exists "Allow all public inserts" on public.ssc_reports;
drop policy if exists "Allow all public updates (for reactions)" on public.ssc_reports;
drop policy if exists "Allow all public deletes on reports" on public.ssc_reports;

drop policy if exists "Allow all public reads on students" on public.ssc_students;
drop policy if exists "Allow all public inserts on students" on public.ssc_students;
drop policy if exists "Allow all public deletes on students" on public.ssc_students;
drop policy if exists "Allow all public updates on students" on public.ssc_students;

-- Create ultra-simple permissive policies for the school class setting
create policy "Allow all public reads"
  on public.ssc_reports for select to public using (true);

create policy "Allow all public inserts"
  on public.ssc_reports for insert to public with check (true);

create policy "Allow all public updates (for reactions)"
  on public.ssc_reports for update to public using (true);

create policy "Allow all public deletes on reports"
  on public.ssc_reports for delete to public using (true);

create policy "Allow all public reads on students"
  on public.ssc_students for select to public using (true);

create policy "Allow all public inserts on students"
  on public.ssc_students for insert to public with check (true);

create policy "Allow all public deletes on students"
  on public.ssc_students for delete to public using (true);

create policy "Allow all public updates on students"
  on public.ssc_students for update to public using (true);

-- Seed some initial students so the class roster has sample records
insert into public.ssc_students (name) values 
  ('Rohan Verma'), 
  ('Ananya Sen'), 
  ('Aarav Gupta'), 
  ('Siddharth Rao')
on conflict (name) do nothing;

-- 3. Create the ssc_messages table to store separated real-time chats
create table if not exists public.ssc_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sender_name text not null,
  sender_role text not null, -- 'student' | 'teacher'
  recipient text not null, -- 'Ashish Sir', student_name, or group chat name
  message_text text not null,
  photo_url text -- optional attached photo/notes base64
);

-- Enable Row Level Security (RLS) for ssc_messages
alter table public.ssc_messages enable row level security;

-- Drop existing policies first
drop policy if exists "Allow all public reads on messages" on public.ssc_messages;
drop policy if exists "Allow all public inserts on messages" on public.ssc_messages;
drop policy if exists "Allow all public deletes on messages" on public.ssc_messages;

-- Create permissive RLS policies for ssc_messages
create policy "Allow all public reads on messages"
  on public.ssc_messages for select to public using (true);

create policy "Allow all public inserts on messages"
  on public.ssc_messages for insert to public with check (true);

create policy "Allow all public deletes on messages"
  on public.ssc_messages for delete to public using (true);


-- 4. Create the ssc_channels table for dynamic workspace channels
create table if not exists public.ssc_channels (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text unique not null,
  is_global boolean default true not null,
  allowed_students text[] -- array of student names allowed if not global
);

-- Enable Row Level Security (RLS) for ssc_channels
alter table public.ssc_channels enable row level security;

-- Drop existing policies first
drop policy if exists "Allow all public reads on channels" on public.ssc_channels;
drop policy if exists "Allow all public inserts on channels" on public.ssc_channels;
drop policy if exists "Allow all public deletes on channels" on public.ssc_channels;

-- Create permissive RLS policies for ssc_channels
create policy "Allow all public reads on channels"
  on public.ssc_channels for select to public using (true);

create policy "Allow all public inserts on channels"
  on public.ssc_channels for insert to public with check (true);

create policy "Allow all public deletes on channels"
  on public.ssc_channels for delete to public using (true);

-- Prepopulate default global channels
insert into public.ssc_channels (name, is_global)
values 
  ('Ask Doubts Get Them Solved From Peers', true),
  ('Share Notes To Everyone', true)
on conflict (name) do nothing;

-- Enable Real-time Replication safely for all tables
do $$
begin
  -- Check if ssc_reports is already in the publication, if not, add it
  if not exists (
    select 1 
    from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'ssc_reports'
  ) then
    alter publication supabase_realtime add table public.ssc_reports;
  end if;

  -- Check if ssc_students is already in the publication, if not, add it
  if not exists (
    select 1 
    from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'ssc_students'
  ) then
    alter publication supabase_realtime add table public.ssc_students;
  end if;

  -- Check if ssc_messages is already in the publication, if not, add it
  if not exists (
    select 1 
    from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'ssc_messages'
  ) then
    alter publication supabase_realtime add table public.ssc_messages;
  end if;

  -- Check if ssc_channels is already in the publication, if not, add it
  if not exists (
    select 1 
    from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'ssc_channels'
  ) then
    alter publication supabase_realtime add table public.ssc_channels;
  end if;
end;
$$;

