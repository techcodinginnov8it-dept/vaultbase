-- Preset colors for user-owned collection icons.
alter table public.collections
  add column if not exists color text not null default 'slate';

alter table public.collections
  drop constraint if exists collections_color_check;

alter table public.collections
  add constraint collections_color_check
  check (color in ('slate', 'blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange'));
