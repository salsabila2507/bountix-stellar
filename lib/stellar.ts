/**
 * Shared Stellar/Freighter/Soroban helpers for Bountix.
 */

import freighterApi from "@stellar/freighter-api";
import {
  TransactionBuilder,
  BASE_FEE,
  rpc,
  Operation,
  nativeToScVal,
  xdr,
  Address,
} from "@stellar/stellar-sdk";
import { ESCROW_CONTRACT_ADDRESS } from "./escrow";

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";

export type StellarWallet = {
  publicKey: string;
  network: string;
  networkPassphrase: string;
};

/** Request Freighter access and get the user's Stellar wallet info. */
export async function connectWallet(): Promise<StellarWallet> {
  const { isConnected } = await freighterApi.isConnected();
  if (!isConnected) {
    await freighterApi.requestAccess();
  }

  const { address } = await freighterApi.getAddress();
  const network = await freighterApi.getNetwork();

  return {
    publicKey: address,
    network: network.network,
    networkPassphrase: network.networkPassphrase,
  };
}

/** Check if Freighter is available. */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const { isConnected } = await freighterApi.isConnected();
    return isConnected;
  } catch {
    return false;
  }
}

function isStellarAddress(value: string): boolean {
  return (value.startsWith("G") || value.startsWith("C")) && value.length === 56;
}

function toScVal(value: unknown): xdr.ScVal {
  if (value instanceof xdr.ScVal) return value;

  if (typeof value === "bigint") {
    return nativeToScVal(value, { type: "i128" });
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return xdr.ScVal.scvBytes(Buffer.from(value));
  }

  if (typeof value === "string") {
    if (isStellarAddress(value)) {
      return Address.fromString(value).toScVal();
    }
    return nativeToScVal(value, { type: "symbol" });
  }

  if (typeof value === "boolean") {
    return xdr.ScVal.scvBool(value);
  }

  if (Array.isArray(value)) {
    const vec = value.map((v) => toScVal(v));
    return xdr.ScVal.scvVec(vec);
  }

  return nativeToScVal(value as never);
}

/**
 * Build and submit a Soroban contract invocation.
 * Pass raw JS values — they get auto-converted to proper ScVal types:
 *   - bigint → i128
 *   - Buffer/Uint8Array → bytes
 *   - Stellar address strings (G.../C...) → address
 *   - Array → vec
 *   - other strings → symbol
 */
export async function invokeSoroban(
  functionName: string,
  args: unknown[],
  wallet: StellarWallet,
): Promise<string> {
  if (!ESCROW_CONTRACT_ADDRESS) {
    throw new Error(
      "Soroban escrow contract not yet deployed. " +
        "Set ESCROW_CONTRACT_ADDRESS in lib/escrow.ts after deployment.",
    );
  }

  const server = new rpc.Server(SOROBAN_RPC_URL);

  const sourceAccount = await server.getAccount(wallet.publicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: wallet.networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: ESCROW_CONTRACT_ADDRESS,
        function: functionName,
        args: args.map((a) => toScVal(a)),
      }),
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Soroban simulation error: ${simulation.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, simulation).build();
  const signedResult = await freighterApi.signTransaction(
    preparedTx.toXDR(),
    { networkPassphrase: wallet.networkPassphrase },
  );

  const signedXdr = typeof signedResult === "string" ? signedResult : signedResult.signedTxXdr;
  const signedTx = TransactionBuilder.fromXDR(signedXdr, wallet.networkPassphrase);
  const result = await server.sendTransaction(signedTx);

  if (result.status !== "PENDING" && result.status !== "DUPLICATE") {
    throw new Error(`Soroban send error: ${result.status}`);
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const receipt = await server.getTransaction(result.hash);
    if (receipt.status === "SUCCESS") return result.hash;
    if (receipt.status === "FAILED") {
      throw new Error("Soroban transaction failed");
    }
  }
  throw new Error("Soroban transaction timed out");
}

/**
 * Serialize args for admin API — bigint → string, rest passes as-is.
 */
function serializeForAdmin(args: unknown[]): unknown[] {
  return args.map((a) => {
    if (typeof a === "bigint") return a.toString();
    return a;
  });
}

/**
 * Invoke a Soroban contract function that requires admin auth.
 * Sends the request to our backend API which signs with the deployer key.
 */
export async function invokeSorobanAdmin(
  functionName: string,
  args: unknown[],
): Promise<string> {
  const res = await fetch("/api/soroban/admin-invoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ functionName, args: serializeForAdmin(args) }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || `Admin invoke failed (${res.status})`);
  }
  const { txHash } = await res.json();
  return txHash;
}
