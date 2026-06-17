# BountixEscrowV0 History

BountixEscrowV0 remains deployed on Base mainnet for tasks funded before V1 became active.

| Field | Value |
| --- | --- |
| Network | Base Mainnet (chainId 8453) |
| Contract | `BountixEscrowV0` |
| Address | [`0x89FAF386c052B55363fdEe45B04c48fcDcb5A692`](https://basescan.org/address/0x89FAF386c052B55363fdEe45B04c48fcDcb5A692) |
| Deploy tx | `0x149860d385931981830c5a1706486d42d865e3d5fc055092976a7f0fdaf53280` |
| Deployer / owner | `0xc123D813037fA84623bc733Fc910A27aD708E0EA` |
| Resolver (initial) | deployer address |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Min escrow | 1 USDC = `1_000_000` |

V0 behavior:
- Single-worker escrow only.
- No platform fee.
- Optional dispute state and resolver path.
- No multi-winner raffle payout support.

The web app keeps `escrow_contract_address` on each funded task. Existing V0-funded tasks should continue to use this V0 address for release/refund operations.
