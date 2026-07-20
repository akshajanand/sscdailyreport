-- Supabase Schema for SSC WhatsApp-style Daily Study Reports (SECURED VERSION)
-- Run the following script in your Supabase SQL Editor:

-- Drop existing tables to clear any spam records and start fresh
drop table if exists public.ssc_messages cascade;
drop table if exists public.ssc_reports cascade;
drop table if exists public.ssc_channels cascade;
drop table if exists public.ssc_students cascade;

-- Drop secure RPC functions if they exist (to clean up)
drop function if exists public.verify_student_login;
drop function if exists public.submit_report_secure;
drop function if exists public.send_message_secure;
drop function if exists public.add_student_secure;
drop function if exists public.delete_student_secure;
drop function if exists public.create_channel_secure;
drop function if exists public.delete_channel_secure;
drop function if exists public.delete_item_secure;
drop function if exists public.update_student_password_secure;

-- 1. Create the ssc_students table to authorize student names and passwords securely
create table public.ssc_students (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text unique not null,
  password text default 'gurukul' not null
);

-- 2. Create the ssc_reports table for formal study logs
create table public.ssc_reports (
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

-- 3. Create the ssc_messages table to store separated real-time chats
create table public.ssc_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sender_name text not null,
  sender_role text not null, -- 'student' | 'teacher'
  recipient text not null, -- 'Ashish Sir', student_name, or group chat name
  message_text text not null,
  photo_url text -- optional attached photo/notes base64
);

-- 4. Create the ssc_channels table for dynamic workspace channels
create table public.ssc_channels (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text unique not null,
  is_global boolean default true not null,
  allowed_students text[] -- array of student names allowed if not global
);

-- COLUMN LEVEL SECURITY:
-- Revoke all select privileges on the password column of ssc_students from the anon/public role.
-- This ensures that standard client-side queries can NEVER download or read student passwords.
revoke all on public.ssc_students from anon, authenticated, public;
grant select (id, created_at, name) on public.ssc_students to anon, authenticated;

-- Enable Row Level Security (RLS) on all tables to prevent direct client modifications
alter table public.ssc_students enable row level security;
alter table public.ssc_reports enable row level security;
alter table public.ssc_messages enable row level security;
alter table public.ssc_channels enable row level security;

-- Define SELECT-only policies (allowing public read access where necessary, but blocking all direct public write access)
create policy "Allow public selects on students" on public.ssc_students for select to public using (true);
create policy "Allow public selects on reports" on public.ssc_reports for select to public using (true);
create policy "Allow public selects on messages" on public.ssc_messages for select to public using (true);
create policy "Allow public selects on channels" on public.ssc_channels for select to public using (true);

-- SECURE RPC MUTATION FUNCTIONS:
-- All functions are marked as "security definer" so they run with superuser privileges,
-- allowing them to modify the tables, while direct client writes (INSERT, UPDATE, DELETE) are strictly blocked by RLS.

-- A. Student login verification (Returns JSON, checks passwords securely inside DB, passwords never leave DB)
create or replace function public.verify_student_login(
  input_name text,
  input_password text
) returns json as $$
declare
  student_rec record;
begin
  select * into student_rec from public.ssc_students where lower(name) = lower(input_name);
  if student_rec is null then
    return json_build_object('success', false, 'message', 'Access Denied: "' || input_name || '" is not registered on the class roster. Only your Social Science Teacher can add you.');
  end if;

  if coalesce(student_rec.password, 'gurukul') = input_password then
    return json_build_object('success', true, 'name', student_rec.name);
  end if;

  return json_build_object('success', false, 'message', 'Incorrect password. The default password for new students is "gurukul".');
end;
$$ language plpgsql security definer;

-- B. Update student password securely
create or replace function public.update_student_password_secure(
  student_name text,
  current_password text,
  new_password text
) returns boolean as $$
declare
  db_pwd text;
begin
  select password into db_pwd from public.ssc_students where lower(name) = lower(student_name);
  if db_pwd is null or coalesce(db_pwd, 'gurukul') <> current_password then
    raise exception 'Current password is incorrect.';
  end if;
  
  if length(new_password) < 4 then
    raise exception 'Password must be at least 4 characters long.';
  end if;

  update public.ssc_students
  set password = new_password
  where lower(name) = lower(student_name);

  return true;
end;
$$ language plpgsql security definer;

-- C. Submit formal study report with password verification
create or replace function public.submit_report_secure(
  student_name text,
  student_password text,
  subject text,
  topic_covered text,
  study_duration text,
  message_text text,
  photo_url text
) returns boolean as $$
declare
  db_pwd text;
