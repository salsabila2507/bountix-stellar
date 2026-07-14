import { NextRequest, NextResponse } from "next/server"
import {
  Keypair,
  Account,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  rpc,
  Operation,
  Address,
  nativeToScVal,
} from "@stellar/stellar-sdk"
import { STELLAR_USDC_ADDRESS } from "@/lib/payments"

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org"
const FAUCET_SECRET = process.env.USDC_FAUCET_SECRET
const FAUCET_AMOUNT = BigInt(100) * BigInt(10_000_000) // 100 USDC in base units (7 decimals)

export async function GET() {
  if (!FAUCET_SECRET) {
    return NextResponse.json({ configured: false, error: "USDC_FAUCET_SECRET not set" })
  }
  const kp = Keypair.fromSecret(FAUCET_SECRET)
  return NextResponse.json({ configured: true, issuer: kp.publicKey(), amount: "100", token: "Soroban USDC" })
}

export async function POST(req: NextRequest) {
  try {
    if (!FAUCET_SECRET) {
      return NextResponse.json({ error: "USDC_FAUCET_SECRET not configured" }, { status: 500 })
    }

    const { publicKey } = await req.json()
    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json({ error: "Missing publicKey" }, { status: 400 })
    }

    const faucetKp = Keypair.fromSecret(FAUCET_SECRET)
    const server = new rpc.Server(SOROBAN_RPC_URL)
    const rpcAccount = await server.getAccount(faucetKp.publicKey())
    const sourceAccount = new Account(
      rpcAccount.accountId(),
      rpcAccount.sequenceNumber(),
    )

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: STELLAR_USDC_ADDRESS,
          function: "transfer",
          args: [
            Address.fromString(faucetKp.publicKey()).toScVal(),
            Address.fromString(publicKey).toScVal(),
            nativeToScVal(FAUCET_AMOUNT, { type: "i128" }),
          ],
        }),
      )
      .setTimeout(30)
      .build()

    const simulation = await server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(simulation)) {
      const errMsg = simulation.error ?? "Simulation failed"
      return NextResponse.json({ error: `Soroban simulation error: ${errMsg}` }, { status: 500 })
    }

    const preparedTx = rpc.assembleTransaction(tx, simulation).build()
    preparedTx.sign(faucetKp)

    const result = await server.sendTransaction(preparedTx)
    if (result.status !== "PENDING" && result.status !== "DUPLICATE") {
      return NextResponse.json({ error: `Soroban send error: ${result.status}` }, { status: 500 })
    }

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const receipt = await server.getTransaction(result.hash)
      if (receipt.status === "SUCCESS") {
        return NextResponse.json({ success: true, txHash: result.hash, amount: "100", token: "Soroban USDC" })
      }
      if (receipt.status === "FAILED") {
        return NextResponse.json({ error: "Soroban transaction failed" }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Transaction timed out" }, { status: 500 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
