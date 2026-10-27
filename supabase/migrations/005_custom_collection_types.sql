-- Allow users to provide a custom collection type from the application.
alter table public.collections
  drop constraint if exists collections_collection_type_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'collections_collection_type_check'
      and conrelid = 'public.collections'::regclass
  ) then
    alter table public.collections
      add constraint collections_collection_type_check
      check (char_length(trim(collection_type)) between 1 and 50);
  end if;
end $$;
