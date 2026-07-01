"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/stellar/wallet-context"
import { friendbotFund } from "@/lib/stellar/horizon"

export default function WalletSignup() {
  const router = useRouter()
  const { createWallet, isLoaded } = useWallet()
  const [pincode, setPincode] = useState("")
  const [confirmPincode, setConfirmPincode] = useState("")
  const [step, setStep] = useState<"create" | "funding" | "done">("create")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  const handleCreate = async () => {
    setError(null)
    if (pincode.length < 4) {
      setError("Pincode must be at least 4 characters")
      return
    }
    if (pincode !== confirmPincode) {
      setError("Pincodes do not match")
      return
    }
    setLoading(true)
    try {
      const wallet = await createWallet(pincode)
      setPublicKey(wallet.publicKey)
      setStep("funding")
      const resp = await friendbotFund(wallet.publicKey)
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`Friendbot error: ${text}`)
      }
      setStep("done")
    } catch (err: any) {
      setError(err.message ?? "Failed to create wallet")
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card bg-base-200 shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold">Wallet Created!</h1>
          <p className="text-base-content/70 break-all font-mono text-sm">{publicKey}</p>
          <p className="text-sm text-base-content/60">
            Funded with 10,000 testnet XLM via Friendbot.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/wallet")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="card bg-base-200 shadow-xl max-w-md w-full p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Create Wallet</h1>
        <p className="text-base-content/70 text-sm text-center">
          Set a pincode to encrypt your Stellar secret key. It stays in your browser.
        </p>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Pincode</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            className="input input-bordered w-full text-center text-lg tracking-widest"
            placeholder="• • • • • •"
            autoFocus
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Confirm Pincode</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPincode}
            onChange={(e) => setConfirmPincode(e.target.value.replace(/\D/g, ""))}
            className="input input-bordered w-full text-center text-lg tracking-widest"
            placeholder="• • • • • •"
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === "funding" && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="loading loading-spinner" />
            Funding account via Friendbot...
          </div>
        )}

        <button
          className="btn btn-primary w-full"
          onClick={handleCreate}
          disabled={loading || pincode.length < 4 || pincode !== confirmPincode}
        >
          {loading ? <span className="loading loading-spinner" /> : "Create Wallet"}
        </button>
      </div>
    </div>
  )
}
