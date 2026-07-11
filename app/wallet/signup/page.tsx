"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Asset } from "@stellar/stellar-sdk"
import { useWallet } from "@/lib/stellar/wallet-context"
import { hasWallet, importAndStoreWallet } from "@/lib/stellar/wallet-store"
import { friendbotFund } from "@/lib/stellar/horizon"
import { buildChangeTrust, signTransaction, submitTransaction } from "@/lib/stellar/transactions"
import { USDC_CLASSIC_ISSUER, USDC_CLASSIC_CODE } from "@/lib/payments"

async function saveWalletAddress(address: string): Promise<void> {
  try {
    await fetch("/api/wallet/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
  } catch {
    console.warn("Failed to save wallet address to profile")
  }
}

export default function WalletSignup() {
  const router = useRouter()
  const { createWallet, isLoaded, userId } = useWallet()
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  useEffect(() => {
    if (isLoaded && !initialCheckDone) {
      setInitialCheckDone(true)
      if (hasWallet(userId) || hasWallet(null)) {
        router.replace("/wallet")
      }
    }
  }, [isLoaded, initialCheckDone, router, userId])
  const [pincode, setPincode] = useState("")
  const [confirmPincode, setConfirmPincode] = useState("")
  const [mode, setMode] = useState<"create" | "import">("create")
  const [importSecret, setImportSecret] = useState("")
  const [step, setStep] = useState<"intro" | "create" | "confirm" | "funding" | "done">("intro")
  const [error, setError] = useState<string | null>(null)
  const [importedKey, setImportedKey] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [secretKeyBuf, setSecretKeyBuf] = useState<string | null>(null)
  const [fundMessage, setFundMessage] = useState<string | null>(null)

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-[#38e7ff]" />
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="comic-card max-w-md w-full p-8 text-center space-y-4">
          <div className="text-6xl">{importedKey ? "🔓" : "🎉"}</div>
          <h1 className="text-2xl font-black text-[#140625]">
            {importedKey ? "Wallet Imported!" : "Wallet Created!"}
          </h1>
          <p className="font-mono text-sm text-[#5a3b66] break-all">{publicKey}</p>
          {fundMessage && (
            <p className="text-sm font-bold text-[#7c3cff]">{fundMessage}</p>
          )}
          <p className="text-xs font-black text-[#ff4fb8]">
            ⚠️ Your secret key is encrypted in your browser. There is no recovery — if you lose your pincode or clear browser data, your wallet is gone.
          </p>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
            onClick={() => router.push("/wallet")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (step === "confirm" && publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="comic-card max-w-md w-full p-8 space-y-4">
          <div className="text-center">
            <p className="comic-chip bg-[#7c3cff] text-white mx-auto w-fit">
              Wallet Generated
            </p>
            <h1 className="mt-3 text-2xl font-black text-[#140625]">Keypair Ready</h1>
          </div>

          <div className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-4 shadow-[3px_3px_0_#140625] space-y-2">
            <p className="text-xs font-black uppercase text-[#5a3b66]">Public Key</p>
            <p className="font-mono text-sm break-all text-[#140625]">{publicKey}</p>
          </div>

          <p className="text-xs font-black text-[#ff4fb8] text-center">
            ⚠️ Save your pincode. If you lose it or clear your browser data, this wallet cannot be recovered.
          </p>

          <div className="border-t-2 border-[#140625]/20 pt-4 text-center">
            <p className="text-xs font-black uppercase text-[#5a3b66] mb-2">Funding</p>
            <p className="text-sm font-bold text-[#3c214b]">
              You need testnet XLM to submit transactions. Friendbot gives you 10,000 free testnet XLM.
            </p>
          </div>

          <div className="space-y-2">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d]"
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
                  // Add USDC trustline automatically
                  if (secretKeyBuf) {
                    try {
                      const usdcAsset = new Asset(USDC_CLASSIC_CODE, USDC_CLASSIC_ISSUER)
                      const trustTx = await buildChangeTrust(secretKeyBuf, usdcAsset)
                      const signed = signTransaction(trustTx, secretKeyBuf)
                      await submitTransaction(signed)
                      setFundMessage(prev => (prev ?? "") + " + USDC trustline added.")
                    } catch (tlErr: any) {
                      console.warn("Failed to add USDC trustline:", tlErr)
                      setFundMessage(prev => (prev ?? "") + " (trustline skipped: " + tlErr.message + ")")
                    }
                  }
                } catch {
                  setFundMessage("Created without funding. You can fund the wallet later.")
                  console.warn("Friendbot unreachable")
                }
                setSecretKeyBuf(null) // clear from memory
                setStep("done")
              }}
            >
              Fund via Friendbot (10,000 testnet XLM)
            </button>

            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-white px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
              onClick={() => {
                setFundMessage("Created without funding.")
                setStep("done")
              }}
            >
              Skip — fund manually later
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "funding") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="comic-card max-w-md w-full p-8 text-center space-y-4">
          <h1 className="text-2xl font-black text-[#140625]">Funding Wallet</h1>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#7c3cff]">
            <span className="loading loading-spinner text-[#38e7ff]" />
            Funding account via Friendbot...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-bold text-[#5a3b66] hover:text-[#140625] transition">
        ← Back to Dashboard
      </Link>
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="comic-card max-w-md w-full p-8 space-y-4">
        {step === "intro" ? (
          mode === "create" ? (
            <>
              <div className="text-center">
                <p className="comic-chip bg-[#ffdd3d] mx-auto w-fit">Stellar Wallet</p>
                <h1 className="mt-3 text-2xl font-black text-[#140625]">Create Your Wallet</h1>
              </div>

              <p className="text-sm font-bold text-[#3c214b] text-center">
                This creates a Stellar keypair (public + secret key) on the Stellar testnet.
              </p>

              <div className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-4 shadow-[3px_3px_0_#140625] space-y-3 text-sm font-bold text-[#3c214b]">
                <p>🔑 <strong>Keypair</strong> — A Stellar address and its secret key. Your address is public; your secret key stays private.</p>
                <p>🔒 <strong>Pincode</strong> — Your secret key is encrypted in your browser using the pincode. Only you can unlock your wallet.</p>
                <p>🪙 <strong>Testnet XLM</strong> — You will need testnet XLM to send transactions. Friendbot can fund you with 10,000 free XLM.</p>
              </div>

              <p className="text-xs font-black text-[#ff4fb8] text-center">
                ⚠️ There is no server-side backup. If you lose your pincode or clear browser data, the wallet is gone forever.
              </p>

              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d]"
                onClick={() => setStep("create")}
              >
                Create Wallet
              </button>
              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-white px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#f1d8ff]"
                onClick={() => {
                  setMode("import")
                  setError(null)
                  setImportSecret("")
                }}
              >
                I already have a secret key (Import)
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="comic-chip bg-[#7c3cff] text-white mx-auto w-fit">Import Wallet</p>
                <h1 className="mt-3 text-2xl font-black text-[#140625]">Paste Secret Key</h1>
                <p className="mt-1 text-sm font-bold text-[#3c214b]">
                  Restore an existing Bountix wallet in this browser.
                </p>
              </div>

              <p className="text-xs font-black text-[#5a3b66] text-center">
                Your secret key starts with <code className="font-mono">S…</code> and is around 56 chars long.
              </p>

              <div>
                <label className="text-xs font-black uppercase text-[#5a3b66]">Secret Key</label>
                <input
                  type="password"
                  value={importSecret}
                  onChange={(e) => setImportSecret(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-center text-sm font-mono font-bold text-[#140625] outline-none focus:bg-white"
                  placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  autoFocus
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-[#5a3b66]">New Pincode</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-center text-lg tracking-widest font-bold text-[#140625] outline-none focus:bg-white"
                  placeholder="• • • • • •"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-[#5a3b66]">Confirm Pincode</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPincode}
                  onChange={(e) => setConfirmPincode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-center text-lg tracking-widest font-bold text-[#140625] outline-none focus:bg-white"
                  placeholder="• • • • • •"
                />
              </div>

              {error && (
                <div className="rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] px-3 py-2 text-sm font-bold text-[#140625]">
                  {error}
                </div>
              )}

              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  setError(null)
                  if (!importSecret.trim()) {
                    setError("Paste your secret key first.")
                    return
                  }
                  if (pincode.length < 4) {
                    setError("Pincode must be at least 4 digits.")
                    return
                  }
                  if (pincode !== confirmPincode) {
                    setError("Pincodes do not match.")
                    return
                  }
                  setLoading(true)
                  try {
                    const wallet = await importAndStoreWallet(
                      importSecret.trim(),
                      pincode,
                      userId,
                    )
                    setPublicKey(wallet.publicKey)
                    setSecretKeyBuf(wallet.secretKey)
                    setImportedKey(wallet.secretKey)
                    saveWalletAddress(wallet.publicKey)
                    setStep("done")
                  } catch (err: any) {
                    setError(err?.message ?? "Failed to import wallet")
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner text-[#38e7ff]" />
                ) : (
                  "Import Wallet"
                )}
              </button>
              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-white px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#f1d8ff]"
                onClick={() => {
                  setMode("create")
                  setError(null)
                }}
              >
                ← Back to Create Wallet
              </button>
            </>
          )
        ) : (
          <>
            <div className="text-center">
              <p className="comic-chip bg-[#7c3cff] text-white mx-auto w-fit">Step 2 of 2</p>
              <h1 className="mt-3 text-2xl font-black text-[#140625]">Set Pincode</h1>
              <p className="mt-1 text-sm font-bold text-[#3c214b]">
                Your secret key will be encrypted in your browser using this pincode.
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#5a3b66]">Pincode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-center text-lg tracking-widest font-bold text-[#140625] outline-none focus:bg-white"
                placeholder="• • • • • •"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#5a3b66]">Confirm Pincode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPincode}
                onChange={(e) => setConfirmPincode(e.target.value.replace(/\D/g, ""))}
                className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-center text-lg tracking-widest font-bold text-[#140625] outline-none focus:bg-white"
                placeholder="• • • • • •"
              />
            </div>

            {error && (
              <div className="rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] px-3 py-2 text-sm font-bold text-[#140625]">
                {error}
              </div>
            )}

            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
                  setSecretKeyBuf(wallet.secretKey)
                  saveWalletAddress(wallet.publicKey)
                  setStep("confirm")
                } catch (err: any) {
                  setError(err?.message ?? "Failed to create wallet")
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading || pincode.length < 4 || pincode !== confirmPincode}
            >
              {loading ? <span className="loading loading-spinner text-[#38e7ff]" /> : "Generate Wallet"}
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
