import "dotenv/config";
import { readFileSync } from "fs";
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
const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const server = new rpc.Server(RPC_URL);
const kp = Keypair.fromSecret(process.env.PRIVATE_KEY);
const pubKey = kp.publicKey();

const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const WASM_PATH = join(ROOT, "contracts/soroban/target/wasm32v1-none/release/bountix_escrow.wasm");

function toScVal(v) {
  if (v instanceof xdr.ScVal) return v;
  if (typeof v === "bigint") return nativeToScVal(v, { type: "i128" });
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return xdr.ScVal.scvBytes(Buffer.from(v));
  if (typeof v === "string" && v.length === 56 && /^[GC][A-Z0-9]{55}$/i.test(v)) return Address.fromString(v).toScVal();
  if (Array.isArray(v)) return xdr.ScVal.scvVec(v.map(toScVal));
  return nativeToScVal(v);
}

async function simAndSend(tx) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Sim error: ${sim.error}`);
  console.log("  Sim OK");
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status !== "PENDING" && result.status !== "DUPLICATE")
    throw new Error(`Send error: ${result.status}`);
  console.log("  Waiting...");
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const receipt = await server.getTransaction(result.hash);
    if (receipt.status === "SUCCESS") return result.hash;
    if (receipt.status === "FAILED") throw new Error(`Tx failed: ${result.hash}`);
  }
  throw new Error("Timed out");
}

async function invoke(contract, func, args) {
  const src = await server.getAccount(pubKey);
  const tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.invokeContractFunction({
      contract,
      function: func,
      args: args.map(toScVal),
    }))
    .setTimeout(30)
    .build();
  return await simAndSend(tx);
}

function computeContractId(sourceAddr, salt) {
  const fromAddr = new xdr.ContractIdPreimageFromAddress({
    address: sourceAddr.toScAddress(),
    salt,
  });
  const preimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(fromAddr);
  const networkId = crypto.createHash("sha256").update(NETWORK_PASSPHRASE).digest();
  const envelope = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({ networkId, contractIdPreimage: preimage })
  );
  return Address.contract(crypto.createHash("sha256").update(envelope.toXDR()).digest());
}

async function main() {
  console.log(`Deployer: ${pubKey}`);

  // 1. Upload WASM
  console.log(`\nUpload escrow WASM...`);
  const wasm = readFileSync(WASM_PATH);
  let src = await server.getAccount(pubKey);
  let tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(30)
    .build();
  const uploadSim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(uploadSim)) throw new Error(`Upload sim err: ${uploadSim.error}`);
  const wasmHash = Buffer.from(uploadSim.result.retval.bytes());
  console.log(`  WASM hash: ${wasmHash.toString("hex")}`);
  await simAndSend(tx);

  // 2. Create escrow contract
  console.log(`\nCreate escrow contract (XLM SAC: ${XLM_SAC})...`);
  const salt = crypto.randomBytes(32);
  const deployerAddr = Address.account(kp.rawPublicKey());
  const contractAddr = computeContractId(deployerAddr, salt);
  console.log(`  Contract: ${contractAddr.toString()}`);
  src = await server.getAccount(pubKey);
  tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.createCustomContract({ wasmHash, salt, address: deployerAddr }))
    .setTimeout(30)
    .build();
  await simAndSend(tx);
  console.log(`  Created`);

  // 3. Initialize
  console.log(`\nInitialize...`);
  await invoke(contractAddr.toString(), "initialize", [pubKey, pubKey, XLM_SAC, XLM_SAC]);
  console.log(`  Initialized`);

  // 4. Fund escrow with 1 XLM (10_000_000 stroops)
  console.log(`\nFund escrow with 1 XLM...`);
  const taskKey = Buffer.from(crypto.randomBytes(32));
  const amount = BigInt(10_000_000); // 1 XLM = 10_000_000 stroops, same as 1 USDC with 7 decimals
  const fundHash = await invoke(contractAddr.toString(), "fund_escrow", [pubKey, taskKey, amount, XLM_SAC]);
  console.log(`  ✅ Funded! Tx: ${fundHash}`);

  // 5. Fund worker account (must exist before receiving XLM)
  const workerKp = Keypair.random();
  const workerPub = workerKp.publicKey();
  console.log(`\nFund worker account: ${workerPub}`);
  src = await server.getAccount(pubKey);
  tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.createAccount({ destination: workerPub, startingBalance: "2" }))
    .setTimeout(30)
    .build();
  tx.sign(kp);
  const sendResult = await server.sendTransaction(tx);
  if (sendResult.status !== "PENDING") throw new Error(`Create account send err: ${sendResult.status}`);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const r2 = await server.getTransaction(sendResult.hash);
    if (r2.status === "SUCCESS") break;
    if (r2.status === "FAILED") throw new Error("Create account failed");
  }
  console.log(`  Account created`);

  // 6. Assign worker
  console.log(`\nAssign worker...`);
  await invoke(contractAddr.toString(), "assign_worker", [taskKey, workerPub]);
  console.log(`  ✅ Assigned`);

  // 6. Release
  console.log(`\nRelease...`);
  const releaseHash = await invoke(contractAddr.toString(), "release_escrow", [taskKey]);
  console.log(`  ✅ Released! Tx: ${releaseHash}`);

  console.log(`\n✅ XLM E2E TEST PASSED!`);
  console.log(`Escrow: ${contractAddr.toString()}`);
  console.log(`XLM:    ${XLM_SAC}`);
}

main().catch(e => console.error(`\n❌ Error: ${e.message}`));
