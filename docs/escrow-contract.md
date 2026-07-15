# Bountix Stellar Escrow Contract

USDC escrow for Bountix task rewards on **Stellar / Soroban**.

## Deployment status

| Field | Value |
| --- | --- |
| Network | Stellar Testnet / Soroban |
| Contract | Bountix escrow Soroban contract |
| Escrow contract address | `CBYKG23Q5WJASTOCCRCO22QOEBQFHOJLVUFHVIHB2OC7R2X3I7A67SRZ` |
| USDC token contract | `CDXBKHJAEP5DZ7P5QUIZUDFFUFIUMPRVERPQE46KYKA6THW6R7DQMOH5` |
| USDC classic issuer | `GCU6VGJXQR6RPRCQ2W55DEOAAFSKFE6UEQYTHCQ2P7NIA3UIS72NJEKL` |
| Token units | 7 decimals, so 1 USDC = `10_000_000` units |
| Current platform fee | 2.5% on release |

The app records funded and released escrow state in Supabase while using the
Soroban contract as the source of truth for escrow settlement.

## Model

Roles:
- **Admin / resolver** - assigns workers or winners and releases funded escrow.
- **Requester** - creates tasks and funds escrow.
- **Tasker / winner** - receives net payout after release.
- **Treasury** - receives the platform fee.

Fee policy:
- On release, treasury receives the fee and the worker receives net payout.
- The UI stores release transaction hashes and payout history for users.

Lifecycle: `None -> Funded -> (Released | Refunded)`.

## Functions

| Function | Caller | Notes |
| --- | --- | --- |
| `fund_escrow` | requester | Funds a single-worker escrow with Stellar USDC. |
| `fund_raffle_escrow` | requester | Funds a raffle escrow. |
| `assign_worker` | admin / resolver | Assigns the accepted worker before release. |
| `assign_raffle_winners` | admin / resolver | Assigns selected raffle winners and gross payouts. |
| `release_escrow` | admin / resolver | Releases net payout to the worker and fee to treasury. |
| `release_raffle_escrow` | admin / resolver | Releases net payouts to raffle winners. |
| `get_escrow` | anyone | Returns escrow state for reconciliation. |

## Local commands

```bash
cargo test --manifest-path contracts/soroban/Cargo.toml
```

## Security notes

- USDC-only escrow path.
- Recipient wallets must have Stellar USDC payout readiness before release.
- Admin release preflight checks worker/winner wallet readiness.
- On-chain state is reconciled back into Supabase for user-facing history.
