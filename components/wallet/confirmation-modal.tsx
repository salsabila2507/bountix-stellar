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
    try {
      await onConfirm(pincode)
    } catch {
      // parent error handled via error prop
    }
    setPincode("")
  }

  const handleCancel = () => {
    setPincode("")
    setLocalError(null)
    onCancel()
  }

  const displayError = error || localError

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="comic-card mx-4 w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-black text-[#140625]">{title}</h3>
        <div className="space-y-4">{children}</div>
        <div>
          <label className="text-xs font-black uppercase text-[#5a3b66]">Enter pincode to confirm</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            className={`mt-1 block w-full rounded-lg border-2 px-3 py-2 text-center text-lg tracking-widest font-bold text-[#140625] outline-none focus:bg-white ${
              displayError
                ? "border-[#ff4fb8] bg-[#fff0f5]"
                : "border-[#140625] bg-[#fffaf4]"
            }`}
            placeholder="• • • • • •"
            autoFocus
          />
          {displayError && (
            <p className="mt-1 text-xs font-bold text-[#ff4fb8]">{displayError}</p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="inline-flex min-h-10 items-center rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff] disabled:opacity-50"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner text-[#38e7ff]" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}
