/**
 * Bountix payment constants.
 *
 * Direction: USDC + USDT on Stellar via Soroban escrow.
 */

export const PAYMENT_TOKENS = ["USDC", "USDT"] as const;
export type PaymentToken = (typeof PAYMENT_TOKENS)[number];

export function isPaymentToken(value: string): value is PaymentToken {
  return (PAYMENT_TOKENS as readonly string[]).includes(value);
}

export const CHAIN_NAME = "Stellar" as const;
export const STELLAR_NETWORK_CHAIN_ID = 8453;
export const STELLAR_TESTNET_CHAIN_ID = 84532;

/** USDC Stellar Asset Contract on testnet. */
export const STELLAR_USDC_ADDRESS =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/** USDT Stellar Asset Contract on testnet (env override). */
export const STELLAR_USDT_ADDRESS =
  process.env.NEXT_PUBLIC_SOROBAN_USDT_ADDRESS ?? STELLAR_USDC_ADDRESS;

/** Stellar assets use 7 decimals on Soroban. */
export const STELLAR_TOKEN_DECIMALS = 7;
export const USDC_DECIMALS = STELLAR_TOKEN_DECIMALS;

export const TOKEN_ADDRESSES: Record<PaymentToken, string> = {
  USDC: STELLAR_USDC_ADDRESS,
  USDT: STELLAR_USDT_ADDRESS,
};

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

export function formatUsdc(
  amount: number | null | undefined,
  token: PaymentToken = "USDC",
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return `0 ${token}`;
  }
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${token}`;
}

export const escrowOnStellarLive = true;
