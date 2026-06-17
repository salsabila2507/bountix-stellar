/**
 * Bountix payment constants.
 *
 * Direction: USDC only on Stellar. No custom token, no USDT.
 * Manual payment and the deployed Stellar mainnet escrow flow are live payment
 * paths for Bountix rewards.
 *
 * See docs/constraints.md for the full payment + free-tier rules.
 */

export const PAYMENT_TOKEN = "USDC" as const;
export type PaymentToken = typeof PAYMENT_TOKEN;

export const CHAIN_NAME = "Stellar" as const;
export const STELLAR_NETWORK_CHAIN_ID = 8453; // TODO: update when deployed
export const STELLAR_TESTNET_CHAIN_ID = 84532; // TODO: update when deployed

/** XLM Stellar Asset Contract on testnet (native Stellar asset wrapped for Soroban). */
export const STELLAR_USDC_ADDRESS =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/** XLM has 7 decimals on Stellar (1 XLM = 10_000_000 stroops). */
export const USDC_DECIMALS = 7;

export type PaymentStatus =
  | "unpaid"
  | "funded"
  | "released"
  | "refunded"
  | "disputed";

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  funded: "Funded (escrow)",
  released: "Released",
  refunded: "Refunded",
  disputed: "Disputed",
};

/**
 * Format a numeric USDC amount for display.
 * Always returns "<n> USDC" with thousands separator and up to 2 fraction digits.
 * Returns "0 USDC" for null/undefined/NaN.
 */
export function formatUsdc(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return `0 ${PAYMENT_TOKEN}`;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${PAYMENT_TOKEN}`;
}

/** Soroban escrow contract is deployed and live on testnet. */
export const escrowOnStellarLive = true;
