alter table public.profiles
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  add column if not exists skills text[] not null default '{}',
  add column if not exists wallet_address text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en', 'id', 'zh')),
  add column if not exists is_early_contributor boolean not null default false,
  add column if not exists referral_code text,
  add column if not exists headline text;
