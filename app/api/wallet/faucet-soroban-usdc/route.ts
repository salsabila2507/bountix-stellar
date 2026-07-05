import { NextRequest, NextResponse } from "next/server"
import {
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  rpc,
  Operation,
  Address,
  xdr,
} from "@stellar/stellar-sdk"
import { STELLAR_USDC_ADDRESS } from "@/lib/payments"

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org"
const ADMIN_KEY = process.env.PRIVATE_KEY
const FAUCET_AMOUNT = BigInt(100) * BigInt(10_000_000) // 100 USDC in base units (7 decimals)

export async function GET() {
  return NextResponse.json({ configured: !!ADMIN_KEY, amount: "100", token: "Soroban USDC" })
}

export async function POST(req: NextRequest) {
  try {
    if (!ADMIN_KEY) {
      return NextResponse.json({ error: "PRIVATE_KEY not configured" }, { status: 500 })
    }

    const { publicKey } = await req.json()
    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json({ error: "Missing publicKey" }, { status: 400 })
    }

    const adminKp = Keypair.fromSecret(ADMIN_KEY)
    const server = new rpc.Server(SOROBAN_RPC_URL)
    const sourceAccount = await server.getAccount(adminKp.publicKey())

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: STELLAR_USDC_ADDRESS,
          function: "transfer",
          args: [
            Address.fromString(adminKp.publicKey()).toScVal(),
            Address.fromString(publicKey).toScVal(),
            xdr.ScVal.scvI128(
              new xdr.Int128Parts({
                lo: FAUCET_AMOUNT,
                hi: 0n,
              }),
            ),
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
    preparedTx.sign(adminKp)

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
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
