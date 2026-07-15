# Bountix

Bountix is a flexible task and service marketplace for Southeast Asia. Users can
request help, post tasks, apply to tasks, offer their own services, coordinate
work, and settle payments through Stellar-powered USDC escrow.

Production app: https://bountix-stellar.vercel.app

## Problem

Many everyday tasks and service requests in SEA still happen through chat
groups, social media, and personal networks. Requesters worry about paying
before work is completed, while taskers and service providers worry about doing
work and not getting paid. Existing platforms are often too rigid for mixed
online and real-world tasks such as errands, local services, personal shopping
assistance, community requests, and micro-work.

## Solution

Bountix turns informal task and service requests into secure, trackable
transactions. A requester can create a task, accept a tasker, and fund USDC into
Stellar escrow before work starts. After completion and approval, the escrow is
released to the tasker. The product also supports service offers, task
applications, participant-only chat, notifications, wallet onboarding, payout
history, and admin moderation.

## Stellar Integration

- Stellar / Soroban is used as the payment and trust layer.
- Requesters fund task rewards with USDC escrow.
- Admin or requester release flow records escrow settlement.
- Users get wallet onboarding inside the app.
- Wallet pages show USDC readiness and payout history.
- Release preflight checks recipient wallet readiness for USDC payouts.

## Stellar Contracts

- Escrow Contract Address: `CBYKG23Q5WJASTOCCRCO22QOEBQFHOJLVUFHVIHB2OC7R2X3I7A67SRZ`
- USDC Token Contract: `CDXBKHJAEP5DZ7P5QUIZUDFFUFIUMPRVERPQE46KYKA6THW6R7DQMOH5`
- USDC Classic Issuer: `GCU6VGJXQR6RPRCQ2W55DEOAAFSKFE6UEQYTHCQ2P7NIA3UIS72NJEKL`

## Features

- Google and email/password authentication via Supabase
- Automatic Stellar wallet creation for new Google users
- Task marketplace, task applications, and task submissions
- Service offers for users who want to publish skills or services
- Participant-only Tencent Chat for accepted task conversations
- Notifications for applications, approvals, escrow activity, and payouts
- Stellar USDC escrow funding and release flow
- Wallet dashboard with XLM, USDC, escrow payout history, and token transfers
- Admin moderation for unsafe or prohibited tasks

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase auth and database
- Stellar / Soroban SDK
- Tencent Chat
- Vercel deployment

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
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SOROBAN_RPC_URL=
NEXT_PUBLIC_SOROBAN_USDC_ADDRESS=
NEXT_PUBLIC_USDC_ISSUER=
PRIVATE_KEY=
USDC_FAUCET_SECRET=
TENCENT_CHAT_SDKAPPID=
TENCENT_CHAT_SECRETKEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported if your Supabase dashboard
uses the older key naming. `SUPABASE_SERVICE_ROLE_KEY`, `PRIVATE_KEY`,
`USDC_FAUCET_SECRET`, and Tencent secret values must stay server-side only and
must never be committed to GitHub.

## Supabase Setup

Apply SQL files from `supabase/migrations/` in order. The latest migration
normalizes the previous MVP schema into the current Stellar shape by using
`stellar` and `escrow_stellar` as the active chain/payment values.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:contract
```

`npm run test:contract` only prints the Soroban contract test location unless
the Rust/Cargo toolchain is installed locally.

## Deployment

The app is deployed on Vercel. Pushes to `main` trigger production deployment.
