-- Hybrid item-type model.
-- Keep items.structured_data for backward compatibility while normalized
-- definitions and values are introduced gradually.

create table if not exists public.item_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  type_key text not null,
  label text not null check (char_length(trim(label)) between 1 and 100),
  description text,
  icon text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_system and owner_id is null) or (not is_system and owner_id is not null))
);

create unique index if not exists item_types_system_key_idx
  on public.item_types(type_key) where is_system;
create unique index if not exists item_types_owner_key_idx
  on public.item_types(owner_id, type_key) where not is_system;

create table if not exists public.item_field_definitions (
  id uuid primary key default gen_random_uuid(),
  item_type_id uuid not null references public.item_types(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  label text not null check (char_length(trim(label)) between 1 and 100),
  field_type text not null check (field_type in ('text', 'email', 'url', 'number', 'date', 'checkbox')),
  position integer not null default 0 check (position >= 0),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_system and owner_id is null) or (not is_system and owner_id is not null))
);

create unique index if not exists item_field_definitions_system_key_idx
  on public.item_field_definitions(item_type_id, field_key) where is_system;
create unique index if not exists item_field_definitions_owner_key_idx
  on public.item_field_definitions(item_type_id, owner_id, field_key) where not is_system;

create table if not exists public.item_field_values (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  field_definition_id uuid not null references public.item_field_definitions(id) on delete cascade,
  value_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, field_definition_id)
);

alter table public.items add column if not exists item_type_id uuid references public.item_types(id) on delete set null;

create index if not exists item_types_owner_id_idx on public.item_types(owner_id);
create index if not exists item_field_definitions_type_idx on public.item_field_definitions(item_type_id, position);
create index if not exists item_field_values_item_idx on public.item_field_values(item_id);
create index if not exists item_field_values_owner_idx on public.item_field_values(owner_id);

alter table public.item_types enable row level security;
alter table public.item_field_definitions enable row level security;
alter table public.item_field_values enable row level security;

drop policy if exists "Users can read system and own item types" on public.item_types;
create policy "Users can read system and own item types"
  on public.item_types for select to authenticated
  using (is_system or owner_id = auth.uid());

drop policy if exists "Users can manage their item types" on public.item_types;
create policy "Users can manage their item types"
  on public.item_types for all to authenticated
  using (owner_id = auth.uid() and not is_system)
  with check (owner_id = auth.uid() and not is_system);

drop policy if exists "Users can read system and own field definitions" on public.item_field_definitions;
create policy "Users can read system and own field definitions"
  on public.item_field_definitions for select to authenticated
  using (is_system or owner_id = auth.uid());

drop policy if exists "Users can manage their field definitions" on public.item_field_definitions;
create policy "Users can manage their field definitions"
  on public.item_field_definitions for all to authenticated
  using (owner_id = auth.uid() and not is_system)
  with check (owner_id = auth.uid() and not is_system);

drop policy if exists "Users can manage their item field values" on public.item_field_values;
create policy "Users can manage their item field values"
  on public.item_field_values for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on table public.item_types, public.item_field_definitions, public.item_field_values to authenticated;
revoke all on table public.item_types, public.item_field_definitions, public.item_field_values from anon;

create or replace function public.validate_item_field_value_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.items where id = new.item_id and owner_id = new.owner_id
  ) then
    raise exception 'Item field value does not belong to the row owner';
  end if;
  if not exists (
    select 1
    from public.item_field_definitions definitions
    where definitions.id = new.field_definition_id
      and (definitions.is_system or definitions.owner_id = new.owner_id)
  ) then
    raise exception 'Item field definition does not belong to the row owner';
  end if;
  if exists (
    select 1
    from public.items items
    join public.item_field_definitions definitions on definitions.id = new.field_definition_id
    where items.id = new.item_id
      and items.item_type_id is not null
      and definitions.item_type_id <> items.item_type_id
  ) then
    raise exception 'Item field definition does not match the item type';
  end if;
  return new;
end;
$$;

drop trigger if exists item_field_values_validate_owner on public.item_field_values;
create trigger item_field_values_validate_owner
before insert or update of item_id, owner_id on public.item_field_values
for each row execute function public.validate_item_field_value_owner();

create or replace function public.validate_item_field_definition_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.item_types types
    where types.id = new.item_type_id
      and (types.is_system or types.owner_id = new.owner_id)
  ) then
    raise exception 'Item field definition type does not belong to the row owner';
  end if;
  return new;
end;
$$;

drop trigger if exists item_field_definitions_validate_owner on public.item_field_definitions;
create trigger item_field_definitions_validate_owner
before insert or update of item_type_id, owner_id on public.item_field_definitions
for each row execute function public.validate_item_field_definition_owner();

