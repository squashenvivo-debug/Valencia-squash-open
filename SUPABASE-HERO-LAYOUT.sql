-- Ejecuta este archivo una vez en el SQL Editor de Supabase.
create table if not exists public.hero_layouts (
  id integer primary key check (id = 1),
  positions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.hero_layouts enable row level security;

drop policy if exists "hero layouts are public" on public.hero_layouts;
create policy "hero layouts are public" on public.hero_layouts
  for select using (true);

drop policy if exists "authenticated users manage hero layouts" on public.hero_layouts;
create policy "authenticated users manage hero layouts" on public.hero_layouts
  for all to authenticated using (true) with check (true);
