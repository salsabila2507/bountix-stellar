-- Add privy_did column for Privy auth integration
-- Privy users don't have Supabase Auth accounts, so we use privy_did
-- to link profiles to Privy user identities.

alter table public.profiles
  add column if not exists privy_did text unique;

create index if not exists profiles_privy_did_idx on public.profiles (privy_did);

-- Make id auto-generated for new Privy-only signups
-- (existing profiles with id from auth.users remain intact)
alter table public.profiles
  alter column id set default gen_random_uuid();
