alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  alter column id set default gen_random_uuid(),
  alter column username drop not null,
  add column if not exists privy_did text unique;

create index if not exists profiles_privy_did_idx on public.profiles (privy_did);
