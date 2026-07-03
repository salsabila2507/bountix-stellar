import { NextResponse } from "next/server"
import { Keypair } from "@stellar/stellar-sdk"

export async function GET() {
  const existing = process.env.USDC_FAUCET_SECRET
  if (existing) {
    const kp = Keypair.fromSecret(existing)
    return NextResponse.json({
      publicKey: kp.publicKey(),
      message: "Faucet already configured",
    })
  }

  const kp = Keypair.random()
  const resp = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`)
  if (!resp.ok) {
    const text = await resp.text()
    return NextResponse.json(
      { error: "Failed to fund faucet account via friendbot", detail: text },
      { status: 500 },
    )
  }

  const secret = kp.secret()
  return NextResponse.json({
    publicKey: kp.publicKey(),
    secret,
    message:
      "Save this secret to USDC_FAUCET_SECRET in .env.local or Vercel env vars. It will NOT be shown again.",
  })
}
