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
  const [step, setStep] = useState<"intro" | "create" | "confirm" | "funding" | "done">("intro")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [fundMessage, setFundMessage] = useState<string | null>(null)

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
          {fundMessage && (
            <p className="text-sm text-base-content/60">{fundMessage}</p>
          )}
          <p className="text-xs text-warning font-bold">
            ⚠️ Your secret key is encrypted in your browser. There is no recovery — if you lose your pincode or clear browser data, your wallet is gone.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/wallet")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (step === "confirm" && publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card bg-base-200 shadow-xl max-w-md w-full p-8 space-y-4">
          <h1 className="text-2xl font-bold text-center">Wallet Generated</h1>
          <p className="text-base-content/70 text-sm text-center">
            Your Stellar keypair is ready. The secret key is encrypted in your browser.
          </p>

          <div className="bg-base-300 rounded-lg p-4 space-y-2">
            <p className="text-xs font-bold uppercase opacity-60">Public Key</p>
            <p className="font-mono text-sm break-all">{publicKey}</p>
          </div>

          <p className="text-xs text-warning font-bold text-center">
            ⚠️ Save your pincode. If you lose it or clear your browser data, this wallet cannot be recovered.
          </p>

          <div className="divider text-xs uppercase opacity-60">Funding</div>
          <p className="text-sm text-base-content/70 text-center">
            You need testnet XLM to submit transactions. Friendbot gives you 10,000 free testnet XLM.
          </p>

          <button
            className="btn btn-primary w-full"
            onClick={async () => {
              setStep("funding")
              setError(null)
              try {
                const resp = await friendbotFund(publicKey)
                if (resp.ok) {
                  setFundMessage("Funded with 10,000 testnet XLM via Friendbot.")
                } else {
                  const text = await resp.text()
                  setFundMessage("Created without funding. You can fund the wallet later.")
                  console.warn("Friendbot responded:", text)
                }
              } catch {
                setFundMessage("Created without funding. You can fund the wallet later.")
                console.warn("Friendbot unreachable")
              }
              setStep("done")
            }}
          >
            Fund via Friendbot (10,000 testnet XLM)
          </button>

          <button
            className="btn btn-outline w-full"
            onClick={() => {
              setFundMessage("Created without funding.")
              setStep("done")
            }}
          >
            Skip — fund manually later
          </button>
        </div>
      </div>
    )
  }

  if (step === "funding") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card bg-base-200 shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Funding Wallet</h1>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="loading loading-spinner" />
            Funding account via Friendbot...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="card bg-base-200 shadow-xl max-w-md w-full p-8 space-y-4">
        {step === "intro" ? (
          <>
            <h1 className="text-2xl font-bold text-center">Stellar Wallet</h1>
            <p className="text-base-content/70 text-sm text-center">
              This creates a Stellar keypair (public + secret key) for the Stellar testnet.
            </p>
            <div className="bg-base-300 rounded-lg p-4 space-y-2 text-sm">
              <p>🔑 <strong>Keypair</strong> — A Stellar address and its secret key. Your address is public; your secret key stays private.</p>
              <p>🔒 <strong>Pincode</strong> — Your secret key is encrypted in your browser using the pincode. Only you can unlock your wallet.</p>
              <p>🪙 <strong>Testnet XLM</strong> — You will need testnet XLM to send transactions. Friendbot can fund you with 10,000 free XLM.</p>
            </div>
            <p className="text-xs text-warning font-bold text-center">
              ⚠️ There is no server-side backup. If you lose your pincode or clear browser data, the wallet is gone forever.
            </p>
            <button className="btn btn-primary w-full" onClick={() => setStep("create")}>
              Create Wallet
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center">Set Pincode</h1>
            <p className="text-base-content/70 text-sm text-center">
              Your secret key will be encrypted in your browser using this pincode.
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

            {error && <div className="alert alert-error text-sm">{error}</div>}

            <button
              className="btn btn-primary w-full"
              onClick={async () => {
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
                  setStep("confirm")
                } catch (err: any) {
                  setError(err?.message ?? "Failed to create wallet")
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading || pincode.length < 4 || pincode !== confirmPincode}
            >
              {loading ? <span className="loading loading-spinner" /> : "Generate Wallet"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
