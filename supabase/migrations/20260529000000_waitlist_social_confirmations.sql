-- Add social confirmation columns to the existing waitlist table.
-- These track self-reported confirmations (not API-verified).
-- Run this in Supabase SQL Editor or via supabase db push.

alter table public.waitlist
  add column if not exists joined_telegram boolean not null default false,
  add column if not exists followed_x boolean not null default false,
  add column if not exists reposted_announcement boolean not null default false,
  add column if not exists commented_announcement boolean not null default false;

comment on column public.waitlist.joined_telegram is 'Self-confirmed: joined Bountix Telegram group';
comment on column public.waitlist.followed_x is 'Self-confirmed: followed @Bountixofc on X';
comment on column public.waitlist.reposted_announcement is 'Self-confirmed: reposted official waitlist announcement';
comment on column public.waitlist.commented_announcement is 'Self-confirmed: commented on official waitlist announcement';
