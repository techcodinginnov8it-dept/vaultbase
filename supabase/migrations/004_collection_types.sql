-- Add a lightweight category to help users identify and filter collections.
alter table public.collections
  add column if not exists collection_type text not null default 'general';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collections_collection_type_check'
      and conrelid = 'public.collections'::regclass
  ) then
    alter table public.collections
      add constraint collections_collection_type_check
      check (collection_type in ('general', 'work', 'personal', 'finance', 'projects', 'bookmarks'));
  end if;
end $$;
