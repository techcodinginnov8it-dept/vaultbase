-- Keep related user-owned rows attached to records owned by the same user.
-- These triggers protect direct Data API writes in addition to application checks.

-- Repair the custom-type constraints for databases where migrations 005/006
-- were already applied before their rerunnable definitions were improved.
alter table public.collections
  drop constraint if exists collections_collection_type_check;
alter table public.collections
  add constraint collections_collection_type_check
  check (char_length(trim(collection_type)) between 1 and 50);

alter table public.items
  drop constraint if exists items_custom_type_check;
update public.items
set custom_type = null
where item_type <> 'custom' and custom_type is not null;
alter table public.items
  add constraint items_custom_type_check
  check (custom_type is null or (item_type = 'custom' and char_length(trim(custom_type)) between 1 and 100));

create or replace function public.validate_item_collection_owner()
returns trigger
language plpgsql
as $$
begin
  if new.collection_id is not null and not exists (
    select 1 from public.collections
    where id = new.collection_id and owner_id = new.owner_id
  ) then
    raise exception 'Collection does not belong to the item owner';
  end if;
  return new;
end;
$$;

drop trigger if exists items_validate_collection_owner on public.items;
create trigger items_validate_collection_owner
before insert or update of collection_id, owner_id on public.items
for each row execute function public.validate_item_collection_owner();

create or replace function public.validate_item_child_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.items
    where id = new.item_id and owner_id = new.owner_id
  ) then
    raise exception 'Related item does not belong to the row owner';
  end if;
  return new;
end;
$$;

drop trigger if exists item_links_validate_owner on public.item_links;
create trigger item_links_validate_owner
before insert or update of item_id, owner_id on public.item_links
for each row execute function public.validate_item_child_owner();

drop trigger if exists item_credentials_validate_owner on public.item_credentials;
create trigger item_credentials_validate_owner
before insert or update of item_id, owner_id on public.item_credentials
for each row execute function public.validate_item_child_owner();

drop trigger if exists attachments_validate_owner on public.attachments;
create trigger attachments_validate_owner
before insert or update of item_id, owner_id on public.attachments
for each row execute function public.validate_item_child_owner();

create or replace function public.validate_item_tag_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.items
    where id = new.item_id and owner_id = new.owner_id
  ) or not exists (
    select 1 from public.tags
    where id = new.tag_id and owner_id = new.owner_id
  ) then
    raise exception 'Item and tag must belong to the row owner';
  end if;
  return new;
end;
$$;

drop trigger if exists item_tags_validate_owner on public.item_tags;
create trigger item_tags_validate_owner
before insert or update of item_id, tag_id, owner_id on public.item_tags
for each row execute function public.validate_item_tag_owner();
