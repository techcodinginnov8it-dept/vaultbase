-- Expand predefined item types while keeping custom user-defined types supported.
alter table public.items
  drop constraint if exists items_item_type_check;

alter table public.items
  add constraint items_item_type_check
  check (item_type in (
    'contact',
    'account',
    'project',
    'bookmark',
    'note',
    'document',
    'task',
    'event',
    'subscription',
    'vendor',
    'custom'
  ));
