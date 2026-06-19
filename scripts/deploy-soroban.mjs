/**
 * Deploy BountixEscrow Soroban contract to Stellar testnet.
 *
 * Usage: node scripts/deploy-soroban.mjs
 *
 * Outputs: contract address to stdout + saves to .contract-address
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
const WASM_PATH = join(
  ROOT,
  "contracts/soroban/target/wasm32v1-none/release/bountix_escrow.wasm"
);
const OUTPUT_PATH = join(ROOT, ".contract-address");

async function fundWithFriendbot(pk) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${pk}`);
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("already funded")) return;
    throw new Error(`Friendbot: ${text}`);
  }
  console.log("  Funded via Friendbot");
}

async function pollTx(server, hash, maxWait = 45) {
  for (let i = 0; i < maxWait; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const receipt = await server.getTransaction(hash);
    if (receipt.status === "SUCCESS") return receipt;
    if (receipt.status === "FAILED")
      throw new Error(`Tx failed: ${hash}`);
  }
  throw new Error(`Tx timed out: ${hash}`);
}

/**
 * Build, simulate, assemble, sign, and send a Soroban transaction.
 * `sign()` mutates the tx in-place (returns void in SDK v16).
 */
async function simulateAndSend(server, tx, kp) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim))
    throw new Error(`Sim error: ${sim.error}`);

  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(kp); // mutates in-place

  const result = await server.sendTransaction(prepared);
  if (result.status === "PENDING" || result.status === "DUPLICATE") {
    return await pollTx(server, result.hash);
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
  const preimageStruct = new xdr.HashIdPreimageContractId({
    networkId,
    contractIdPreimage: preimage,
  });
  const envelope = xdr.HashIdPreimage.envelopeTypeContractId(preimageStruct);
  const hash = crypto
    .createHash("sha256")
    .update(envelope.toXDR())
    .digest();
  return Address.contract(hash);
}

async function main() {
  console.log("=== BountixEscrow Soroban Deploy ===\n");
  console.log(`RPC: ${RPC_URL}`);

  // 1. Load WASM
  const wasm = readFileSync(WASM_PATH);
  console.log(`WASM: ${wasm.length} bytes`);

  // 2. Keypair
  const kp = process.env.PRIVATE_KEY
    ? Keypair.fromSecret(process.env.PRIVATE_KEY)
    : Keypair.random();
  console.log(`Account: ${kp.publicKey()}`);
  if (!process.env.PRIVATE_KEY) {
    console.log(`  Secret: ${kp.secret()}  ← SAVE THIS!`);
  }

  // 3. Fund
  console.log("\nFunding account...");
  await fundWithFriendbot(kp.publicKey());
  await new Promise((r) => setTimeout(r, 3000));

  const server = new rpc.Server(RPC_URL, { allowHttp: true });

  // 4. Upload WASM
  console.log("\nUploading WASM...");
  const source = await server.getAccount(kp.publicKey());

  const uploadTx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(30)
    .build();

  const uploadSim = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(uploadSim))
    throw new Error(`Upload sim error: ${uploadSim.error}`);

  // Extract WASM hash from simulation return value (ScVal bytes)
  const wasmHashBytes = uploadSim.result.retval.bytes();
  const wasmHash = Buffer.from(wasmHashBytes);
  console.log(`  WASM hash: ${wasmHash.toString("hex")}`);

  const uploadPrepared = rpc.assembleTransaction(uploadTx, uploadSim).build();
  uploadPrepared.sign(kp); // mutates in-place — discard return value
  const uploadResult = await server.sendTransaction(uploadPrepared);
  if (!(uploadResult.status === "PENDING" || uploadResult.status === "DUPLICATE"))
    throw new Error(`Upload send error: ${uploadResult.status}`);

  await pollTx(server, uploadResult.hash);
  console.log("  Upload confirmed");

  // 5. Create contract
  console.log("\nCreating contract...");
  const source2 = await server.getAccount(kp.publicKey());
  const salt = crypto.randomBytes(32);
  const deployerAddr = Address.account(kp.rawPublicKey());

  // Compute contract ID deterministically (same salt as in the operation)
  const contractAddr = computeContractId(deployerAddr, salt);
  console.log(`  Contract ID: ${contractAddr.toString()}`);

  const deployTx = new TransactionBuilder(source2, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        wasmHash,
        salt,
        address: deployerAddr,
      })
    )
    .setTimeout(30)
    .build();

  await simulateAndSend(server, deployTx, kp);
  console.log("  Contract created");

  // 6. Initialize contract
  console.log("\nInitializing contract...");
  const source3 = await server.getAccount(kp.publicKey());
  const adminAddr = deployerAddr;
  const treasuryAddr = deployerAddr;

  // Stellar testnet token contracts (SEP-41). USDT falls back to USDC for local
  // test deployments until a dedicated testnet USDT contract is configured.
  const USDC_CONTRACT_ID =
    process.env.NEXT_PUBLIC_SOROBAN_USDC_ADDRESS ??
    "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const USDT_CONTRACT_ID =
    process.env.NEXT_PUBLIC_SOROBAN_USDT_ADDRESS ?? USDC_CONTRACT_ID;
  const usdcAddr = Address.fromString(USDC_CONTRACT_ID);
  const usdtAddr = Address.fromString(USDT_CONTRACT_ID);

  console.log(`  Admin:    ${adminAddr.toString()}`);
  console.log(`  Treasury: ${treasuryAddr.toString()}`);
  console.log(`  USDC:     ${usdcAddr.toString()}`);
  console.log(`  USDT:     ${usdtAddr.toString()}`);

  const initArgs = [
    nativeToScVal(adminAddr),
    nativeToScVal(treasuryAddr),
    nativeToScVal(usdcAddr),
    nativeToScVal(usdtAddr),
  ];

  const initTx = new TransactionBuilder(source3, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractAddr.toString(),
        function: "initialize",
        args: initArgs,
      })
    )
    .setTimeout(30)
    .build();

  console.log("  Simulating init...");
  const initSim = await server.simulateTransaction(initTx);
  if (rpc.Api.isSimulationError(initSim))
    throw new Error(`Init sim error: ${initSim.error}`);
  console.log("  Init simulation OK");

  console.log("  Assembling init tx...");
  const initAssembled = rpc.assembleTransaction(initTx, initSim);
  console.log(`  Assembled type: ${initAssembled?.constructor?.name}`);
  const initPrepared = initAssembled.build();
  console.log(`  Built type: ${initPrepared?.constructor?.name}`);
  initPrepared.sign(kp);

  console.log("  Sending init tx...");
  const initResult = await server.sendTransaction(initPrepared);
  if (initResult.status === "PENDING" || initResult.status === "DUPLICATE") {
    await pollTx(server, initResult.hash);
    console.log("  Init confirmed");
  } else {
    throw new Error(`Init error: ${initResult.status} ${initResult.error || ""}`);
  }

  // 7. Save & print
  writeFileSync(OUTPUT_PATH, contractAddr.toString(), "utf-8");
  console.log(`\n✅ Done!`);
  console.log(`Contract ID: ${contractAddr.toString()}`);
  console.log(`Deployer:    ${kp.publicKey()}`);
  console.log(`Saved to:    ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("\n❌ Failed:", e.message);
  process.exit(1);
});
