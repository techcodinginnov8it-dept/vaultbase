-- Optional private images for user-owned collections.
alter table public.collections
  add column if not exists cover_path text;

insert into storage.buckets (id, name, public)
values ('collection-images', 'collection-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read their collection images" on storage.objects;
create policy "Users can read their collection images"
  on storage.objects for select to authenticated
  using (bucket_id = 'collection-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload their collection images" on storage.objects;
create policy "Users can upload their collection images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'collection-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can update their collection images" on storage.objects;
create policy "Users can update their collection images"
  on storage.objects for update to authenticated
  using (bucket_id = 'collection-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'collection-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete their collection images" on storage.objects;
create policy "Users can delete their collection images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'collection-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
