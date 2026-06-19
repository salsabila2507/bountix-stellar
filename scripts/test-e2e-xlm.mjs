/**
 * Deploy BountixEscrow with native XLM token, then test fund→assign→release.
 *
 * Usage: node scripts/test-e2e-xlm.mjs
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const XLM_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const WASM_PATH = join(
  ROOT,
  "contracts/soroban/target/wasm32v1-none/release/bountix_escrow.wasm",
);

const server = new rpc.Server(RPC_URL, { allowHttp: true });

async function poll(hash, maxWait = 45) {
  for (let i = 0; i < maxWait; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const receipt = await server.getTransaction(hash);
    if (receipt.status === "SUCCESS") return receipt;
    if (receipt.status === "FAILED") throw new Error(`Tx failed: ${hash}`);
  }
  throw new Error(`Tx timed out: ${hash}`);
}

async function simulateAndSend(tx, kp) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim))
    throw new Error(`Sim error: ${sim.error}`);
  console.log(`  Simulation OK`);
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status === "PENDING" || result.status === "DUPLICATE") {
    console.log(`  Waiting for confirmation...`);
    return await poll(result.hash);
  }
  throw new Error(`Send error: ${result.status} ${result.error || ""}`);
}

function computeContractId(sourceAddress, salt) {
  const fromAddr = new xdr.ContractIdPreimageFromAddress({
    address: sourceAddress.toScAddress(),
    salt,
  });
  const preimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(fromAddr);
  const networkId = crypto.createHash("sha256").update(NETWORK_PASSPHRASE).digest();
  const envelope = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({ networkId, contractIdPreimage: preimage }),
  );
  const hash = crypto.createHash("sha256").update(envelope.toXDR()).digest();
  return Address.contract(hash);
}

function toScVal(value) {
  if (typeof value === "bigint") return nativeToScVal(value);
  if (Buffer.isBuffer(value)) return xdr.ScVal.scvBytes(value);
  if (typeof value === "string" && value.length === 56 && /^[GC][A-Z0-9]{55}$/i.test(value))
    return Address.fromString(value).toScVal();
  if (Array.isArray(value)) return xdr.ScVal.scvVec(value.map((v) => toScVal(v)));
  return nativeToScVal(value);
}

function uuidToBytes32(uuid) {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  return Buffer.from(hex.padStart(64, "0"), "hex");
}

async function main() {
  const kp = process.env.PRIVATE_KEY
    ? Keypair.fromSecret(process.env.PRIVATE_KEY)
    : Keypair.random();
  console.log(`Deployer: ${kp.publicKey()}`);
  if (!process.env.PRIVATE_KEY) console.log(`Secret: ${kp.secret()}`);

  // Fund if needed
  try {
    await server.getAccount(kp.publicKey());
    console.log(`  Account exists`);
  } catch {
    console.log(`  Funding with friendbot...`);
    await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  // ============================================================
  // 1. Upload WASM
  // ============================================================
  console.log(`\n1. Uploading WASM...`);
  const wasm = readFileSync(WASM_PATH);
  console.log(`  WASM: ${wasm.length} bytes`);

  const uploadSource = await server.getAccount(kp.publicKey());
  const uploadTx = new TransactionBuilder(uploadSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(30)
    .build();

  const uploadSim = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(uploadSim))
    throw new Error(`Upload sim error: ${uploadSim.error}`);

  const wasmHashBytes = uploadSim.result.retval.bytes();
  const wasmHash = Buffer.from(wasmHashBytes);
  console.log(`  WASM hash: ${wasmHash.toString("hex")}`);

  const uploadPrepared = rpc.assembleTransaction(uploadTx, uploadSim).build();
  uploadPrepared.sign(kp);
  const uploadResult = await server.sendTransaction(uploadPrepared);
  if (!(uploadResult.status === "PENDING" || uploadResult.status === "DUPLICATE"))
    throw new Error(`Upload error: ${uploadResult.status}`);
  await poll(uploadResult.hash);
  console.log(`  WASM uploaded`);

  // ============================================================
  // 2. Create contract
  // ============================================================
  console.log(`\n2. Creating contract...`);
  const createSource = await server.getAccount(kp.publicKey());
  const salt = crypto.randomBytes(32);
  const deployerAddr = Address.account(kp.rawPublicKey());
  const contractAddr = computeContractId(deployerAddr, salt);
  console.log(`  Contract ID: ${contractAddr.toString()}`);

  const deployTx = new TransactionBuilder(createSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        wasmHash,
        salt,
        address: deployerAddr,
      }),
    )
    .setTimeout(30)
    .build();
  await simulateAndSend(deployTx, kp);
  console.log(`  Contract created`);

  // ============================================================
  // 3. Initialize
  // ============================================================
  console.log(`\n3. Initializing contract...`);
  const initSource = await server.getAccount(kp.publicKey());
  const xlmAddr = Address.fromString(XLM_TOKEN_ID);
  const initArgs = [
    nativeToScVal(deployerAddr),
    nativeToScVal(deployerAddr),
    nativeToScVal(xlmAddr),
    nativeToScVal(xlmAddr),
  ];

  const initTx = new TransactionBuilder(initSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractAddr.toString(),
        function: "initialize",
        args: initArgs,
      }),
    )
    .setTimeout(30)
    .build();

  await simulateAndSend(initTx, kp);
  console.log(`  Contract initialized`);

  // ============================================================
  // 4. Fund escrow
  // ============================================================
  const taskId = crypto.randomUUID();
  const taskKey = uuidToBytes32(taskId);
  const amount = BigInt(10_000_000); // 1 XLM (7 decimals)
  console.log(`\n4. fund_escrow(task_id=${taskKey.toString("hex")}, amount=1 XLM)`);

  const fundSource = await server.getAccount(kp.publicKey());
  const fundTx = new TransactionBuilder(fundSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractAddr.toString(),
        function: "fund_escrow",
        args: [toScVal(kp.publicKey()), toScVal(taskKey), toScVal(amount), toScVal(XLM_TOKEN_ID)],
      }),
    )
    .setTimeout(30)
    .build();

  const fundResult = await simulateAndSend(fundTx, kp);
  console.log(`  ✅ Funded! Tx: ${fundResult.hash.toString("hex")}`);

  // ============================================================
  // 5. Assign worker
  // ============================================================
  const worker = Address.random();
  console.log(`\n5. assign_worker(worker=${worker.toString()})`);

  const assignSource = await server.getAccount(kp.publicKey());
  const assignTx = new TransactionBuilder(assignSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractAddr.toString(),
        function: "assign_worker",
        args: [toScVal(taskKey), toScVal(worker.toString())],
      }),
    )
    .setTimeout(30)
    .build();

  const assignResult = await simulateAndSend(assignTx, kp);
  console.log(`  ✅ Assigned! Tx: ${assignResult.hash.toString("hex")}`);

  // ============================================================
  // 6. Release escrow
  // ============================================================
  console.log(`\n6. release_escrow()`);

  const releaseSource = await server.getAccount(kp.publicKey());
  const releaseTx = new TransactionBuilder(releaseSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractAddr.toString(),
        function: "release_escrow",
        args: [toScVal(taskKey)],
      }),
    )
    .setTimeout(30)
    .build();

  const releaseResult = await simulateAndSend(releaseTx, kp);
  console.log(`  ✅ Released! Tx: ${releaseResult.hash.toString("hex")}`);

  // ============================================================
  // 7. Save results
  // ============================================================
  const output = {
    contractAddress: contractAddr.toString(),
    xlmTokenId: XLM_TOKEN_ID,
    deployer: kp.publicKey(),
    taskId,
    fundTx: fundResult.hash.toString("hex"),
    assignTx: assignResult.hash.toString("hex"),
    releaseTx: releaseResult.hash.toString("hex"),
  };
  writeFileSync(join(ROOT, ".test-e2e-xlm.json"), JSON.stringify(output, null, 2));

  console.log(`\n✅ E2E TEST PASSED!`);
  console.log(`Contract: ${contractAddr.toString()}`);
  console.log(`Task ID:  ${taskId}`);
  console.log(`Saved to: .test-e2e-xlm.json`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
