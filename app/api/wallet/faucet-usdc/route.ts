import { NextRequest, NextResponse } from "next/server"
import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Horizon,
} from "@stellar/stellar-sdk"

const HORIZON_URL = "https://horizon-testnet.stellar.org"
const server = new Horizon.Server(HORIZON_URL, { allowHttp: true })
const NETWORK = "Test SDF Network ; September 2015"
const FAUCET_AMOUNT = "100"

export async function GET() {
  const secret = process.env.USDC_FAUCET_SECRET
  if (!secret) {
    return NextResponse.json(
      { configured: false, error: "Faucet not configured" },
      { status: 200 },
    )
  }
  const kp = Keypair.fromSecret(secret)
  return NextResponse.json({
    configured: true,
    issuer: kp.publicKey(),
    asset: "USDC",
  })
}

export async function POST(req: NextRequest) {
  try {
    const { publicKey } = await req.json()
    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json({ error: "Missing publicKey" }, { status: 400 })
    }

    const secret = process.env.USDC_FAUCET_SECRET
    if (!secret) {
      return NextResponse.json(
        {
          error:
            "Faucet not configured. Hit GET /api/wallet/faucet-setup first, then save USDC_FAUCET_SECRET to .env.local",
        },
        { status: 500 },
      )
    }

    const faucetKp = Keypair.fromSecret(secret)
    const faucetPub = faucetKp.publicKey()
    const usdcAsset = new Asset("USDC", faucetPub)

    // Check faucet account exists and fund if needed
    try {
      await server.loadAccount(faucetPub)
    } catch {
      const fbResp = await fetch(
        `https://friendbot.stellar.org?addr=${faucetPub}`,
      )
      if (!fbResp.ok) {
        return NextResponse.json(
          { error: "Failed to fund faucet account via friendbot" },
          { status: 500 },
        )
      }
    }

    // Check if user account exists on network
    let userExists = true
    try {
      await server.loadAccount(publicKey)
    } catch {
      userExists = false
    }

    if (!userExists) {
      return NextResponse.json(
        {
          needsFunding: true,
          issuer: faucetPub,
          message: "Account not found on network. Fund with XLM via Friendbot first, then retry.",
        },
        { status: 200 },
      )
    }

    // Check if user has trustline for faucet USDC
    let hasTrustline = false
    try {
      const userAcc = await server.loadAccount(publicKey)
      hasTrustline = (userAcc.balances as any[]).some(
        (b: any) =>
          b.asset_code === "USDC" && b.asset_issuer === faucetPub,
      )
    } catch {
      // account doesn't exist, handled above
    }

    if (!hasTrustline) {
      return NextResponse.json(
        {
          needsTrustline: true,
          issuer: faucetPub,
          message: "Add a trustline for USDC issued by the faucet, then retry.",
        },
        { status: 200 },
      )
    }

    // Build and submit payment: faucet sends USDC to user
    const faucetAcc = await server.loadAccount(faucetPub)
    const tx = new TransactionBuilder(faucetAcc, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK,
    })
      .addOperation(
        Operation.payment({
          destination: publicKey,
          asset: usdcAsset,
          amount: FAUCET_AMOUNT,
        }),
      )
      .setTimeout(30)
      .build()

    tx.sign(faucetKp)

    const result = await server.submitTransaction(tx)

    return NextResponse.json({
      success: true,
      amount: FAUCET_AMOUNT,
      asset: "USDC",
      issuer: faucetPub,
      txHash: result.hash,
    })
  } catch (err: any) {
    const msg = err?.response?.data?.extras?.result_codes
      ? JSON.stringify(err.response.data.extras.result_codes)
      : err?.message ?? "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
