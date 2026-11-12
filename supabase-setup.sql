-- Run this once in the Supabase SQL Editor for the project.
-- Create the private Storage bucket "anonymous-doodles" in the Dashboard first:
--   Private, maximum file size 3 MB, allowed MIME type image/png.

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('question', 'drawing')),
  message text,
  drawing_path text,
  created_at timestamptz not null default now(),
  constraint submissions_shape check (
    (kind = 'question'
      and message is not null
      and char_length(btrim(message)) between 1 and 1000
      and drawing_path is null)
    or
    (kind = 'drawing'
      and drawing_path is not null
      and drawing_path ~ '^[a-f0-9-]{36}\.png$'
      and (message is null or char_length(message) <= 240))
  )
);

alter table public.submissions enable row level security;
revoke all on table public.submissions from public, anon, authenticated;
grant usage on schema public to anon;
grant insert (kind, message, drawing_path) on table public.submissions to anon;

drop policy if exists "Anonymous visitors can submit" on public.submissions;
create policy "Anonymous visitors can submit"
  on public.submissions
  for insert
  to anon
  with check (
    (kind = 'question'
      and message is not null
      and char_length(btrim(message)) between 1 and 1000
      and drawing_path is null)
    or
    (kind = 'drawing'
      and drawing_path is not null
      and drawing_path ~ '^[a-f0-9-]{36}\.png$'
      and (message is null or char_length(message) <= 240))
  );

drop policy if exists "Anonymous visitors can upload doodles" on storage.objects;
create policy "Anonymous visitors can upload doodles"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'anonymous-doodles'
    and name ~ '^[a-f0-9-]{36}\.png$'
  );

-- There are intentionally no SELECT, UPDATE, or DELETE grants/policies for anon.
-- Review submissions and drawings from the private Supabase Dashboard only.
