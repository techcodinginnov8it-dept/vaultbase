-- The Data API needs table privileges in addition to RLS policies.
-- Keep these tables private to signed-in users.

revoke all on table
  public.profiles,
  public.collections,
  public.items,
  public.item_links,
  public.tags,
  public.item_tags
from anon;

grant select, insert, update, delete on table
  public.profiles,
  public.collections,
  public.items,
  public.item_links,
  public.tags,
  public.item_tags
to authenticated;
