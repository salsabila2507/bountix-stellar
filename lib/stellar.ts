/**
 * Shared Stellar/Freighter/Soroban helpers for Bountix.
 */

import freighterApi from "@stellar/freighter-api";
import {
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Account,
  Horizon,
  rpc,
  Operation,
  nativeToScVal,
  xdr,
  Address,
  Keypair,
} from "@stellar/stellar-sdk";
import { ESCROW_CONTRACT_ADDRESS } from "./escrow";
import { friendbotFund as fbFund } from "./stellar/horizon";

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

function isHexBytes(value: { __bytes?: string }): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.__bytes === "string"
  );
}

function toScVal(value: unknown): xdr.ScVal {
  if (value instanceof xdr.ScVal) return value;

  if (isHexBytes(value as { __bytes?: string }))
    return xdr.ScVal.scvBytes(
      Buffer.from((value as { __bytes: string }).__bytes, "hex"),
    );

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
 * Build, sign with a user Keypair, and submit a Soroban contract invocation.
 * The user's address is used as the source account (pays fees & escrow).
 */
export async function invokeSorobanWithKeypair(
  functionName: string,
  args: unknown[],
  kp: Keypair,
): Promise<string> {
  if (!ESCROW_CONTRACT_ADDRESS) {
    throw new Error("ESCROW_CONTRACT_ADDRESS not set");
  }

  const networkPassphrase = Networks.TESTNET;
  const server = new rpc.Server(SOROBAN_RPC_URL);
  const rpcAccount = await server.getAccount(kp.publicKey());
  // Use a Number-safe Account built from Horizon's numeric sequence.
  // stellar-sdk v15+ returns indefinite-length sequence strings from
  // rpc.Server.Account that overflow Number.round; rebuilding via
  // the simpler Account class avoids the overflow during
  // TransactionBuilder / assembleTransaction construction.
  const sourceAccount = new Account(
    rpcAccount.accountId(),
    rpcAccount.sequenceNumber(),
  );

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
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
    const events = simulation.events
      ? JSON.stringify(simulation.events)
      : "(no events)";
    // Find the error diagnostic event and surface its data clearly
    let panicData = "(unknown panic)";
    try {
      const ev = simulation.events as any[];
      // The first event is usually the fn_call, the second is the error.
      const last = ev[ev.length - 1];
      if (last?.event?.body?._value?._attributes?.data) {
        panicData = JSON.stringify(
          last.event.body._value._attributes.data,
        ).substring(0, 500);
      }
    } catch {}
    console.error(
      "[invokeSorobanWithKeypair] contract panic data: " + panicData,
    );
    throw new Error(
      `Soroban simulation error: ${simulation.error}\nPanic: ${panicData}\nEvents: ${events}`,
    );
  }

  const preparedTx = rpc.assembleTransaction(tx, simulation).build();
  preparedTx.sign(kp);

  const result = await server.sendTransaction(preparedTx);

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

/**
 * Check if an escrow exists on-chain for the given task key.
 * Returns true if get_escrow succeeds, false if it reverts.
 */
export async function escrowExistsOnChain(
  taskKey: { __bytes: string },
): Promise<boolean> {
  const res = await fetch("/api/soroban/admin-invoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _query: true,
      functionName: "get_escrow",
      args: [taskKey],
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.exists === true;
}

/**
 * Query a SEP-41 token contract's `balance(address)` function.
 * Returns balance in base units (e.g. 70000000 = 7 USDC).
 * Returns 0n if the simulation fails (no trustline or no balance).
 */
export async function getSorobanTokenBalance(
  tokenContract: string,
  address: string,
): Promise<bigint> {
  try {
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const kp = Keypair.random();
    let sourceAccount;
    try {
      sourceAccount = await server.getAccount(kp.publicKey());
    } catch {
      await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`).then(
        (r) => r.json(),
      );
      sourceAccount = await server.getAccount(kp.publicKey());
    }

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: tokenContract,
          function: "balance",
          args: [Address.fromString(address).toScVal()],
        }),
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const raw = JSON.stringify(sim.result.retval);
      const match = raw.match(/"lo":\{"_value":"(\d+)"\}/);
      if (match) return BigInt(match[1]);
    }
  } catch {
    // network error or auth issue
  }
  return BigInt(0);
}

/**
 * Like getSorobanTokenBalance but cached in sessionStorage.
 * Cache TTL = 60 seconds. Pass `bust: true` to force a fresh fetch.
 */
const CACHE_PREFIX = "bountix:token-balance";
const CACHE_TTL_MS = 60_000;

export async function getCachedSorobanTokenBalance(
  tokenContract: string,
  address: string,
  bust = false,
): Promise<bigint> {
  if (typeof window !== "undefined") {
    const key = `${CACHE_PREFIX}:${tokenContract}:${address}`;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw && !bust) {
        const parsed = JSON.parse(raw) as { balance: string; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          return BigInt(parsed.balance);
        }
      }
    } catch {
      // sessionStorage unavailable / parse error → fall through
    }
  }

  const balance = await getSorobanTokenBalance(tokenContract, address);

  if (typeof window !== "undefined") {
    const key = `${CACHE_PREFIX}:${tokenContract}:${address}`;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ balance: balance.toString(), ts: Date.now() }),
      );
    } catch {
      // quota exceeded / unavailable → silently ignore
    }
  }

  return balance;
}

/**
 * Trigger friendbot to fund an account with testnet XLM.
 * No-op if account already has a balance.
 */
export async function ensureTestnetXlm(
  publicKey: string,
  minXlm = 1,
): Promise<void> {
  try {
    const horizon = new Horizon.Server(
      "https://horizon-testnet.stellar.org",
    );
    let acc;
    try {
      acc = await horizon.loadAccount(publicKey);
    } catch {
      // account doesn't exist on testnet → fund it
      acc = null;
    }
    if (acc) {
      const native = acc.balances.find((b) => b.asset_type === "native");
      if (native && parseFloat(native.balance) >= minXlm) return;
    }
    await fbFund(publicKey);
  } catch {
    // friendbot may rate-limit; ignore
  }
}
