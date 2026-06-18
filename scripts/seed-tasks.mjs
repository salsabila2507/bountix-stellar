import "dotenv/config";
import crypto from "crypto";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Keypair, Address, Operation, TransactionBuilder, BASE_FEE, Networks, rpc, nativeToScVal, xdr } from "@stellar/stellar-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const server = new rpc.Server(RPC_URL);
const kp = Keypair.fromSecret(process.env.PRIVATE_KEY);
const pubKey = kp.publicKey();

const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

function toScVal(v) {
  if (v instanceof xdr.ScVal) return v;
  if (typeof v === "bigint") return nativeToScVal(v, { type: "i128" });
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return xdr.ScVal.scvBytes(Buffer.from(v));
  if (typeof v === "string" && (v.startsWith("G") || v.startsWith("C")) && v.length === 56) return Address.fromString(v).toScVal();
  if (Array.isArray(v)) return xdr.ScVal.scvVec(v.map(toScVal));
  return nativeToScVal(v);
}

async function send(tx) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Sim error: ${sim.error}`);
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status !== "PENDING" && result.status !== "DUPLICATE")
    throw new Error(`Send error: ${result.status}`);
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
    .addOperation(Operation.invokeContractFunction({ contract, function: func, args: args.map(toScVal) }))
    .setTimeout(30)
    .build();
  return await send(tx);
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

const tasks = [
  { id: "1128362f-09d1-4fa2-8a02-a863d9ef9cda", reward: 50, title: "Design Bountix banner" },
  { id: "2ebfd500-5df4-4896-a1b1-061a7952c68f", reward: 30, title: "Write product launch thread" },
  { id: "6456e00d-d1d8-4d91-b4fe-5d2bd3a85dae", reward: 25, title: "Test our Stellar escrow flow" },
  { id: "4613fd3f-aca5-498b-9c2f-f50eda106575", reward: 40, title: "Translate landing page (ID)" },
  { id: "0d0730bc-c00f-48b4-bb5a-c289442dafd7", reward: 75, title: "Record demo video" },
];

async function main() {
  const WASM_PATH = join(ROOT, "contracts/soroban/target/wasm32v1-none/release/bountix_escrow.wasm");
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
  await send(tx);

  // 2. Create escrow contract
  console.log(`\nCreate escrow contract (XLM SAC: ${XLM_SAC})...`);
  const salt = crypto.randomBytes(32);
  const deployerAddr = Address.account(kp.rawPublicKey());
  const escrowAddr = computeContractId(deployerAddr, salt);
  const escrow = escrowAddr.toString();
  console.log(`  Escrow: ${escrow}`);
  src = await server.getAccount(pubKey);
  tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.createCustomContract({ wasmHash, salt, address: deployerAddr }))
    .setTimeout(30)
    .build();
  await send(tx);

  // 3. Initialize
  console.log(`\nInitialize admin=${pubKey}, treasury=${pubKey}, xlm=${XLM_SAC}...`);
  await invoke(escrow, "initialize", [pubKey, pubKey, XLM_SAC]);

  // 4. Fund tasks
  for (const task of tasks) {
    const hex = task.id.replace(/-/g, "").toLowerCase();
    const taskKey = Buffer.from(hex.padStart(64, "0"), "hex");
    const amount = BigInt(task.reward) * BigInt(10_000_000); // 1 XLM = 10^7 stroops

    console.log(`\n[${task.title}] Funding ${task.reward} XLM...`);
    const hash = await invoke(escrow, "fund_escrow", [pubKey, taskKey, amount]);
    console.log(`  ✅ ${hash}`);
  }

  console.log(`\n✅ All tasks funded! Escrow address: ${escrow}`);
  console.log(`Update lib/escrow.ts ESCROW_CONTRACT_ADDRESS to: ${escrow}`);
}

main().catch(e => console.error(`\n❌ ${e.message}`));
