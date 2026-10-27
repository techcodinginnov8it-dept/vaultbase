-- Vaultbase foundation schema.
-- Run this migration in the Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  item_type text not null default 'custom' check (item_type in ('contact', 'account', 'project', 'bookmark', 'custom')),
  description text,
  structured_data jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_links (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Link',
  url text not null check (url ~* '^https?://'),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  color text,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key (item_id, tag_id)
);

create index if not exists collections_owner_id_idx on public.collections(owner_id);
create index if not exists items_owner_updated_idx on public.items(owner_id, updated_at desc);
create index if not exists items_owner_archived_idx on public.items(owner_id, is_archived);
create index if not exists item_links_item_id_idx on public.item_links(item_id);
create index if not exists tags_owner_id_idx on public.tags(owner_id);
create index if not exists item_tags_tag_id_idx on public.item_tags(tag_id);

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.items enable row level security;
alter table public.item_links enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;

create policy "Users can manage their profile"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can manage their collections"
  on public.collections for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can manage their items"
  on public.items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can manage their links"
  on public.item_links for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can manage their tags"
  on public.tags for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can manage their item tags"
  on public.item_tags for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at before update on public.items
for each row execute function public.set_updated_at();
