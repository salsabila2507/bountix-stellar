/**
 * Create a burner account with USDC trustline for testing.
 * Outputs the secret key so the user can fund via Circle Faucet.
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

const kp = Keypair.random();
console.log(`\n=== NEW TEST ACCOUNT ===`);
console.log(`Address:     ${kp.publicKey()}`);
console.log(`Secret:      ${kp.secret()}`);
console.log(`\nSteps to fund with USDC:`);
console.log(`1. Go to https://faucet.circle.com`);
console.log(`2. Select "Stellar Testnet"`);
console.log(`3. Enter address: ${kp.publicKey()}`);
console.log(`4. Click "Send 20 USDC"`);
console.log(`\nSetting up trustline...`);

// Fund with friendbot
const fundRes = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
if (!fundRes.ok) throw new Error(`Friendbot: ${await fundRes.text()}`);
console.log("  Funded with XLM");

// Wait for account
await new Promise(r => setTimeout(r, 3000));

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
console.log(`\n✅ Ready! Fund via faucet then run: PRIVATE_KEY=${kp.secret()} node scripts/test-e2e.mjs`);
