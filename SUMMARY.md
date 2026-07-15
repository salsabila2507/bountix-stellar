# Bountix Summary

Bountix is a flexible task and service marketplace powered by Stellar USDC
escrow. It supports task posting, task applications, service offers,
participant-only chat, notifications, wallet onboarding, admin moderation, and
wallet payout history.

## Current Production Links

- App: https://bountix-stellar.vercel.app
- Repository: https://github.com/salsabila2507/bountix-stellar
- Pitch deck: `docs/bountix-pitch-deck.pptx`

## Stellar Addresses

| Component | Address |
| --- | --- |
| Escrow contract | `CBYKG23Q5WJASTOCCRCO22QOEBQFHOJLVUFHVIHB2OC7R2X3I7A67SRZ` |
| USDC token contract | `CDXBKHJAEP5DZ7P5QUIZUDFFUFIUMPRVERPQE46KYKA6THW6R7DQMOH5` |
| USDC classic issuer | `GCU6VGJXQR6RPRCQ2W55DEOAAFSKFE6UEQYTHCQ2P7NIA3UIS72NJEKL` |

## Main Flow

1. User signs in with Google or email/password.
2. New Google users are routed through wallet setup.
3. Requester creates a task or a service provider publishes an offer.
4. Tasker applies and the requester accepts.
5. Requester funds Stellar USDC escrow.
6. Tasker completes the work.
7. Requester or admin releases escrow.
8. Wallet history shows payout records and token transfers.

## Key Files

- `contracts/soroban/src/lib.rs` - Soroban escrow contract source
- `lib/stellar-admin.ts` - server-side Soroban admin helpers
- `lib/stellar.ts` - Stellar client helpers
- `lib/payments.ts` - Stellar USDC constants
- `lib/stellar/wallet-context.tsx` - app wallet state
- `lib/stellar/wallet-store.ts` - browser-encrypted wallet storage
- `app/auth/oauth-wallet/page.tsx` - Google wallet provisioning
- `components/marketplace/escrow-fund-panel.tsx` - escrow funding UI
- `components/admin/escrow-release-admin-panel.tsx` - admin release UI
- `app/wallet/page.tsx` - wallet dashboard and payout history

## Verification Commands

```bash
npx tsc --noEmit
npm run lint
npm run build
```
