-- Encrypted credentials for user-owned items.
-- The application stores ciphertext only; the vault passphrase never reaches the database.

create table if not exists public.item_credentials (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.items(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  encrypted_payload text not null,
  salt text not null,
  iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists item_credentials_owner_id_idx on public.item_credentials(owner_id);

alter table public.item_credentials enable row level security;

create policy "Users can manage their item credentials"
  on public.item_credentials for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on table public.item_credentials to authenticated;
revoke all on table public.item_credentials from anon;

drop trigger if exists item_credentials_set_updated_at on public.item_credentials;
create trigger item_credentials_set_updated_at before update on public.item_credentials
for each row execute function public.set_updated_at();
