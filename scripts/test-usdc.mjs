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

const USDC_SAC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
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

  // 1. Check SAC balance
  console.log(`\nCheck USDC SAC balance...`);
  const balSim = await server.simulateTransaction(
    new TransactionBuilder(await server.getAccount(pubKey), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.invokeContractFunction({
        contract: USDC_SAC,
        function: "balance",
        args: [Address.fromString(pubKey).toScVal()],
      }))
      .setTimeout(30)
      .build()
  );
  if (rpc.Api.isSimulationError(balSim)) {
    console.log(`  Balance error: ${balSim.error}`);
    return;
  }
  const balVal = balSim.result.retval;
  console.log(`  SAC balance raw: ${JSON.stringify(balVal)}`);

  // 2. Upload escrow WASM
  console.log(`\nUpload escrow WASM...`);
  const wasm = readFileSync(WASM_PATH);
  let src = await server.getAccount(pubKey);
  let tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(30)
    .build();
  const uploadSim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(uploadSim)) throw new Error(`Upload sim err: ${uploadSim.error}`);
  const wasmHashBytes = uploadSim.result.retval.bytes();
  const wasmHash = Buffer.from(wasmHashBytes);
  console.log(`  WASM hash: ${wasmHash.toString("hex")}`);
  await simAndSend(tx);

  // 3. Create escrow contract
  console.log(`\nCreate escrow contract (USDC: ${USDC_SAC})...`);
  const salt = crypto.randomBytes(32);
  const deployerAddr = Address.account(kp.rawPublicKey());
  const contractAddr = computeContractId(deployerAddr, salt);
  console.log(`  Contract: ${contractAddr.toString()}`);
  src = await server.getAccount(pubKey);
  tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.createCustomContract({
      wasmHash,
      salt,
      address: deployerAddr,
    }))
    .setTimeout(30)
    .build();
  await simAndSend(tx);
  console.log(`  Created`);

  // 4. Initialize
  console.log(`\nInitialize...`);
  await invoke(contractAddr.toString(), "initialize", [
    pubKey, pubKey, USDC_SAC
  ]);
  console.log(`  Initialized`);

  // 5. Fund escrow with 1 USDC
  console.log(`\nFund escrow with 1 USDC...`);
  const taskKey = Buffer.from(crypto.randomBytes(32));
  const amount = BigInt(10_000_000);
  const hash = await invoke(contractAddr.toString(), "fund_escrow", [
    pubKey, taskKey, amount
  ]);
  console.log(`  ✅ Funded! Tx: ${hash}`);

  // 6. Assign worker
  const workerKp = Keypair.random();
  console.log(`\nAssign worker: ${workerKp.publicKey()}`);
  await invoke(contractAddr.toString(), "assign_worker", [taskKey, workerKp.publicKey()]);
  console.log(`  ✅ Assigned`);

  // 7. Release
  console.log(`\nRelease...`);
  await invoke(contractAddr.toString(), "release_escrow", [taskKey]);
  console.log(`  ✅ Released`);

  console.log(`\n✅ USDC E2E TEST PASSED!`);
  console.log(`Escrow: ${contractAddr.toString()}`);
  console.log(`USDC:   ${USDC_SAC}`);
}

main().catch(e => console.error(`\n❌ Error: ${e.message}`));
