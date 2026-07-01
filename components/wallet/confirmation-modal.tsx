"use client"

import { useState } from "react"

interface ConfirmationModalProps {
  open: boolean
  title: string
  children: React.ReactNode
  onConfirm: (pincode: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string | null
}

export function ConfirmationModal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  loading,
  error,
}: ConfirmationModalProps) {
  const [pincode, setPincode] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  if (!open) return null

  const handleConfirm = async () => {
    setLocalError(null)
    if (pincode.length < 4) {
      setLocalError("Pincode must be at least 4 characters")
      return
    }
    await onConfirm(pincode)
    setPincode("")
  }

  const handleCancel = () => {
    setPincode("")
    setLocalError(null)
    onCancel()
  }

  const displayError = error || localError

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4 space-y-4">{children}</div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Enter pincode to confirm</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            className={`input input-bordered w-full text-center text-lg tracking-widest ${displayError ? "input-error" : ""}`}
            placeholder="• • • • • •"
            autoFocus
          />
          {displayError && (
            <label className="label">
              <span className="label-text-alt text-error">{displayError}</span>
            </label>
          )}
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : "Confirm"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleCancel} />
    </div>
  )
}
