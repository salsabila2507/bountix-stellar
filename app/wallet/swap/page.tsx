"use client"

import Link from "next/link"
import { useWallet, useSecretKey } from "@/lib/stellar/wallet-context"
import { useEffect, useState, useCallback } from "react"
import { UnlockForm } from "@/components/wallet/unlock-form"
import { ConfirmationModal } from "@/components/wallet/confirmation-modal"
import {
  fetchBalances,
  findStrictSendPaths,
  assetFromCode,
  type Balance,
  type Path,
} from "@/lib/stellar/horizon"
import {
  buildPathPaymentStrictSend,
  signTransaction,
  submitTransaction,
} from "@/lib/stellar/transactions"
import { Asset } from "@stellar/stellar-sdk"

const USDC_ISSUER = "GCU6VGJXQR6RPRCQ2W55DEOAAFSKFE6UEQYTHCQ2P7NIA3UIS72NJEKL"

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

const COMMON_ASSETS: { code: string; issuer?: string; label: string }[] = [
  { code: "XLM", label: "XLM – Stellar Lumens" },
  { code: "USDC", issuer: USDC_ISSUER, label: "USDC – USD Coin" },
]

function formatBal(balance: string): string {
  const n = Number.parseFloat(balance)
  if (isNaN(n)) return "0"
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })
}

function assetLabel(code: string, issuer?: string): string {
  if (!code || code === "XLM") return "XLM"
  return issuer ? `${code} (${issuer.slice(0, 4)}…${issuer.slice(-4)})` : code
}

const inputCls = "mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
const selectCls = "mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
const btnCls = "inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff] disabled:cursor-not-allowed disabled:opacity-50"

