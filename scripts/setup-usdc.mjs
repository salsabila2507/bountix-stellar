/**
 * Set up USDC trustline and get testnet USDC for the deployer account.
 *
 * Usage: node scripts/setup-usdc.mjs
 */

import "dotenv/config";
import {
  Keypair,
  Asset,
  Networks,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Horizon,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const USDC_CODE = "USDC";
const USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const kp = process.env.PRIVATE_KEY
  ? Keypair.fromSecret(process.env.PRIVATE_KEY)
  : Keypair.random();
console.log(`Account: ${kp.publicKey()}`);

const server = new Horizon.Server(HORIZON_URL);

// Check existing trustlines
let account;
try {
  account = await server.loadAccount(kp.publicKey());
  const usdcBalance = account.balances.find(
    (b) => b.asset_code === USDC_CODE && b.asset_issuer === USDC_ISSUER,
  );
  if (usdcBalance) {
    console.log(`USDC trustline exists. Balance: ${usdcBalance.balance}`);
  } else {
    console.log("No USDC trustline. Creating one...");
    const usdcAsset = new Asset(USDC_CODE, USDC_ISSUER);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: usdcAsset }))
      .setTimeout(30)
      .build();

    tx.sign(kp);
    const result = await server.submitTransaction(tx);
    console.log(`Trustline created! Tx: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
  }
} catch (e) {
  if (e.response?.status === 404) {
    console.log("Account not found on Horizon. Fund with friendbot first.");
    const res = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
    const data = await res.json();
    console.log(`Funded. Hash: ${data.hash}`);
    // Retry trustline
    account = await server.loadAccount(kp.publicKey());
    const usdcAsset = new Asset(USDC_CODE, USDC_ISSUER);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: usdcAsset }))
      .setTimeout(30)
      .build();
    tx.sign(kp);
    const result = await server.submitTransaction(tx);
    console.log(`Trustline created! Tx: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
  } else {
    throw e;
  }
}

// Try Circle Faucet
console.log("\nRequesting testnet USDC from Circle Faucet...");
try {
  const faucetRes = await fetch("https://api.faucet.circle.com/v1/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: kp.publicKey(),
      network: "stellar-testnet",
      asset: "USDC",
    }),
  });
  const faucetData = await faucetRes.json();
  if (faucetRes.ok) {
    console.log(`✅ Faucet response:`, JSON.stringify(faucetData));
  } else {
    console.log(`❌ Faucet error: ${faucetData.message || faucetData.error || faucetRes.status}`);
    console.log(`   Try visiting https://faucet.circle.com manually.`);
  }
} catch (e) {
  console.log(`❌ Faucet request failed: ${e.message}`);
  console.log(`   Try visiting https://faucet.circle.com manually.`);
}

// Check final balance
console.log("\nFinal balances:");
account = await server.loadAccount(kp.publicKey());
for (const b of account.balances) {
  if (b.asset_type === "native") console.log(`  XLM: ${b.balance}`);
  else console.log(`  ${b.asset_code}: ${b.balance} (issuer: ${b.asset_issuer})`);
}