begin
  select password into db_pwd from public.ssc_students where lower(name) = lower(student_name);
  if db_pwd is null or coalesce(db_pwd, 'gurukul') <> student_password then
    raise exception 'Unauthorized: Invalid student name or password.';
  end if;

  insert into public.ssc_reports (student_name, subject, topic_covered, study_duration, message_text, photo_url)
  values (student_name, subject, topic_covered, study_duration, message_text, photo_url);

  return true;
end;
$$ language plpgsql security definer;

-- D. Send chat message with identity verification (verifies students via password, teachers via passcode)
create or replace function public.send_message_secure(
  sender_name text,
  student_password text,
  sender_role text,
  recipient text,
  message_text text,
  photo_url text
) returns boolean as $$
declare
  db_pwd text;
begin
  if sender_role = 'student' then
    select password into db_pwd from public.ssc_students where lower(name) = lower(sender_name);
    if db_pwd is null or coalesce(db_pwd, 'gurukul') <> student_password then
      raise exception 'Unauthorized: Invalid student name or password.';
    end if;
  elsif sender_role = 'teacher' then
    if student_password <> '1331' then
      raise exception 'Unauthorized: Incorrect teacher passcode.';
    end if;
  else
    raise exception 'Invalid role.';
  end if;

  insert into public.ssc_messages (sender_name, sender_role, recipient, message_text, photo_url)
  values (sender_name, sender_role, recipient, message_text, photo_url);

  return true;
end;
$$ language plpgsql security definer;

-- E. Add student to roster (Teacher passcode protected)
create or replace function public.add_student_secure(
  teacher_pwd text,
  student_name text
) returns boolean as $$
begin
  if teacher_pwd <> '1331' then
    raise exception 'Unauthorized: Incorrect teacher passcode.';
  end if;

  insert into public.ssc_students (name, password)
  values (student_name, 'gurukul');

  return true;
end;
$$ language plpgsql security definer;

-- F. Delete student from roster (Teacher passcode protected)
create or replace function public.delete_student_secure(
  teacher_pwd text,
  student_id uuid
) returns boolean as $$
begin
  if teacher_pwd <> '1331' then
    raise exception 'Unauthorized: Incorrect teacher passcode.';
  end if;

  delete from public.ssc_students
  where id = student_id;

  return true;
end;
$$ language plpgsql security definer;

-- G. Create discussion channel (Teacher passcode protected)
create or replace function public.create_channel_secure(
  teacher_pwd text,
  channel_name text,
  is_global boolean,
  allowed_students text[]
) returns boolean as $$
begin
  if teacher_pwd <> '1331' then
    raise exception 'Unauthorized: Incorrect teacher passcode.';
  end if;

  insert into public.ssc_channels (name, is_global, allowed_students)
  values (channel_name, is_global, allowed_students);

  return true;
end;
$$ language plpgsql security definer;

-- H. Delete discussion channel (Teacher passcode protected)
create or replace function public.delete_channel_secure(
  teacher_pwd text,
  channel_id uuid
) returns boolean as $$
begin
  if teacher_pwd <> '1331' then
    raise exception 'Unauthorized: Incorrect teacher passcode.';
  end if;

  delete from public.ssc_channels
  where id = channel_id;

  return true;
end;
$$ language plpgsql security definer;

-- I. Delete item report/message (Teacher passcode protected)
create or replace function public.delete_item_secure(
  teacher_pwd text,
  item_id uuid,
  item_type text
) returns boolean as $$
begin
  if teacher_pwd <> '1331' then
    raise exception 'Unauthorized: Incorrect teacher passcode.';
  end if;

  if item_type = 'report' then
    delete from public.ssc_reports
    where id = item_id;
  elsif item_type = 'message' then
    delete from public.ssc_messages
    where id = item_id;
  else
    raise exception 'Invalid item type.';
  end if;

  return true;
end;
$$ language plpgsql security definer;


-- SEED DEFAULT DATA SAFELY:
insert into public.ssc_students (name, password) values 
  ('Rohan Verma', 'gurukul'), 
  ('Ananya Sen', 'gurukul'), 
  ('Aarav Gupta', 'gurukul'), 
  ('Siddharth Rao', 'gurukul')
on conflict (name) do nothing;

insert into public.ssc_channels (name, is_global) values 
  ('Ask Doubts Get Them Solved From Peers', true),
  ('Share Notes To Everyone', true)
on conflict (name) do nothing;


-- ENABLE REAL-TIME REPLICATION SAFELY:
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ssc_reports'
  ) then
    alter publication supabase_realtime add table public.ssc_reports;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ssc_students'
  ) then
    alter publication supabase_realtime add table public.ssc_students;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ssc_messages'
  ) then
    alter publication supabase_realtime add table public.ssc_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ssc_channels'
  ) then
    alter publication supabase_realtime add table public.ssc_channels;
  end if;
end;
$$;
