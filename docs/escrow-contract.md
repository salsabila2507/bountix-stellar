# Bountix Escrow Contract (BountixEscrowV1)

USDC-only escrow for Bountix task rewards on **Base mainnet**.

## Deployment status

| Field | Value |
| --- | --- |
| Network | Base Mainnet (chainId 8453) |
| Contract | `BountixEscrowV1` |
| Address | [`0x81AcFAbb2D7f99fC68d764f720c731a0fA5C0995`](https://basescan.org/address/0x81AcFAbb2D7f99fC68d764f720c731a0fA5C0995) |
| Deploy tx | [`0x1724d777d050d90864dca653e9dbf62a00b1e1ad04ef860504d11905eb41ada3`](https://basescan.org/tx/0x1724d777d050d90864dca653e9dbf62a00b1e1ad04ef860504d11905eb41ada3) |
| Deployer / owner | `0xc123D813037fA84623bc733Fc910A27aD708E0EA` |
| Resolver (initial) | `0xc123D813037fA84623bc733Fc910A27aD708E0EA` |
| Treasury | `0xc123D813037fA84623bc733Fc910A27aD708E0EA` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (native Circle USDC on Base) |
| Min escrow | 1 USDC = `1_000_000` (USDC has 6 decimals) |
| Contract default platform fee | 2.5% = `250` bps |
| Public platform fee range | 2-10% |
| Current platform fee | 10% = `1000` bps |

Deploy cost: gas used `1,868,542` at `0.006136911` gwei = `0.000011467075953762` ETH.

V0 remains deployed for historical tasks. See [BountixEscrowV0 history](history/bountix-escrow-v0.md).

## Model

Roles:
- **Owner** - set to the deployer at construction.
- **Resolver** - operational admin for assigning workers/winners, releasing, and refunding.
- **Treasury** - receives platform fees.

Fee policy:
- `feeBps` defaults to `250` (2.5%) at contract deployment.
- Bountix public V1 copy currently presents the configured fee as `1000` (10%).
- `MAX_FEE_BPS` is `1000` (10%).
- On release, treasury receives the fee.
- Workers and raffle winners receive net payout after fee.
- Refunds return the full escrow amount to the payer.

Lifecycle: `None -> Funded -> (Released | Refunded)`.

## Functions

| Function | Caller | Notes |
| --- | --- | --- |
| `fundEscrow(bytes32 taskId, uint256 amount)` | payer | Funds a single-worker escrow. Caller must approve USDC first. |
| `fundRaffleEscrow(bytes32 taskId, uint256 amount)` | payer | Funds a raffle escrow. For Bountix UI, amount is reward per winner times winner count. |
| `assignWorker(bytes32 taskId, address worker)` | owner or resolver | Sets/reassigns worker while a single-worker escrow is funded. |
| `releaseEscrow(bytes32 taskId)` | owner or resolver | Pays worker net amount and sends platform fee to treasury. |
| `assignRaffleWinners(bytes32 taskId, address[] winners, uint256[] grossAmounts)` | owner or resolver | Sets winners and gross payouts. Gross payouts must exactly sum to escrow amount. |
| `releaseRaffleEscrow(bytes32 taskId)` | owner or resolver | Pays each winner net amount and sends total platform fee to treasury. |
| `refundEscrow(bytes32 taskId)` | owner or resolver | Returns full escrow amount to payer. |
| `setFeeBps(uint256 newFeeBps)` | owner | Updates fee, capped at 10%. |
| `setTreasury(address newTreasury)` | owner | Updates treasury. |
| `updateResolver(address newResolver)` | owner | Updates resolver. |
| `getEscrow(bytes32 taskId) view` | anyone | Returns escrow record. |
| `getRafflePayouts(bytes32 taskId) view` | anyone | Returns raffle winner payout records. |

## Local commands

```bash
npm run compile
npm run test:contract
npm run estimate:v1:base
npm run deploy:v1:base
```

`deploy:v1:base` requires `PRIVATE_KEY`, `BASE_RPC_URL`, and `V1_TREASURY_ADDRESS`. `V1_RESOLVER_ADDRESS` is optional and defaults to deployer.

## Security notes

- USDC-only; token address is immutable.
- `SafeERC20` for transfers.
- `ReentrancyGuard` on fund-moving functions.
- State changes happen before external token transfers.
- Fee and treasury configuration are owner-only.
- Existing V0-funded tasks should release against their recorded V0 contract address.
