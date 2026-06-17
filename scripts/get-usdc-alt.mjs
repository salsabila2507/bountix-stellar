/**
 * Create a fresh testnet account, get USDC from Circle Faucet,
 * then transfer to the deployer.
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
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const DEPLOYER_PK = (() => {
  const kp = process.env.PRIVATE_KEY
    ? Keypair.fromSecret(process.env.PRIVATE_KEY)
    : null;
  return kp ? kp.publicKey() : null;
})();

async function createAndFund() {
  const kp = Keypair.random();
  console.log(`New account: ${kp.publicKey()}`);
  console.log(`Secret: ${kp.secret()} (save this)`);

  // Fund with friendbot
  const res = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`Friendbot: ${await res.text()}`);
  console.log("  Funded with XLM");

  // Create USDC trustline
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(kp.publicKey());
  const usdcAsset = new Asset(USDC_CODE, USDC_ISSUER);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(30)
    .build();
  tx.sign(kp);
  await server.submitTransaction(tx);
  console.log("  USDC trustline created");

  // Try Circle Faucet
  console.log("  Requesting USDC from Circle Faucet...");
  try {
    const faucetRes = await fetch("https://faucet.circle.com/api/request2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: kp.publicKey(),
        network: "stellar-testnet",
        asset: "USDC",
        amount: 20,
      }),
    });
    const text = await faucetRes.text();
    console.log(`  Faucet response (${faucetRes.status}): ${text}`);
  } catch (e) {
    console.log(`  Faucet error: ${e.message}`);
  }

  // Check balance
  const account2 = await server.loadAccount(kp.publicKey());
  const usdcBal = account2.balances.find(
    (b) => b.asset_code === USDC_CODE,
  );
  console.log(`  USDC balance: ${usdcBal?.balance || 0}`);

  // Transfer to deployer if we have USDC and deployer address
  if (DEPLOYER_PK && usdcBal && parseFloat(usdcBal.balance) > 0) {
    console.log(`\nTransferring ${usdcBal.balance} USDC to deployer ${DEPLOYER_PK}...`);
    const account3 = await server.loadAccount(kp.publicKey());
    const usdcAsset2 = new Asset(USDC_CODE, USDC_ISSUER);
    const transferTx = new TransactionBuilder(account3, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: DEPLOYER_PK,
          asset: usdcAsset2,
          amount: usdcBal.balance,
        }),
      )
      .setTimeout(30)
      .build();
    transferTx.sign(kp);
    const result = await server.submitTransaction(transferTx);
    console.log(`  Transferred! Tx: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
  }

  return kp;
}

createAndFund().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
