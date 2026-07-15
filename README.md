# Bountix

Bountix is a task marketplace for everyday work in SEA, covering freelance
tasks, micro-jobs, errands, personal shopping assistance, local services, and
community requests. It uses Stellar-based USDC escrow to help requesters and
taskers transact with clearer trust and payment protection.

Production app: https://bountix-stellar.vercel.app

## Stellar Contracts

- Escrow Contract Address: `CBYKG23Q5WJASTOCCRCO22QOEBQFHOJLVUFHVIHB2OC7R2X3I7A67SRZ`
- USDC Token Contract: `CDXBKHJAEP5DZ7P5QUIZUDFFUFIUMPRVERPQE46KYKA6THW6R7DQMOH5`
- USDC Classic Issuer: `GCU6VGJXQR6RPRCQ2W55DEOAAFSKFE6UEQYTHCQ2P7NIA3UIS72NJEKL`

> **Read before contributing:** [`docs/constraints.md`](docs/constraints.md) —
> Supabase free-tier rules, payment direction (USDC on Stellar only),
> legacy waitlist protection, migration policy, and design lock.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase auth, profiles, tasks, applications, submissions, messages, and
  legacy waitlist storage
- Stellar USDC escrow and wallet onboarding
- Tencent Chat for task participant messaging
- Vercel-ready deployment

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
SESSION_SECRET=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported if your Supabase dashboard
uses the older key naming.

## Supabase Setup

Apply SQL files from `supabase/migrations/` in order. The old
`public.waitlist` table is retained for history, but signup is the active
public access path.

## Deploying to Vercel

1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Add the Supabase environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
SESSION_SECRET=
```

4. Deploy.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