export default function SwapPage() {
  const { isLoaded, isLocked, publicKey, refreshAccount } = useWallet()
  const { requestUnlock } = useSecretKey()

  const [balances, setBalances] = useState<Balance[]>([])
  const [fromAsset, setFromAsset] = useState("XLM")
  const [fromIssuer, setFromIssuer] = useState("")
  const [toAsset, setToAsset] = useState("USDC")
  const [toIssuer, setToIssuer] = useState(USDC_ISSUER)
  const [amount, setAmount] = useState("")
  const [paths, setPaths] = useState<Path[]>([])
  const [selectedPath, setSelectedPath] = useState<Path | null>(null)
  const [loading, setLoading] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (publicKey && !isLocked) {
      fetchBalances(publicKey).then(setBalances).catch(() => setBalances([]))
    }
  }, [publicKey, isLocked])

  const userAssets = balances
    .filter((b) => {
      const bal = Number.parseFloat(b.balance)
      return !isNaN(bal) && bal > 0 && b.asset_type !== "liquidity_pool_shares"
    })
    .map((b) => ({
      code: b.asset_code || "XLM",
      issuer: b.asset_issuer,
      label: `${formatBal(b.balance)} ${b.asset_code || "XLM"}`,
    }))

  const availableDestinations = [
    ...COMMON_ASSETS.filter((a) => !(a.code === fromAsset && a.issuer === fromIssuer)),
    ...userAssets.filter(
      (a) => a.code !== fromAsset || a.issuer !== fromIssuer
    ),
  ]

  const lookupPath = useCallback(async () => {
    if (!amount || Number.parseFloat(amount) <= 0) return
    setError(null)
    setPaths([])
    setSelectedPath(null)
    setLoading(true)
    try {
      const sendAsset = assetFromCode(fromAsset, fromIssuer || undefined)
      const destAsset = assetFromCode(toAsset, toIssuer || undefined)
      const result = await findStrictSendPaths(sendAsset, amount, [destAsset])
      if (result.length === 0) {
        setError("No path found for this swap pair.")
      } else {
        setPaths(result)
        setSelectedPath(result[0])
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to find paths."))
    } finally {
      setLoading(false)
    }
  }, [fromAsset, fromIssuer, toAsset, toIssuer, amount])

  async function handleSwap(pincode: string) {
    if (!selectedPath || !publicKey) return
    setError(null)
    setSuccess(null)
    setSwapping(true)
    try {
      const wallet = await requestUnlock(pincode)
      const sendAsset = assetFromCode(fromAsset, fromIssuer || undefined)
      const destAsset = assetFromCode(toAsset, toIssuer || undefined)
      const pathAssets: Asset[] = selectedPath.path.map((p) =>
        p.asset_type === "native"
          ? Asset.native()
          : new Asset(p.asset_code!, p.asset_issuer!)
      )
      const tx = await buildPathPaymentStrictSend(
        wallet.secretKey,
        publicKey,
        sendAsset,
        amount,
        destAsset,
        selectedPath.destination_amount,
        pathAssets,
      )
      const signed = signTransaction(tx, wallet.secretKey)
      const result = await submitTransaction(signed)
      setSuccess(
        `Swapped ${amount} ${assetLabel(fromAsset, fromIssuer)} → ${selectedPath.destination_amount} ${assetLabel(toAsset, toIssuer)}. Hash: ${result.hash}`
      )
      await refreshAccount()
      setAmount("")
      setPaths([])
      setSelectedPath(null)
    } catch (err) {
      setError(getErrorMessage(err, "Swap failed."))
    } finally {
      setSwapping(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-[#38e7ff]" />
      </div>
    )
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="comic-card max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-black text-[#140625]">Swap</h1>
          <p className="mt-2 text-sm font-bold text-[#3c214b]">Create a wallet first.</p>
        </div>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="comic-card max-w-md w-full p-8">
          <h1 className="text-2xl font-black text-[#140625] text-center">Unlock Wallet</h1>
          <UnlockForm />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-bold text-[#5a3b66] hover:text-[#140625] transition">
        ← Back to Dashboard
      </Link>
      <div className="comic-card p-6">
        <h2 className="text-2xl font-black text-[#140625]">Swap Assets</h2>
        <p className="text-xs font-bold text-[#5a3b66] mt-1">
          Swap between assets using Stellar path payments.
        </p>
      </div>

      <div className="comic-card p-6 space-y-4">
        {success && (
          <div className="rounded-lg border-2 border-[#1f6b3a] bg-[#dff7e6] px-4 py-3 text-sm font-bold text-[#1f6b3a] flex items-center justify-between">
            <span className="break-all">{success}</span>
            <button className="text-[#1f6b3a] font-black text-lg leading-none shrink-0 ml-2" onClick={() => setSuccess(null)}>✕</button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] px-4 py-3 text-sm font-bold text-[#140625] flex items-center justify-between">
            <span>{error}</span>
            <button className="text-[#ff4fb8] font-black text-lg leading-none shrink-0 ml-2" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div>
          <label className="text-xs font-black uppercase text-[#5a3b66]">From</label>
          <select
            value={fromAsset + (fromIssuer ? `:${fromIssuer}` : "")}
            onChange={(e) => {
              const [code, ...iss] = e.target.value.split(":")
              setFromAsset(code)
              setFromIssuer(iss.join(":") || "")
              setPaths([])
              setSelectedPath(null)
            }}
            className={selectCls}
          >
            <optgroup label="Your Balances">
              {userAssets.map((a) => (
                <option key={a.code + (a.issuer || "")} value={a.code + (a.issuer ? `:${a.issuer}` : "")}>
                  {a.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Common">
              {COMMON_ASSETS.map((a) => (
                <option key={a.code + (a.issuer || "")} value={a.code + (a.issuer ? `:${a.issuer}` : "")}>
                  {a.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-[#5a3b66]">To</label>
          <select
            value={toAsset + (toIssuer ? `:${toIssuer}` : "")}
            onChange={(e) => {
              const [code, ...iss] = e.target.value.split(":")
              setToAsset(code)
              setToIssuer(iss.join(":") || "")
              setPaths([])
              setSelectedPath(null)
            }}
            className={selectCls}
          >
            {availableDestinations.map((a) => (
              <option key={a.code + (a.issuer || "")} value={a.code + (a.issuer ? `:${a.issuer}` : "")}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-[#5a3b66]">Amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setPaths([])
              setSelectedPath(null)
            }}
            placeholder="0.00"
            className={inputCls}
          />
        </div>

        <button
          disabled={!amount || Number.parseFloat(amount) <= 0 || loading}
          className={btnCls}
          onClick={lookupPath}
        >
          {loading ? <span className="loading loading-spinner text-[#38e7ff]" /> : "Find Path"}
        </button>

        {paths.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-[#5a3b66]">
              Paths found ({paths.length})
            </p>
            {paths.slice(0, 3).map((p, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-[#140625] p-3 transition ${
                  selectedPath === p ? "bg-[#f1d8ff]" : "bg-[#fffaf4] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="path"
                  checked={selectedPath === p}
                  onChange={() => setSelectedPath(p)}
                  className="h-4 w-4 accent-[#7c3cff]"
                />
                <div className="text-sm font-bold text-[#140625]">
                  <p>
                    Send {p.source_amount} {assetLabel(fromAsset, fromIssuer)}
                  </p>
                  <p className="text-xs text-[#5a3b66]">
                    Receive ≈{p.destination_amount} {assetLabel(toAsset, toIssuer)}
                  </p>
                  {p.path.length > 0 && (
                    <p className="text-xs text-[#5a3b66] mt-1">
                      Path: {p.path.map((h) => h.asset_code || "XLM").join(" → ")}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {selectedPath && (
          <button
            className={`${btnCls} bg-[#ff4fb8] hover:bg-[#7c3cff] text-white`}
            onClick={() => {
              setError(null)
              setSuccess(null)
              setConfirmOpen(true)
            }}
          >
            Swap {amount} {assetLabel(fromAsset, fromIssuer)}
          </button>
        )}
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title="Confirm Swap"
        onConfirm={handleSwap}
        onCancel={() => setConfirmOpen(false)}
        loading={swapping}
        error={error}
      >
        <p className="text-sm font-bold text-[#3c214b]">
          Swap {amount} {assetLabel(fromAsset, fromIssuer)} → ~{selectedPath?.destination_amount}{" "}
          {assetLabel(toAsset, toIssuer)}
        </p>
        <p className="text-xs font-bold text-[#5a3b66]">
          Destination: {publicKey}
        </p>
      </ConfirmationModal>
    </div>
  )
}
