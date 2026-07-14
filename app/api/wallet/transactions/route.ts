import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const publicKey = searchParams.get("publicKey")
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100)

  if (!publicKey) return NextResponse.json({ error: "publicKey required" }, { status: 400 })

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("public_key", publicKey)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { txHash, type, amount, asset, counterparty, memo, memoType, status } = body

  if (!txHash || !type || !amount) {
    return NextResponse.json({ error: "txHash, type, amount required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      public_key: body.publicKey ?? "",
      tx_hash: txHash,
      type,
      amount,
      asset: asset ?? "XLM",
      counterparty: counterparty ?? null,
      memo: memo ?? null,
      memo_type: memoType ?? null,
      status: status ?? "success",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}
