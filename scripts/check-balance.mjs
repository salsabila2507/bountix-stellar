import "dotenv/config";
import { Keypair, Address, Operation, TransactionBuilder, BASE_FEE, Networks, rpc, nativeToScVal } from "@stellar/stellar-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const USDC_CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const kp = process.env.PRIVATE_KEY ? Keypair.fromSecret(process.env.PRIVATE_KEY) : Keypair.random();
console.log(`Account: ${kp.publicKey()}`);

const server = new rpc.Server(RPC_URL, { allowHttp: true });

const source = await server.getAccount(kp.publicKey());
const addr = Address.account(kp.rawPublicKey());

const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({
    contract: USDC_CONTRACT,
    function: "balance",
    args: [nativeToScVal(addr)],
  }))
  .setTimeout(30)
  .build();

const sim = await server.simulateTransaction(tx);
if (rpc.Api.isSimulationError(sim)) {
  console.log(`Balance query failed: ${sim.error}`);
  // Also try checking the XLM balance via account sequence
  console.log(`Account exists (seq: ${source.sequenceNumber()})`);
} else {
  const retval = sim.result?.retval;
  if (retval?.switch?.name === "scvI128") {
    console.log(`USDC balance: ${retval.i128()} units (${Number(retval.i128()) / 10_000_000} USDC)`);
  } else {
    console.log(`Balance result:`, JSON.stringify(retval, null, 2));
  }
}

// Try XLM balance via friendbot check
try {
  const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${kp.publicKey()}`);
  const horizonData = await horizonRes.json();
  if (horizonData.balances) {
    for (const b of horizonData.balances) {
      if (b.asset_type === "native") console.log(`XLM: ${b.balance}`);
      else console.log(`${b.asset_code}: ${b.balance} (issuer: ${b.asset_issuer})`);
    }
  }
} catch (e) {
  console.log(`Horizon check: ${e.message}`);
}
