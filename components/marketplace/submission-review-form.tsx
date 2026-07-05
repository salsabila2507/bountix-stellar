"use client";

import { useState } from "react";

interface Props {
  submissionId: string;
  defaultNotes?: string;
}

export function SubmissionReviewForm({ submissionId, defaultNotes }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(defaultNotes ?? "");

  async function handleClick(decision: string) {
    if (loading) return;
    setLoading(decision);
    setError(null);
    try {
      const resp = await fetch("/api/submissions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, decision, review_notes: notes }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error ?? `Failed (${resp.status})`);
        setLoading(null);
        return;
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(null);
    }
  }

  return (
    <div className="mt-4 grid gap-2">
      <textarea
        rows={3}
        maxLength={2000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (optional)"
        className="w-full rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none focus:ring-2 focus:ring-[#38e7ff]"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleClick("approved")}
          disabled={loading !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] bg-[#23b26d] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "approved" ? "..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => handleClick("revision_requested")}
          disabled={loading !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "revision_requested" ? "..." : "Request revision"}
        </button>
        <button
          type="button"
          onClick={() => handleClick("rejected")}
          disabled={loading !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#c42463] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#ffe1ed]"
        >
          {loading === "rejected" ? "..." : "Reject"}
        </button>
      </div>
      {error ? (
        <span className="text-[10px] font-bold text-[#ff4fb8]">{error}</span>
      ) : null}
    </div>
  );
}
