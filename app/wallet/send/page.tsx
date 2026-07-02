"use client"

import { useState } from "react"
import { useWallet } from "@/lib/stellar/wallet-context"
import { useSecretKey } from "@/lib/stellar/wallet-context"
import { assetFromCode, findStrictSendPaths, fetchAccount } from "@/lib/stellar/horizon"
import { buildPayment, buildPathPaymentStrictSend, signTransaction, submitTransaction, type MemoValue } from "@/lib/stellar/transactions"
import { getContacts } from "@/lib/stellar/contacts-store"
import { ConfirmationModal } from "@/components/wallet/confirmation-modal"
import { Asset } from "@stellar/stellar-sdk"

export default function SendPage() {
  const { publicKey, isLocked, refreshAccount } = useWallet()
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
    } catch (err: any) {
      setConfirmError(err.message ?? "Transaction failed")
    } finally {
      setLoading(false)
    }
  }

  if (isLocked || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-base-content/60">Unlock your wallet first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Send Payment</h1>

      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Destination</span>
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="input input-bordered font-mono text-sm"
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
            <div className="form-control">
              <label className="label">
                <span className="label-text">Asset</span>
              </label>
              <select
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                className="select select-bordered"
              >
                <option value="XLM">XLM</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="input input-bordered"
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Memo</span>
            </label>
            <div className="flex gap-2">
              <select
                value={memoType}
                onChange={(e) => setMemoType(e.target.value as any)}
                className="select select-bordered w-24"
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
                  className="input input-bordered flex-1"
                  placeholder={memoType === "id" ? "Numeric ID" : "Memo text"}
                />
              )}
            </div>
          </div>

          <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : "Review & Send"}
          </button>
        </div>
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
            <span className="text-base-content/60">To:</span>
            <span className="font-mono font-medium truncate max-w-[200px]">{destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Amount:</span>
            <span className="font-bold">{amount} {assetCode}</span>
          </div>
          {memoType !== "none" && memoValue && (
            <div className="flex justify-between">
              <span className="text-base-content/60">Memo:</span>
              <span>{memoValue}</span>
            </div>
          )}
        </div>
      </ConfirmationModal>
    </div>
  )
}
