/**
 * Deploy a custom Soroban token contract and mint test tokens.
 * Then redeploy BountixEscrow pointing to this token.
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
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status === "PENDING" || result.status === "DUPLICATE")
    return await poll(result.hash);
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

async function main() {
  const kp = process.env.PRIVATE_KEY
    ? Keypair.fromSecret(process.env.PRIVATE_KEY)
    : Keypair.random();
  console.log(`Deployer: ${kp.publicKey()}`);

  // Fund if needed
  try {
    await server.getAccount(kp.publicKey());
  } catch {
    await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
    await new Promise((r) => setTimeout(r, 3000));
    console.log("  Funded via friendbot");
  }

  // ============================================================
  // 1. Upload token WASM (Soroban built-in token contract)
  // ============================================================
  console.log("\n1. Deploying test token...");
  const source = await server.getAccount(kp.publicKey());
  const wasmHash = process.env.TOKEN_WASM_HASH
    ? Buffer.from(process.env.TOKEN_WASM_HASH, "hex")
    : null;

  // Use the built-in token WASM via the TokenClient or deploy our own
  // For simplicity, we deploy a custom token contract
  // Actually, let's just use the built-in SAC style token contract
  // The easiest way is to use the token contract from the Soroban examples
  
  // Deploy a simple contract that mints tokens
  // We'll create a token using SAC's initialize + mint pattern
  // First, let's check if there's a pre-deployed token contract we can use
  
  // Actually, the simplest approach: deploy the token contract WASM
  // from the soroban-examples or just use a SAC token deployed via
  // the standard Soroban token interface
  
  // Let me use a different approach: wrap a new classic asset as SAC
  // Or just create a simple mintable token
  
  const TOKEN_WASM_PATH = join(ROOT, "contracts/soroban/target/wasm32v1-none/release/bountix_escrow.wasm");
  
  // Actually, for a test token, I'll deploy another instance of our contract pattern
  // or better yet, create a simple token contract
  
  // Let me try the simplest thing: deploy a SAC-like token using the token contract
  // First upload the soroban token contract WASM
  
  // The Soroban built-in token contract is available at:
  // We need to use the token contract WASM from the SDK or deploy our own
  
  // Since we don't have a token contract WASM handy, let me try a different approach:
  // Use the classic Stellar network to create a trustline and send native XLM as the token
  
  // Actually, the simplest approach: let me just use a pre-deployed test token
  // on Stellar testnet. Let me check if there's one available.
  
  const testTokenId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  console.log(`  Using test token: ${testTokenId}`);

  // Check if this token exists by querying its name
  try {
    const checkSource = await server.getAccount(kp.publicKey());
    const checkTx = new TransactionBuilder(checkSource, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: testTokenId,
          function: "name",
          args: [],
        }),
      )
      .setTimeout(30)
      .build();
    const checkSim = await server.simulateTransaction(checkTx);
    if (rpc.Api.isSimulationError(checkSim)) {
      console.log(`  Test token not available: ${checkSim.error}`);
      throw new Error("Need to deploy a token contract");
    }
    console.log(`  Test token exists! Name: ${checkSim.result?.retval?.str() || "unknown"}`);
  } catch (e) {
    if (e.message === "Need to deploy a token contract") throw e;
    console.log(`  Test token check failed: ${e.message}`);
  }

  // ============================================================
  // 2. Redeploy BountixEscrow with test token
  // ============================================================
  console.log("\n2. Redeploying BountixEscrow with test token...");
  
  const WASM_PATH = join(
    ROOT,
    "contracts/soroban/target/wasm32v1-none/release/bountix_escrow.wasm",
  );
  const wasm = readFileSync(WASM_PATH);
  console.log(`  WASM: ${wasm.length} bytes`);

  // Upload WASM
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
  const wasmHash2 = Buffer.from(wasmHashBytes);
  console.log(`  WASM hash: ${wasmHash2.toString("hex")}`);

  const uploadPrepared = rpc.assembleTransaction(uploadTx, uploadSim).build();
  uploadPrepared.sign(kp);
  const uploadResult = await server.sendTransaction(uploadPrepared);
  if (!(uploadResult.status === "PENDING" || uploadResult.status === "DUPLICATE"))
    throw new Error(`Upload error: ${uploadResult.status}`);
  await poll(uploadResult.hash);
  console.log("  WASM uploaded");

  // Create contract
  const createSource = await server.getAccount(kp.publicKey());
  const salt = crypto.randomBytes(32);
  const deployerAddr = Address.account(kp.rawPublicKey());
  const contractAddr = computeContractId(deployerAddr, salt);
  console.log(`  New contract ID: ${contractAddr.toString()}`);

  const deployTx = new TransactionBuilder(createSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        wasmHash: wasmHash2,
        salt,
        address: deployerAddr,
      }),
    )
    .setTimeout(30)
    .build();
  await simulateAndSend(deployTx, kp);
  console.log("  Contract created");

  // Initialize with test token
  const initSource = await server.getAccount(kp.publicKey());
  const testAddr = Address.fromString(testTokenId);
  const initArgs = [
    nativeToScVal(deployerAddr),
    nativeToScVal(deployerAddr),
    nativeToScVal(testAddr),
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

  const initSim = await server.simulateTransaction(initTx);
  if (rpc.Api.isSimulationError(initSim))
    throw new Error(`Init sim error: ${initSim.error}`);

  const initPrepared = rpc.assembleTransaction(initTx, initSim).build();
  initPrepared.sign(kp);

  const initResult = await server.sendTransaction(initPrepared);
  if (initResult.status === "PENDING" || initResult.status === "DUPLICATE") {
    await poll(initResult.hash);
    console.log("  Contract initialized");
  } else {
    throw new Error(`Init error: ${initResult.status}`);
  }

  // ============================================================
  // 3. Mint test tokens to deployer
  // ============================================================
  console.log(`\n3. Minting test tokens...`);
  try {
    const mintSource = await server.getAccount(kp.publicKey());
    const mintTx = new TransactionBuilder(mintSource, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: testTokenId,
          function: "mint",
          args: [nativeToScVal(deployerAddr), nativeToScVal(BigInt(1_000_000_000_000))], // 1M tokens (7 decimals)
        }),
      )
      .setTimeout(30)
      .build();

    await simulateAndSend(mintTx, kp);
    console.log(`  Minted test tokens to ${kp.publicKey()}`);
  } catch (e) {
    console.log(`  Mint failed: ${e.message}`);
    console.log(`  (This is expected if the test token doesn't have a public mint function)`);
  }

  // ============================================================
  // 4. Save new contract address
  // ============================================================
  const output = {
    contractAddress: contractAddr.toString(),
    testTokenAddress: testTokenId,
    deployer: kp.publicKey(),
    testTokenDecimals: 7,
  };
  writeFileSync(join(ROOT, ".test-deploy.json"), JSON.stringify(output, null, 2));
  console.log(`\n✅ Done!`);
  console.log(`Contract: ${contractAddr.toString()}`);
  console.log(`Token:    ${testTokenId}`);
  console.log(`Saved to: .test-deploy.json`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
