# Bountix MVP Constraints

**Single source of truth.** Every phase, every PR, every Supabase change
must satisfy these constraints. If a feature can't fit, file it as
post-MVP — don't break the rules.

---

## 1. Supabase Free Tier Budget

Bountix must stay within Supabase Free as long as possible. Free tier
gives us ~500 MB database, ~5 GB egress/month, 50 MB Storage, and 2 GB
bandwidth. These rules keep us well under those limits.

### 1.1 No Storage uploads (MVP)

- **Do NOT use Supabase Storage** for any user-generated content.
- Avatars: store an external URL in `profiles.avatar_url` (text).
- Task/service attachments: store an external URL in `*.delivery_url`
  or `*.external_url` (text). Users link to Notion, Drive, GitHub,
  Figma, X posts, etc.
- Admin content media: external URL field only.
- Reason: storage egress is the fastest way to blow the free tier.

### 1.2 No Realtime (MVP)

- **Do NOT subscribe to Supabase Realtime channels.**
- No live message channels, no presence, no broadcast.
- Messaging tables may exist as plain rows; UIs poll on page load /
  router refresh / server action revalidation only.
- Reason: every active realtime connection counts against concurrent
  connection limits and burns CPU.

### 1.3 No analytics or event log tables

- No `events`, `analytics`, `audit_log`, `pageviews`, etc.
- No per-click tracking inside the DB.
- If we need light analytics later, use Vercel Analytics or a
  third-party tool, not Supabase rows.
- Reason: append-only event tables explode in row count and storage.

### 1.4 Keep schema lightweight

- Prefer `text` and `numeric` over `jsonb`. Use `jsonb` only when truly
  shape-varying.
- No long-form blobs in the DB. If a field needs > 2 KB regularly,
  reconsider whether it should be a URL to external content.
- No automatic snapshot/history tables. If audit is needed later,
  design it explicitly in a later phase.

### 1.5 Read-cheap query patterns

- Prefer single-table queries. Avoid 3+ table joins on hot paths.
- List pages cap to `limit 20–50` by default.
- Never `select('*')` from large tables in a list view — pick columns.

---

## 2. Payment Direction (Locked)

- **USDC only.** No USDT. No custom token. No BXT. No airdrop framing.
- **Base-friendly.** Constants live in `lib/payments.ts`:
  `BASE_MAINNET_CHAIN_ID=8453`, `BASE_MAINNET_USDC_ADDRESS`,
  `USDC_DECIMALS=6`.
- Manual payment and Base mainnet escrow are live payment paths.
  UI labels must not imply USDC rewards or Base escrow are future-only.
  `escrowOnBaseLive` is true because the escrow contract is deployed.
- Reason: positions Bountix for Base Builder Grants; avoids regulatory
  / token launch baggage.

---

## 3. Waitlist Is Legacy

- `public.waitlist` table and its rows must **never** be dropped,
  truncated, altered destructively, renamed, or mass-updated.
- Adding new columns is OK (and was already done for the 4 social
  confirmations) — but only via a reviewed SQL migration file.
- Bountix public access is now a soft-open signup flow. `/waitlist` may
  remain as a legacy route, but the active public path should redirect
  to signup or the main platform.
- Waitlist state must not be used as the main access gate. Keep
  Early Contributor gating only for tasks marked Early Contributors only.

---

## 4. Migrations

- Every Supabase schema change = one SQL file under
  `supabase/migrations/` with a UTC-ordered prefix.
- Migrations are **drafted in the repo first** and run via `psql` only
  after explicit user approval.
- Never run ad-hoc SQL that mutates user data.
- Never apply auto-generated migrations from third-party tools without
  reading them line by line.

---

## 5. Packages & Build

- Do not add npm packages without explicit user approval.
- `@supabase/ssr` + `@supabase/supabase-js` already cover auth, cookies,
  and DB access — no extra auth helper packages needed.
- `framer-motion` is allowed but used sparingly; prefer CSS for loops
  and transitions (e.g. `task-carousel` uses CSS keyframes, not FM).

---

## 6. Deployments

- Do not deploy to Vercel unless the user explicitly approves it for
  that change.
- Commits to `main` will auto-trigger Vercel — so don't push to `main`
  unless the change is approved for production.
- For preview-only work, keep changes local and run
  `npm run dev -- --hostname 0.0.0.0 --port 1431`.

---

## 7. Design Direction (Locked)

- Comic / pop-art style. Thick black borders (`border-2 border-[#140625]`
  or `border-[#17072b]`), drop shadows (`shadow-[4px_4px_0_…]`), bright
  fill colors (`#ffdd3d`, `#38e7ff`, `#ff4fb8`, `#7c3cff`, `#f0d7ff`),
  cream backgrounds (`#fff7e8`, `#fffaf4`).
- Reuse utility classes from `app/globals.css`:
  `.comic-card`, `.comic-card-soft`, `.comic-chip`, `.halftone-mask`,
  `.speech-bubble`, `.container-page`.
- Do not introduce a second design system or theme.

---

## 8. When in doubt

If a proposed feature might violate any of the above:

1. Stop.
2. Document the trade-off.
3. Ask the user before implementing.

Cheaper to ask than to rip out a storage-heavy feature later.
