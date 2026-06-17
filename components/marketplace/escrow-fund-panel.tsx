"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import {
  ESCROW_CONTRACT_ADDRESS,
  stellarTxUrl,
  usdcToUnits,
  uuidToBytes32,
  escrowContractDeployed,
} from "@/lib/escrow";
import { formatUsdc } from "@/lib/payments";
import { markTaskEscrowFundedAction } from "@/app/tasks/actions";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";
import type { RewardMode } from "@/lib/tasks";
import { invokeSorobanAdmin } from "@/lib/stellar";

type Phase =
  | "idle"
  | "funding"
  | "recording"
  | "done"
  | "error";

export function EscrowFundPanel({
  taskId,
  rewardAmount,
  rewardMode = "fixed",
  winnerCount = 1,
  locale = DEFAULT_LOCALE,
}: {
  taskId: string;
  rewardAmount: number;
  rewardMode?: RewardMode;
  winnerCount?: number;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const busy =
    phase === "funding" ||
    phase === "recording";

  async function handleFund() {
    setError("");

    if (!escrowContractDeployed()) {
      setPhase("error");
      setError(t("escrow.fund.notDeployed") || "Escrow contract not yet deployed on Stellar");
      return;
    }

    const safeWinnerCount =
      rewardMode === "raffle" && Number.isInteger(winnerCount)
        ? Math.max(1, winnerCount)
        : 1;
    const amount = usdcToUnits(rewardAmount) * BigInt(safeWinnerCount);
    if (amount <= BigInt(0)) {
      setPhase("error");
      setError(t("escrow.fund.positiveAmount"));
      return;
    }

    try {
      const taskKey = uuidToBytes32(taskId);

      setPhase("funding");
      const hash = await invokeSorobanAdmin(
        rewardMode === "raffle" ? "fund_raffle_escrow" : "fund_escrow",
        [taskKey, amount],
      );
      setTxHash(hash);

      setPhase("recording");
      const result = await markTaskEscrowFundedAction(taskId, hash);
      if (!result.ok) throw new Error(result.message);

      setPhase("done");
      router.refresh();
    } catch (err) {
      setPhase("error");
      const message =
        err instanceof Error ? err.message : t("escrow.fund.failed");
      setError(message.split("\n")[0].slice(0, 200));
    }
  }

  const displayAmount =
    rewardMode === "raffle"
      ? rewardAmount * Math.max(1, winnerCount)
      : rewardAmount;

  if (phase === "done") {
    return (
      <div className="comic-card-soft bg-[#dff7e6] p-5">
        <p className="comic-chip bg-[#1f6b3a] text-white">
          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
          {t("escrow.fund.doneChip")}
        </p>
        <h2 className="mt-4 text-lg font-black text-[#140625]">
          {t("escrow.fund.doneTitle")}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#3c214b]">
          {t("escrow.fund.doneBody")}
        </p>
        {txHash ? (
          <a
            href={stellarTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 break-all rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#7c3cff] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            {t("escrow.viewFundingTx")}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="comic-card-soft bg-[#f2e6ff] p-5">
      <p className="comic-chip bg-[#7c3cff] text-white">
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
        {t("escrow.fund.chip")}
      </p>
      <h2 className="mt-4 text-lg font-black text-[#140625]">
        {t("escrow.fund.title")}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#3c214b]">
        {t("escrow.fund.body", { amount: formatUsdc(displayAmount) })}
      </p>

      {phase === "error" && error ? (
        <div className="mt-4 flex gap-2 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleFund}
        disabled={busy}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {busy ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            {phase === "funding"
              ? t("escrow.fund.funding")
              : t("escrow.fund.recording")}
          </>
        ) : (
          <>
            {t("escrow.fund.button")}
          </>
        )}
      </button>
      <p className="mt-3 text-xs font-bold text-[#5a3b66]">
        {t("escrow.fund.prompts")}
      </p>
    </div>
  );
}
