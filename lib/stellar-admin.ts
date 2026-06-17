import {
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Networks,
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
const ADMIN_KEY = process.env.PRIVATE_KEY;

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

export async function adminInvoke(
  functionName: string,
  args: unknown[],
): Promise<string> {
  if (!ADMIN_KEY) throw new Error("PRIVATE_KEY not set in .env");
  if (!ESCROW_CONTRACT_ADDRESS)
    throw new Error("ESCROW_CONTRACT_ADDRESS not set");

  const kp = Keypair.fromSecret(ADMIN_KEY);
  const server = new rpc.Server(SOROBAN_RPC_URL);
  const sourceAccount = await server.getAccount(kp.publicKey());

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
    throw new Error(`Soroban simulation error: ${simulation.error}`);
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
