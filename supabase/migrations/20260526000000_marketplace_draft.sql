-- Bountix marketplace schema draft.
-- Draft only: do not apply until auth, ownership, moderation, and payment flows
-- are finalized. Existing public.waitlist is intentionally untouched.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  display_name text not null,
  handle text unique,
  role text not null check (role in ('client', 'creator', 'both')),
  headline text,
  bio text,
  specialties text[] default '{}',
  reputation_score integer not null default 0,
  completed_tasks integer not null default 0,
  approval_rate numeric(5, 2),
  telegram_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  brief text not null,
  category text,
  budget_amount numeric(12, 2),
  budget_currency text not null default 'USD',
  payment_type text not null check (payment_type in ('regular', 'escrow')),
  status text not null default 'open'
    check (status in ('draft', 'open', 'reviewing', 'in_progress', 'submitted', 'completed', 'cancelled')),
  negotiable boolean not null default true,
  escrow_note text default 'Funds will be locked before work starts and released after approval.',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_applications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  applicant_profile_id uuid not null references public.profiles(id) on delete cascade,
  proposed_amount numeric(12, 2),
  proposed_currency text not null default 'USD',
  proposal text not null,
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (task_id, applicant_profile_id)
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  application_id uuid references public.task_applications(id) on delete set null,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  delivery_url text,
  notes text,
  status text not null default 'submitted'
    check (status in ('submitted', 'needs_changes', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text,
  starting_amount numeric(12, 2),
  starting_currency text not null default 'USD',
  delivery_time text,
  payment_type text not null default 'regular' check (payment_type in ('regular', 'escrow')),
  negotiable boolean not null default true,
  status text not null default 'published'
    check (status in ('draft', 'published', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_inquiries (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  client_profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  requested_amount numeric(12, 2),
  requested_currency text not null default 'USD',
  status text not null default 'open'
    check (status in ('open', 'negotiating', 'converted', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_profile_id uuid not null references public.profiles(id) on delete cascade,
  creator_profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2),
  currency text not null default 'USD',
  payment_type text not null check (payment_type in ('regular', 'escrow')),
  status text not null default 'negotiating'
    check (status in ('negotiating', 'active', 'submitted', 'approved', 'completed', 'cancelled', 'disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (task_id is not null or service_id is not null)
);

create table if not exists public.deal_negotiations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  proposed_amount numeric(12, 2),
  proposed_currency text not null default 'USD',
  message text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected', 'superseded')),
  created_at timestamptz not null default now()
);

create table if not exists public.escrow_records (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  status text not null default 'placeholder'
    check (status in ('placeholder', 'pending_funding', 'funded', 'released', 'refunded', 'disputed')),
  escrow_provider text default 'future_smart_contract',
  contract_address text,
  transaction_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  service_inquiry_id uuid references public.service_inquiries(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (deal_id is not null or service_inquiry_id is not null)
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_applications enable row level security;
alter table public.task_submissions enable row level security;
alter table public.services enable row level security;
alter table public.service_inquiries enable row level security;
alter table public.deals enable row level security;
alter table public.deal_negotiations enable row level security;
alter table public.escrow_records enable row level security;
alter table public.messages enable row level security;

-- RLS draft. Replace auth.uid() ownership checks after auth is implemented.

create policy "Public profiles are readable"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Public open tasks are readable"
on public.tasks for select
to anon, authenticated
using (status in ('open', 'reviewing', 'in_progress', 'submitted', 'completed'));

create policy "Published services are readable"
on public.services for select
to anon, authenticated
using (status = 'published');

create policy "Authenticated users can create profiles"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Profile owners can update profiles"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- The policies below depend on a final auth ownership model.
-- Keep them restrictive until profile ownership helpers are implemented.

create policy "Authenticated users can draft tasks"
on public.tasks for insert
to authenticated
with check (false);

create policy "Authenticated users can create services"
on public.services for insert
to authenticated
with check (false);

create policy "Authenticated users can apply to tasks"
on public.task_applications for insert
to authenticated
with check (false);

create policy "Authenticated users can create service inquiries"
on public.service_inquiries for insert
to authenticated
with check (false);

create policy "Deal participants can read deals"
on public.deals for select
to authenticated
using (false);

create policy "Deal participants can read negotiations"
on public.deal_negotiations for select
to authenticated
using (false);

create policy "Deal participants can read escrow records"
on public.escrow_records for select
to authenticated
using (false);

create policy "Message participants can read messages"
on public.messages for select
to authenticated
using (false);
