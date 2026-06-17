import "dotenv/config";
import { Keypair, Address, Operation, TransactionBuilder, BASE_FEE, Networks, rpc, nativeToScVal, xdr } from "@stellar/stellar-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC_URL);
const kp = Keypair.fromSecret(process.env.PRIVATE_KEY);
const pubKey = kp.publicKey();

const ESCROW = "CDHGTOJVVLMNTWYMUKZV7TFBZRE7JOXSTREE6IQYVZRDVKZE5J4MG7TP";

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

async function invoke(func, args) {
  const src = await server.getAccount(pubKey);
  const tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.invokeContractFunction({ contract: ESCROW, function: func, args: args.map(toScVal) }))
    .setTimeout(30)
    .build();
  return await send(tx);
}

const tasks = [
  { id: "1128362f-09d1-4fa2-8a02-a863d9ef9cda", reward: 50, title: "Design Bountix banner" },
  { id: "2ebfd500-5df4-4896-a1b1-061a7952c68f", reward: 30, title: "Write product launch thread" },
  { id: "6456e00d-d1d8-4d91-b4fe-5d2bd3a85dae", reward: 25, title: "Test our Stellar escrow flow" },
  { id: "4613fd3f-aca5-498b-9c2f-f50eda106575", reward: 40, title: "Translate landing page (ID)" },
  { id: "0d0730bc-c00f-48b4-bb5a-c289442dafd7", reward: 75, title: "Record demo video" },
];

async function main() {
  console.log(`Deployer: ${pubKey}`);
  console.log(`Escrow:   ${ESCROW}\n`);

  for (const task of tasks) {
    const hex = task.id.replace(/-/g, "").toLowerCase();
    const taskKey = Buffer.from(hex.padStart(64, "0"), "hex");
    const amount = BigInt(task.reward) * BigInt(10_000_000); // 1 XLM = 10^7 stroops

    console.log(`[${task.title}] Funding ${task.reward} XLM...`);
    const hash = await invoke("fund_escrow", [pubKey, taskKey, amount]);
    console.log(`  ✅ ${hash}\n`);
  }

  console.log("✅ All tasks funded!");
}

main().catch(e => console.error(`\n❌ ${e.message}`));
