"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useWallet } from "@/lib/stellar/wallet-context"
import { getCachedSorobanTokenBalance } from "@/lib/stellar"
import { STELLAR_USDC_ADDRESS, STELLAR_USDT_ADDRESS } from "@/lib/payments"

const KNOWN_SOROBAN_TOKENS = [
  { name: "USDC", contract: STELLAR_USDC_ADDRESS },
  { name: "USDT", contract: STELLAR_USDT_ADDRESS },
]

export default function AssetsPage() {
  const { publicKey, isLocked } = useWallet()
  const [balances, setBalances] = useState<Record<string, bigint | null>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (publicKey && !isLocked) {
      setLoading(true)
      Promise.all(
        KNOWN_SOROBAN_TOKENS.map(async (t) => {
          const bal = await getCachedSorobanTokenBalance(t.contract, publicKey, true)
          return { name: t.name, balance: bal }
        }),
      )
        .then((results) => {
          const map: Record<string, bigint | null> = {}
          for (const r of results) map[r.name] = r.balance
          setBalances(map)
        })
        .catch(() => setBalances({}))
        .finally(() => setLoading(false))
    }
  }, [publicKey, isLocked])

  if (isLocked || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm font-bold text-[#5a3b66]">Unlock your wallet first.</p>
      </div>
    )
  }

  function formatSorobanUsdc(units: bigint): string {
    const num = Number(units) / 10_000_000
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-bold text-[#5a3b66] hover:text-[#140625] transition">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-black text-[#140625]">Soroban Tokens</h1>

      <div className="comic-card p-6">
        <h2 className="text-lg font-black text-[#140625]">Your Token Balances</h2>
        <p className="mt-1 text-sm font-bold text-[#5a3b66]">
          These are SEP-41 Soroban token balances (used by the Bountix escrow).
        </p>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner text-[#38e7ff]" />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {KNOWN_SOROBAN_TOKENS.map((t) => {
              const bal = balances[t.name]
              return (
                <div
                  key={t.name}
                  className="flex items-center justify-between rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 shadow-[2px_2px_0_#140625]"
                >
                  <div>
                    <span className="font-black text-[#140625]">{t.name}</span>
                    <p className="font-mono text-xs text-[#5a3b66] truncate w-48">{t.contract}</p>
                  </div>
                  <span className="font-mono font-bold text-[#140625]">
                    {bal !== null && bal !== undefined ? formatSorobanUsdc(bal) : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
