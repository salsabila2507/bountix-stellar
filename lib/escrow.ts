/**
 * Bountix escrow (Soroban) constants + helpers for Stellar.
 *
 * On-chain USDC escrow on Stellar network via Soroban smart contract.
 * Manual payment remains the default and does not touch any of this.
 */

import {
  STELLAR_USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/lib/payments";

/** Soroban escrow contract deployed on Stellar testnet (XLM). */
export const ESCROW_CONTRACT_ADDRESS =
  "CCHJDSODTPYH3PZE23WURHT3SK6SY5G6W6D3MPI4YVUGZZTUXWGQ4OSI";

export const ESCROW_CONTRACT_VERSION = "v1";
export const ESCROW_DEFAULT_FEE_BPS = 250;
export const ESCROW_MAX_FEE_BPS = 1000;

export const ESCROW_USDC_ADDRESS = STELLAR_USDC_ADDRESS;

/** Minimum escrow reward = 1 USDC, in base units (7 decimals on Stellar). */
export const MIN_ESCROW_USDC = 1;
export const MIN_ESCROW_UNITS = BigInt(10_000_000);

/** Convert a human USDC amount (e.g. 50.00) to 6-decimal base units. */
export function usdcToUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) return BigInt(0);
  const cents = Math.round(amount * 100);
  return BigInt(cents) * BigInt(10) ** BigInt(USDC_DECIMALS - 2);
}

/**
 * Convert 6-decimal base units back to a human USDC amount.
 */
export function fromBaseUnits(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS;
}

/**
 * Map a task UUID to a { __bytes: hex } object for Soroban's BytesN<32>.
 * No Buffer — safe in browser, serializable over JSON.
 */
export function uuidToBytes32(uuid: string): { __bytes: string } {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32 || /[^0-9a-f]/.test(hex)) {
    throw new Error(`Invalid task UUID for escrow: ${uuid}`);
  }
  return { __bytes: hex.padStart(64, "0") };
}

/**
 * Use a task's recorded contract for release. Falls back to the global
 * ESCROW_CONTRACT_ADDRESS if the task doesn't have one.
 */
export function escrowContractForTask(input: {
  escrowContractAddress: string | null;
  escrowTxHash: string | null;
}): string {
  return input.escrowContractAddress || ESCROW_CONTRACT_ADDRESS;
}

/** stellar.expert tx URL helper for surfacing the funding receipt. */
export function stellarTxUrl(txHash: string): string {
  return `https://stellar.expert/tx/${txHash}`;
}

/** Check if the Soroban escrow contract has been deployed. */
export function escrowContractDeployed(): boolean {
  return ESCROW_CONTRACT_ADDRESS.length > 0;
}
