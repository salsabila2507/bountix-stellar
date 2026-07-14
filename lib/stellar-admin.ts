import {
  Keypair,
  Account,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  rpc,
  Operation,
  nativeToScVal,
  xdr,
  Address,
  scValToNative,
} from "@stellar/stellar-sdk";
import { ESCROW_CONTRACT_ADDRESS } from "./escrow";

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";
const ADMIN_KEY = process.env.PRIVATE_KEY;

export type EscrowState = "Funded" | "Released" | "Refunded";

function isStellarAddress(value: string): boolean {
  return (value.startsWith("G") || value.startsWith("C")) && value.length === 56;
}

function isHexBytes(value: { __bytes?: string }): boolean {
  return typeof value === "object" && value !== null && typeof value.__bytes === "string";
}

function toScVal(value: unknown): xdr.ScVal {
  if (value instanceof xdr.ScVal) return value;
  if (typeof value === "bigint" || typeof value === "string" && /^-?\d+$/.test(value))
    return nativeToScVal(typeof value === "string" ? BigInt(value) : value, { type: "i128" });
  if (Buffer.isBuffer(value) || value instanceof Uint8Array)
    return xdr.ScVal.scvBytes(Buffer.from(value));
  if (isHexBytes(value as Record<string, unknown>))
    return xdr.ScVal.scvBytes(Buffer.from((value as { __bytes: string }).__bytes, "hex"));
  if (typeof value === "string") {
    if (isStellarAddress(value)) return Address.fromString(value).toScVal();
    return nativeToScVal(value, { type: "symbol" });
  }
  if (typeof value === "boolean") return xdr.ScVal.scvBool(value);
  if (Array.isArray(value))
    return xdr.ScVal.scvVec(value.map((v) => toScVal(v)));
  return nativeToScVal(value as never);
}

/**
 * Simulate a read-only contract call. Returns true if the simulation
 * succeeds (i.e. the data exists), false if it reverts.
 */
export async function adminQuery(
  functionName: string,
  args: unknown[],
): Promise<boolean> {
  if (!ESCROW_CONTRACT_ADDRESS)
    throw new Error("ESCROW_CONTRACT_ADDRESS not set");

  const server = new rpc.Server(SOROBAN_RPC_URL);
  const kp = Keypair.random();
  let rpcAccount;
  try {
    rpcAccount = await server.getAccount(kp.publicKey());
  } catch {
    await fetch(
      `https://friendbot.stellar.org?addr=${kp.publicKey()}`,
    ).then((r) => r.json());
    rpcAccount = await server.getAccount(kp.publicKey());
  }
  const sourceAccount = new Account(
    rpcAccount.accountId(),
    rpcAccount.sequenceNumber(),
  );

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
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
    return false;
  }
  return true;
}

export async function adminGetEscrowState(
  taskKey: { __bytes: string },
): Promise<EscrowState> {
  if (!ESCROW_CONTRACT_ADDRESS)
    throw new Error("ESCROW_CONTRACT_ADDRESS not set");

  const server = new rpc.Server(SOROBAN_RPC_URL);
  const kp = ADMIN_KEY ? Keypair.fromSecret(ADMIN_KEY) : Keypair.random();
  if (!ADMIN_KEY) {
    await fetch(
      `https://friendbot.stellar.org?addr=${kp.publicKey()}`,
    ).then((response) => {
      if (!response.ok) throw new Error("Could not prepare escrow status query");
    });
  }
  const rpcAccount = await server.getAccount(kp.publicKey());
  const sourceAccount = new Account(
    rpcAccount.accountId(),
    rpcAccount.sequenceNumber(),
  );

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: ESCROW_CONTRACT_ADDRESS,
        function: "get_escrow",
        args: [toScVal(taskKey)],
      }),
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulation) || !simulation.result?.retval) {
    throw new Error("Escrow was not found on-chain");
  }

  const native = scValToNative(simulation.result.retval) as {
    state?: unknown;
  };
  const state = Array.isArray(native.state) ? native.state[0] : native.state;
  if (state === "Funded" || state === "Released" || state === "Refunded") {
    return state;
  }
  throw new Error("Unknown on-chain escrow state");
}

export async function adminInvoke(
  functionName: string,
  args: unknown[],
): Promise<string> {
  if (!ADMIN_KEY) throw new Error("PRIVATE_KEY not set in .env");
  if (!ESCROW_CONTRACT_ADDRESS)
    throw new Error("ESCROW_CONTRACT_ADDRESS not set");

  const kp = Keypair.fromSecret(ADMIN_KEY);
  const server = new rpc.Server(SOROBAN_RPC_URL);
  const rpcAccount = await server.getAccount(kp.publicKey());
  const sourceAccount = new Account(
    rpcAccount.accountId(),
    rpcAccount.sequenceNumber(),
  );

  // Log args for debugging
  console.log("adminInvoke", functionName, JSON.stringify(args));

  // Prepend deployer address as payer for fund functions
  const fundArgs = functionName.startsWith("fund_")
    ? [kp.publicKey(), ...args]
    : args;

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: ESCROW_CONTRACT_ADDRESS,
        function: functionName,
        args: fundArgs.map((a) => toScVal(a)),
      }),
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulation)) {
    const events = simulation.events
      ? JSON.stringify(simulation.events)
      : "(no events)";
    if (
      simulation.error.includes("Error(Contract, #13)") &&
      events.includes("trustline entry is missing")
    ) {
      throw new Error(
        "Recipient wallet is not ready for USDC payouts. The recipient must activate the USDC trustline in Wallet before release.",
      );
    }
    const argsSummary = JSON.stringify(fundArgs).substring(0, 800);
    throw new Error(
      `Soroban simulation error: ${simulation.error}\nFundArgs: ${argsSummary}\nEvents:\n${events}`,
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
    if (receipt.status === "FAILED")
      throw new Error("Soroban transaction failed");
  }
  throw new Error("Soroban transaction timed out");
}
