"use client"

import { useState } from "react"

type Dispute = {
  id: string
  submission_id: string
  task_id: string
  task_title: string
  worker_id: string
  worker_name: string
  reason: string
  status: string
  resolution: string | null
  admin_notes: string | null
  created_at: string
}

export function DisputeCard({ dispute }: { dispute: Dispute }) {
  const [action, setAction] = useState<"accepted" | "rejected" | null>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResolve = async () => {
    if (!action) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/disputes/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId: dispute.id, resolution: action, adminNotes: notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to resolve")
        return
      }
      setDone(true)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border-2 border-[#1f6b3a] bg-[#dff7e6] p-4">
        <p className="text-sm font-black text-[#1f6b3a]">
          ✓ Resolved — {action === "accepted" ? "accepted" : "rejected"}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-4 shadow-[3px_3px_0_#140625]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-[#5a3b66]">Task</p>
          <p className="mt-1 text-sm font-black text-[#140625]">{dispute.task_title}</p>
          <p className="mt-2 text-xs font-black uppercase text-[#5a3b66]">Worker</p>
          <p className="mt-1 text-sm font-bold text-[#3c214b]">{dispute.worker_name}</p>
          <p className="mt-2 text-xs font-black uppercase text-[#5a3b66]">Reason</p>
          <p className="mt-1 whitespace-pre-line text-sm font-bold text-[#140625]">{dispute.reason}</p>
        </div>
        <span className="shrink-0 rounded-md border-2 border-[#140625] bg-[#ff4fb8] px-2 py-1 text-[0.65rem] font-black uppercase text-white shadow-[2px_2px_0_#140625]">
          Open
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="text-xs font-black uppercase text-[#5a3b66]">Admin notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border-2 border-[#140625] bg-white p-2 text-sm font-bold text-[#140625] outline-none"
          placeholder="Explain your decision..."
        />
      </div>

      {error && (
        <div className="mt-2 rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] p-2 text-xs font-bold text-[#140625]">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border-2 border-[#140625] px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
            action === "accepted"
              ? "bg-[#1f6b3a] text-white"
              : "bg-white text-[#140625] hover:bg-[#dff7e6]"
          }`}
          onClick={() => setAction("accepted")}
        >
          Accept dispute
        </button>
        <button
          className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border-2 border-[#140625] px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
            action === "rejected"
              ? "bg-[#ff4fb8] text-white"
              : "bg-white text-[#140625] hover:bg-[#fff0f5]"
          }`}
          onClick={() => setAction("rejected")}
        >
          Reject dispute
        </button>
      </div>

      {action && (
        <button
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-1.5 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleResolve}
          disabled={loading}
        >
          {loading ? <span className="loading loading-spinner" /> : `Confirm: ${action === "accepted" ? "Pay Worker" : "Deny Dispute"}`}
        </button>
      )}
    </div>
  )
}
