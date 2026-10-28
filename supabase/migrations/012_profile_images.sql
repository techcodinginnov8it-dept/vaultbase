-- Private profile pictures stored outside the profiles table.
alter table public.profiles add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read their profile image" on storage.objects;
create policy "Users can read their profile image"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload their profile image" on storage.objects;
create policy "Users can upload their profile image"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can update their profile image" on storage.objects;
create policy "Users can update their profile image"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete their profile image" on storage.objects;
create policy "Users can delete their profile image"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
