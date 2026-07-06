"use client"

import { useState } from "react"

export function RaiseDisputeButton({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/disputes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to create dispute")
        return
      }
      setMessage("Dispute raised. Admin will review it shortly.")
      setReason("")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
        onClick={() => setOpen(true)}
      >
        Dispute Rejection
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border-2 border-[#140625] bg-white p-6 shadow-[8px_8px_0_#140625]">
            <h3 className="text-lg font-black text-[#140625]">Dispute Rejection</h3>
            <p className="mt-2 text-xs font-bold text-[#5a3b66]">
              Explain why you think the rejection was unfair. Admin will review your dispute.
            </p>

            {message ? (
              <div className="mt-4 rounded-lg border-2 border-[#1f6b3a] bg-[#dff7e6] p-3 text-sm font-bold text-[#1f6b3a]">
                {message}
              </div>
            ) : (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="I completed all the requirements. The rejection says..."
                  rows={4}
                  className="mt-4 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 text-sm font-bold text-[#140625] outline-none focus:bg-white"
                />

                {error && (
                  <div className="mt-2 rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] p-2 text-xs font-bold text-[#140625]">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border-2 border-[#140625] bg-white px-3 py-1.5 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]"
                    onClick={() => {
                      setOpen(false)
                      setReason("")
                      setError(null)
                      setMessage(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleSubmit}
                    disabled={loading || reason.trim().length < 10}
                  >
                    {loading ? <span className="loading loading-spinner" /> : "Submit Dispute"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
