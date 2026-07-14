"use client"

import { useState } from "react"
import Link from "next/link"
import { useWallet } from "@/lib/stellar/wallet-context"
import { useSecretKey } from "@/lib/stellar/wallet-context"
import { assetFromCode } from "@/lib/stellar/horizon"
import { buildPayment, signTransaction, submitTransaction, type MemoValue } from "@/lib/stellar/transactions"
import { getContacts } from "@/lib/stellar/contacts-store"
import { ConfirmationModal } from "@/components/wallet/confirmation-modal"
import { Asset } from "@stellar/stellar-sdk"
import { addLocalTransaction } from "@/lib/stellar/transaction-store"

export default function SendPage() {
  const { publicKey, isLocked, userId, refreshAccount } = useWallet()
  const { secretKey, requestUnlock, clearKey } = useSecretKey()

  const [destination, setDestination] = useState("")
  const [assetCode, setAssetCode] = useState("XLM")
  const [assetIssuer, setAssetIssuer] = useState("")
  const [amount, setAmount] = useState("")
  const [memoType, setMemoType] = useState<"none" | "text" | "id">("none")
  const [memoValue, setMemoValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const contacts = getContacts()

  const getAsset = (): Asset => {
    if (!assetCode || assetCode === "XLM") return Asset.native()
    return assetFromCode(assetCode, assetIssuer)
  }

  const getMemo = (): MemoValue | undefined => {
    if (memoType === "none" || !memoValue) return undefined
    return { type: memoType, value: memoValue } as MemoValue
  }

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    if (!destination) { setError("Enter a destination address"); return }
    if (!amount || Number.parseFloat(amount) <= 0) { setError("Enter a valid amount"); return }

    setShowConfirm(true)
  }

  const handleConfirm = async (pincode: string) => {
    setConfirmError(null)
    setLoading(true)
    try {
      const wallet = await requestUnlock(pincode)
      const asset = getAsset()
      const memo = getMemo()

      const tx = await buildPayment(wallet.secretKey, destination, amount, asset, memo)
      const signed = signTransaction(tx, wallet.secretKey)
      const result = await submitTransaction(signed)
      setSuccess(`Payment sent! Hash: ${result.hash}`)
      setShowConfirm(false)
      clearKey()
      refreshAccount()

      try {
        const assetName = assetCode === "XLM" ? "XLM" : assetCode
        addLocalTransaction({
          txHash: result.hash,
          type: "send",
          amount,
          asset: assetName,
          counterparty: destination,
          memo: memo?.type !== "none" ? (memo?.value ?? null) : null,
          memoType: memo?.type !== "none" ? (memo?.type ?? null) : null,
          status: "success",
        }, userId)
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      setConfirmError(err.message ?? "Transaction failed")
    } finally {
      setLoading(false)
    }
  }

  if (isLocked || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm font-bold text-[#5a3b66]">Unlock your wallet first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-bold text-[#5a3b66] hover:text-[#140625] transition mb-2">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-black text-[#140625]">Send Payment</h1>

      {success && (
        <div className="rounded-lg border-2 border-[#1f6b3a] bg-[#dff7e6] px-4 py-3 text-sm font-bold text-[#1f6b3a] flex items-center justify-between">
          <span>{success}</span>
          <button className="text-[#1f6b3a] font-black text-lg leading-none" onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] px-4 py-3 text-sm font-bold text-[#140625] flex items-center justify-between">
          <span>{error}</span>
          <button className="text-[#ff4fb8] font-black text-lg leading-none" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="comic-card p-6 space-y-4">
        <div>
          <label className="text-xs font-black uppercase text-[#5a3b66]">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-mono font-bold text-[#140625] outline-none focus:bg-white"
            placeholder="G... or contact name"
            list="contacts-list"
          />
          <datalist id="contacts-list">
            {contacts.map((c) => (
              <option key={c.id} value={c.address}>
                {c.name}
              </option>
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black uppercase text-[#5a3b66]">Asset</label>
            <select
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
            >
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-[#5a3b66]">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
              placeholder="0.0"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-[#5a3b66]">Memo</label>
          <div className="mt-1 flex gap-2">
            <select
              value={memoType}
              onChange={(e) => setMemoType(e.target.value as any)}
              className="w-24 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-2 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
            >
              <option value="none">None</option>
              <option value="text">Text</option>
              <option value="id">ID</option>
            </select>
            {memoType !== "none" && (
              <input
                type="text"
                value={memoValue}
                onChange={(e) => setMemoValue(e.target.value)}
                className="flex-1 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
                placeholder={memoType === "id" ? "Numeric ID" : "Memo text"}
              />
            )}
          </div>
        </div>

        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <span className="loading loading-spinner text-[#38e7ff]" /> : "Review & Send"}
        </button>
      </div>

      <ConfirmationModal
        open={showConfirm}
        title="Confirm Payment"
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirm(false)
          setConfirmError(null)
        }}
        loading={loading}
        error={confirmError}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#5a3b66]">To:</span>
            <span className="font-mono font-bold text-[#140625] truncate max-w-[200px]">{destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5a3b66]">Amount:</span>
            <span className="font-black text-[#140625]">{amount} {assetCode}</span>
          </div>
          {memoType !== "none" && memoValue && (
            <div className="flex justify-between">
              <span className="text-[#5a3b66]">Memo:</span>
              <span className="text-[#140625]">{memoValue}</span>
            </div>
          )}
        </div>
      </ConfirmationModal>
    </div>
  )
}
