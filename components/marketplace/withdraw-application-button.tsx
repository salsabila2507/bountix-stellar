"use client";

import { useState, useTransition } from "react";

interface Props {
  applicationId: string;
  label: string;
}

/**
 * Client-side withdrawal submission. Avoids the inline <form action={fn}>
 * pattern which fails on slow mobile networks where Next.js has not finished
 * hydrating the server action handler.
 */
export function WithdrawApplicationButton({ applicationId, label }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/applications/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          setError(data.error ?? `Failed (${resp.status})`);
          return;
        }
        window.location.reload();
      } catch (e: any) {
        setError(e?.message ?? "Could not withdraw");
      }
    });
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-4 text-xs font-black uppercase text-[#c42463] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffe1ed] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "..." : label}
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-[#ff4fb8]">{error}</span>
      ) : null}
    </div>
  );
}
