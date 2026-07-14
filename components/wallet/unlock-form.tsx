"use client"

import { useState } from "react"
import { useWallet } from "@/lib/stellar/wallet-context"

export function UnlockForm() {
  const { unlock } = useWallet()
  const [pincode, setPincode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="mt-6 space-y-4">
      <input
        type="password"
        value={pincode}
        onChange={(e) => {
          setPincode(e.target.value)
          setError(null)
        }}
        autoComplete="current-password"
        className="block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-center text-lg font-bold text-[#140625] outline-none focus:bg-white"
        placeholder="Password or pincode"
        autoFocus
      />

      {error && (
        <div className="rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] px-3 py-2 text-sm font-bold text-[#140625]">
          {error}
        </div>
      )}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={loading || pincode.length < 4}
        onClick={async () => {
          setLoading(true)
          setError(null)
          try {
            await unlock(pincode)
          } catch {
            setError("Wrong password or pincode")
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? (
          <span className="loading loading-spinner text-[#140625]" />
        ) : (
          "Unlock"
        )}
      </button>
    </div>
  )
}
