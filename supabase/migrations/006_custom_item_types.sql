-- Allow custom item labels when the item type is set to custom.
alter table public.items
  add column if not exists custom_type text;

alter table public.items
  drop constraint if exists items_custom_type_check;

alter table public.items
  add constraint items_custom_type_check
  check (custom_type is null or (item_type = 'custom' and char_length(trim(custom_type)) between 1 and 100));
