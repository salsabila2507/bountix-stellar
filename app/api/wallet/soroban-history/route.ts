import { NextRequest, NextResponse } from "next/server"
import { rpc, StrKey, Address } from "@stellar/stellar-sdk"
import { STELLAR_USDC_ADDRESS, STELLAR_USDT_ADDRESS } from "@/lib/payments"

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org"
const CACHE_TTL = 10_000
let cache: { ts: number; transfers: TransferEvent[] } | null = null

interface TransferEvent {
  txHash: string
  ledger: number
  from: string
  to: string
  amount: string
  token: string
  timestamp: string
}

function isTransferEvent(topic: any[]): boolean {
  try {
    if (!topic || topic.length < 2) return false
    const first = topic[0]
    if (first?._switch?.name !== "scvSymbol") return false
    const symBuf = Buffer.from(first._value)
    return symBuf.toString() === "transfer"
  } catch {
    return false
  }
}

function extractAddress(scVal: any): string | null {
  try {
    if (scVal?._switch?.name !== "scvAddress") return null
    const addr = scVal._value
    if (addr?._switch?.name !== "scAddressTypeAccount") return null
    const accountId = addr._value
    if (accountId?._switch?.name !== "publicKeyTypeEd25519") return null
    const buf = Buffer.from(accountId._value)
    return StrKey.encodeEd25519PublicKey(buf)
  } catch {
    return null
  }
}

function extractI128(value: any): bigint {
  try {
    if (value._switch?.name === "scvI128") {
      const hi = BigInt(value._value?.hi?._value ?? "0")
      const lo = BigInt(value._value?.lo?._value ?? "0")
      // hi is signed, lo is unsigned
      return (hi << BigInt(64)) + lo
    }
  } catch {}
  return BigInt(0)
}

function getContractId(event: any): string {
  try {
    const buf = Buffer.from(event.contractId._id)
    return buf.toString("hex")
  } catch {
    return ""
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const publicKey = searchParams.get("publicKey")
  if (!publicKey) {
    return NextResponse.json({ error: "Missing publicKey" }, { status: 400 })
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    const filtered = cache.transfers.filter(
      (t) => t.from === publicKey || t.to === publicKey,
    )
    return NextResponse.json({ transfers: filtered })
  }

  try {
    const server = new rpc.Server(SOROBAN_RPC_URL)
    const eventsResult = await server.getEvents({
      startLedger: 0,
      filters: [
        {
          type: "contract",
          contractIds: [STELLAR_USDC_ADDRESS],
        },
      ],
      limit: 100,
    })

    const tokenMap: Record<string, string> = {
      [STELLAR_USDC_ADDRESS.toLowerCase()]: "USDC",
      [STELLAR_USDT_ADDRESS.toLowerCase()]: "USDT",
    }
    const allTransfers: TransferEvent[] = []

    for (const event of eventsResult.events) {
      try {
        const topic = event.topic as unknown as any[]
        if (!isTransferEvent(topic)) continue

        const fromAddr = extractAddress(topic[1])
        const toAddr = extractAddress(topic[2])
        if (!fromAddr || !toAddr) continue

        const amountUnits = extractI128(event.value as any)
        const amountNum = Number(amountUnits) / 10_000_000
        const amountHuman = amountNum.toFixed(7)

        const contractHex = getContractId(event)
        const token = tokenMap[contractHex] ?? contractHex.slice(0, 8)

        allTransfers.push({
          txHash: (event as any).txHash ?? "",
          ledger: event.ledger ?? 0,
          from: fromAddr,
          to: toAddr,
          amount: amountHuman,
          token,
          timestamp: event.ledgerClosedAt ?? "",
        })
      } catch {
        // skip unparseable
      }
    }

    allTransfers.sort((a, b) => b.ledger - a.ledger)

    cache = { ts: Date.now(), transfers: allTransfers }

    const userTransfers = allTransfers.filter(
      (t) => t.from === publicKey || t.to === publicKey,
    )

    return NextResponse.json({ transfers: userTransfers })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, transfers: [] }, { status: 200 })
  }
}
