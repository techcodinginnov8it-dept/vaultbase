-- Private file attachments for user-owned items.
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create index if not exists attachments_item_id_idx on public.attachments(item_id);
create index if not exists attachments_owner_id_idx on public.attachments(owner_id);
alter table public.attachments enable row level security;

create policy "Users can manage their attachments"
  on public.attachments for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on table public.attachments to authenticated;
revoke all on table public.attachments from anon;

insert into storage.buckets (id, name, public)
values ('item-attachments', 'item-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read their item attachment files" on storage.objects;
create policy "Users can read their item attachment files" on storage.objects for select to authenticated
using (bucket_id = 'item-attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload their item attachment files" on storage.objects;
create policy "Users can upload their item attachment files" on storage.objects for insert to authenticated
with check (bucket_id = 'item-attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can update their item attachment files" on storage.objects;
create policy "Users can update their item attachment files" on storage.objects for update to authenticated
using (bucket_id = 'item-attachments' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'item-attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete their item attachment files" on storage.objects;
create policy "Users can delete their item attachment files" on storage.objects for delete to authenticated
using (bucket_id = 'item-attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));
