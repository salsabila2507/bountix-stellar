"use client";

import { useState } from "react";

interface Props {
  applicationId: string;
  decision: "accepted" | "rejected";
  label: string;
  bgColor: string;
  hoverBg: string;
  textColor?: string;
}

export function DecisionButton({
  applicationId,
  decision,
  label,
  bgColor,
  hoverBg,
  textColor = "text-white",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/applications/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, decision }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error ?? `Failed (${resp.status})`);
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${bgColor} ${textColor} ${hoverBg}`}
      >
        {loading ? "..." : label}
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-[#ff4fb8]">{error}</span>
      ) : null}
    </div>
  );
}