drop trigger if exists item_types_set_updated_at on public.item_types;
create trigger item_types_set_updated_at before update on public.item_types
for each row execute function public.set_updated_at();

drop trigger if exists item_field_definitions_set_updated_at on public.item_field_definitions;
create trigger item_field_definitions_set_updated_at before update on public.item_field_definitions
for each row execute function public.set_updated_at();

drop trigger if exists item_field_values_set_updated_at on public.item_field_values;
create trigger item_field_values_set_updated_at before update on public.item_field_values
for each row execute function public.set_updated_at();

-- System types are shared by all authenticated users. The existing item_type
-- values remain the compatibility key used by the current UI.
insert into public.item_types (type_key, label, description, icon, is_system)
values
  ('contact', 'Contact', 'People and contact details', 'contact', true),
  ('account', 'Account', 'Login and account information', 'account', true),
  ('project', 'Project', 'Projects and workspaces', 'project', true),
  ('bookmark', 'Bookmark', 'Saved websites and references', 'bookmark', true),
  ('note', 'Note', 'Notes and reminders', 'note', true),
  ('document', 'Document', 'Documents and records', 'document', true),
  ('task', 'Task', 'Tasks and to-dos', 'task', true),
  ('event', 'Event', 'Dates and appointments', 'event', true),
  ('subscription', 'Subscription', 'Subscriptions and renewals', 'subscription', true),
  ('vendor', 'Vendor', 'Vendors and providers', 'vendor', true)
on conflict (type_key) where is_system do update
set label = excluded.label, description = excluded.description, icon = excluded.icon;

insert into public.item_field_definitions (item_type_id, field_key, label, field_type, position, is_system)
select types.id, fields.field_key, fields.label, fields.field_type, fields.position, true
from public.item_types types
cross join (values
  ('account', 'service-name', 'Service name', 'text', 0),
  ('account', 'login-url', 'Login URL', 'url', 1),
  ('account', 'recovery-email', 'Recovery email', 'email', 2),
  ('account', 'recovery-phone', 'Recovery phone', 'text', 3),
  ('account', 'two-factor-authentication', 'Two-factor authentication', 'checkbox', 4),
  ('contact', 'full-name', 'Full name', 'text', 0),
  ('contact', 'email', 'Email', 'email', 1),
  ('contact', 'phone', 'Phone', 'text', 2),
  ('contact', 'company', 'Company', 'text', 3),
  ('contact', 'job-title', 'Job title', 'text', 4),
  ('project', 'status', 'Status', 'text', 0),
  ('project', 'owner-or-team', 'Owner or team', 'text', 1),
  ('project', 'target-deadline', 'Target deadline', 'date', 2),
  ('project', 'repository-url', 'Repository URL', 'url', 3),
  ('project', 'documentation-url', 'Documentation URL', 'url', 4),
  ('bookmark', 'website-title', 'Website title', 'text', 0),
  ('bookmark', 'source-or-site', 'Source or site', 'text', 1),
  ('bookmark', 'summary', 'Summary', 'text', 2),
  ('note', 'topic', 'Topic', 'text', 0),
  ('note', 'reminder-date', 'Reminder date', 'date', 1),
  ('document', 'document-number', 'Document number', 'text', 0),
  ('document', 'document-date', 'Document date', 'date', 1),
  ('document', 'owner-or-issuer', 'Owner or issuer', 'text', 2),
  ('task', 'status', 'Status', 'text', 0),
  ('task', 'priority', 'Priority', 'text', 1),
  ('task', 'due-date', 'Due date', 'date', 2),
  ('task', 'owner', 'Owner', 'text', 3),
  ('event', 'event-date', 'Event date', 'date', 0),
  ('event', 'location', 'Location', 'text', 1),
  ('event', 'organizer', 'Organizer', 'text', 2),
  ('subscription', 'provider', 'Provider', 'text', 0),
  ('subscription', 'plan', 'Plan', 'text', 1),
  ('subscription', 'renewal-date', 'Renewal date', 'date', 2),
  ('subscription', 'cost', 'Cost', 'number', 3),
  ('vendor', 'company-name', 'Company name', 'text', 0),
  ('vendor', 'contact-email', 'Contact email', 'email', 1),
  ('vendor', 'contact-phone', 'Contact phone', 'text', 2),
  ('vendor', 'contract-renewal', 'Contract renewal', 'date', 3)
) as fields(type_key, field_key, label, field_type, position)
where types.type_key = fields.type_key and types.is_system
on conflict (item_type_id, field_key) where is_system do update
set label = excluded.label, field_type = excluded.field_type, position = excluded.position;
