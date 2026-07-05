"use client";

import { useState, useTransition } from "react";

interface Props {
  applicationId: string;
  decision: "accepted" | "rejected";
  label: string;
  bgColor: string;
  hoverBg: string;
  textColor?: string;
}

/**
 * Client-side button that POSTs to a server action endpoint and then
 * forces a page reload via window.location.reload() so the applicant
 * list re-renders with the new status.
 *
 * We deliberately avoid the inline <form action={fn}> pattern because
 * on slow mobile networks we've seen the form's `action` attribute end
 * up empty during hydration, leading to "click does nothing" UX.
 */
export function DecisionButton({
  applicationId,
  decision,
  label,
  bgColor,
  hoverBg,
  textColor = "text-white",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    const resp = await fetch("/api/applications/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, decision }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      setError(data.error ?? `Failed (${resp.status})`);
      return;
    }
    // Force reload so server-side rerender shows the new status.
    window.location.reload();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => startTransition(() => void handleClick())}
        disabled={pending}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${bgColor} ${textColor} ${hoverBg}`}
      >
        {pending ? "..." : label}
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-[#ff4fb8]">{error}</span>
      ) : null}
    </div>
  );
}
