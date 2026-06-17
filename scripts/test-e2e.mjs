/**
 * End-to-end test: fund → assign → release on testnet.
 *
 * Uses the deployer key (admin) as both payer and admin.
 * Requires USDC balance in the deployer account.
 *
 * Usage: node scripts/test-e2e.mjs
 */

import "dotenv/config";
import crypto from "crypto";
import {
  Keypair,
  Address,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  rpc,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID =
  process.env.ESCROW_CONTRACT_ADDRESS ||
  "CCCGXM2NFZZCZAN4FA3CWCDVUGSC2DITXRJV7SBUA6NB5FB7KI4PUTJE";
const USDC_CONTRACT_ID =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const server = new rpc.Server(RPC_URL, { allowHttp: true });

async function poll(hash, maxWait = 45) {
  for (let i = 0; i < maxWait; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const receipt = await server.getTransaction(hash);
    if (receipt.status === "SUCCESS") return receipt;
    if (receipt.status === "FAILED")
      throw new Error(`Tx failed: ${hash}`);
  }
  throw new Error(`Tx timed out: ${hash}`);
}

async function simulateAndSend(tx, kp) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim))
    throw new Error(`Sim error: ${sim.error}`);

  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status === "PENDING" || result.status === "DUPLICATE") {
    return await poll(result.hash);
  }
  throw new Error(`Send error: ${result.status} ${result.error || ""}`);
}

function toScVal(value) {
  if (typeof value === "bigint") return nativeToScVal(value);
  if (Buffer.isBuffer(value))
    return xdr.ScVal.scvBytes(value);
  if (typeof value === "string" && value.length === 56 && /^[GC][A-Z0-9]{55}$/i.test(value))
    return Address.fromString(value).toScVal();
  if (Array.isArray(value))
    return xdr.ScVal.scvVec(value.map((v) => toScVal(v)));
  if (value instanceof Address)
    return value.toScVal();
  return nativeToScVal(value);
}

function uuidToBytes32(uuid) {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  return Buffer.from(hex.padStart(64, "0"), "hex");
}

async function invoke(functionName, args, kp) {
  const source = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: functionName,
        args: args.map((a) => toScVal(a)),
      }),
    )
    .setTimeout(30)
    .build();
  return await simulateAndSend(tx, kp);
}

async function main() {
  const kp = process.env.PRIVATE_KEY
    ? Keypair.fromSecret(process.env.PRIVATE_KEY)
    : Keypair.random();
  console.log(`Deployer: ${kp.publicKey()}`);

  // Fund with XLM if needed
  try {
    await server.getAccount(kp.publicKey());
    console.log(`  Account exists`);
  } catch {
    console.log("Funding with friendbot...");
    const res = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
    if (!res.ok && !(await res.text()).includes("already funded"))
      throw new Error(`Friendbot: ${await res.text()}`);
    console.log(`  Funded with XLM`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Check USDC balance
  const usdcAddr = Address.fromString(USDC_CONTRACT_ID);
  const deployerAddr = Address.account(kp.rawPublicKey());
  console.log(`\nChecking USDC balance...`);
  try {
    const balanceTx = new TransactionBuilder(await server.getAccount(kp.publicKey()), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: USDC_CONTRACT_ID,
          function: "balance",
          args: [nativeToScVal(deployerAddr)],
        }),
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(balanceTx);
    if (!rpc.Api.isSimulationError(sim) && sim.result?.retval) {
      const bal = sim.result.retval;
      console.log(`  USDC balance: ${bal} (i128)`);
    }
  } catch (e) {
    console.log(`  Could not check USDC balance: ${e.message}`);
  }

  // Generate a test task UUID
  const taskId = crypto.randomUUID();
  const taskKey = uuidToBytes32(taskId);
  console.log(`\nTask UUID: ${taskId}`);
  console.log(`Task key (hex): ${taskKey.toString("hex")}`);

  // Fund escrow (1 USDC = 10_000_000 units with 7 decimals)
  const amount = BigInt(10_000_000);
  console.log(`\n1. fund_escrow(payer=${kp.publicKey()}, taskKey=${taskKey.toString("hex")}, amount=${amount})`);
  try {
    const fundResult = await invoke("fund_escrow", [kp.publicKey(), taskKey, amount], kp);
    console.log(`   ✅ Funded! Tx hash: ${fundResult.hash.toString("hex")}`);
  } catch (e) {
    console.log(`   ❌ Fund failed: ${e.message}`);
    console.log(`\n   Deployer likely has no USDC. Need to fund the deployer account with testnet USDC first.`);
    process.exit(1);
  }

  // Assign worker (use a random address for testing)
  const worker = Address.random();
  console.log(`\n2. assign_worker(taskKey=${taskKey.toString("hex")}, worker=${worker.toString()})`);
  const assignResult = await invoke("assign_worker", [taskKey, worker.toString()], kp);
  console.log(`   ✅ Assigned! Tx hash: ${assignResult.hash.toString("hex")}`);

  // Release escrow
  console.log(`\n3. release_escrow(taskKey=${taskKey.toString("hex")})`);
  const releaseResult = await invoke("release_escrow", [taskKey], kp);
  console.log(`   ✅ Released! Tx hash: ${releaseResult.hash.toString("hex")}`);

  console.log(`\n✅ E2E test passed!`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
