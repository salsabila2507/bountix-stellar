"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Keypair } from "@stellar/stellar-sdk";
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import {
  stellarTxUrl,
  usdcToUnits,
  uuidToBytes32,
  escrowContractDeployed,
} from "@/lib/escrow";
import {
  formatUsdc,
  TOKEN_ADDRESSES,
  type PaymentToken,
} from "@/lib/payments";
import { markTaskEscrowFundedAction } from "@/app/tasks/actions";
import { useWallet, useSecretKey } from "@/lib/stellar/wallet-context";
import {
  ensureTestnetXlm,
  escrowExistsOnChain,
  getCachedSorobanTokenBalance,
  invokeSorobanWithKeypair,
} from "@/lib/stellar";
import { ConfirmationModal } from "@/components/wallet/confirmation-modal";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";
import type { RewardMode } from "@/lib/tasks";

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
  paymentToken = "USDC",
}: {
  taskId: string;
  rewardAmount: number;
  rewardMode?: RewardMode;
  winnerCount?: number;
  locale?: Locale;
  paymentToken?: PaymentToken;
}) {
  const t = createTranslator(locale);
  const router = useRouter();

  const {
    isLoaded,
    isLocked,
    publicKey,
    refreshAccount,
  } = useWallet();
  const { requestUnlock, clearKey } = useSecretKey();

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const safeWinnerCount =
    rewardMode === "raffle" && Number.isInteger(winnerCount)
      ? Math.max(1, winnerCount)
      : 1;
  const requiredAmount =
    usdcToUnits(rewardAmount) * BigInt(safeWinnerCount);
  const tokenAddress = TOKEN_ADDRESSES[paymentToken];

  // Preflight: friendbot XLM if needed, then refresh USDC balance
  useEffect(() => {
    let cancelled = false;

    if (!publicKey || !tokenAddress) {
      queueMicrotask(() => {
        if (!cancelled) setUsdcBalance(null);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setBalanceLoading(true);

      void (async () => {
        // 1. Make sure wallet has at least 1 XLM (friendbot if not)
        if (!isLocked) {
          await ensureTestnetXlm(publicKey);
          if (!cancelled) await refreshAccount();
        }
        // 2. Fetch USDC balance (cached 60s)
        try {
          const bal = await getCachedSorobanTokenBalance(
            tokenAddress,
            publicKey,
          );
          if (!cancelled) setUsdcBalance(bal);
        } catch {
          if (!cancelled) setUsdcBalance(BigInt(0));
        } finally {
          if (!cancelled) setBalanceLoading(false);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [publicKey, tokenAddress, isLocked, refreshAccount]);

  const displayAmount =
    rewardMode === "raffle"
      ? rewardAmount * Math.max(1, winnerCount)
      : rewardAmount;

  const amountLabel = formatUsdc(displayAmount, paymentToken);

  function handleFundClick() {
    setError("");
    if (!escrowContractDeployed()) {
      setPhase("error");
      setError(
        t("escrow.fund.notDeployed") ||
          "Escrow contract not yet deployed on Stellar",
      );
      return;
    }
    if (requiredAmount <= BigInt(0)) {
      setPhase("error");
      setError(t("escrow.fund.positiveAmount"));
      return;
    }
    if (
      usdcBalance !== null &&
      usdcBalance < requiredAmount &&
      !balanceLoading
    ) {
      setPhase("error");
      setError(
        `Your wallet doesn't have enough ${paymentToken}. Balance: ${formatUsdc(
          Number(usdcBalance) / 1e7,
          paymentToken,
        )}. Top up at /wallet first.`,
      );
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirm(pincode: string) {
    setConfirmError(null);
    setError("");
    setSubmitting(true);
    try {
      const wallet = await requestUnlock(pincode);
      const userPk = publicKey ?? wallet.publicKey;
      if (!userPk) throw new Error("Wallet not loaded after unlock");

      const taskKey = uuidToBytes32(taskId);

      const alreadyFunded = await escrowExistsOnChain(taskKey);
      let hash: string;

      if (alreadyFunded) {
        hash = "on-chain-verified";
      } else {
        setPhase("funding");
        const args = [
          userPk,
          taskKey,
          requiredAmount,
          tokenAddress,
        ];
        const kp = Keypair.fromSecret(wallet.secretKey);
        hash = await invokeSorobanWithKeypair(
          rewardMode === "raffle" ? "fund_raffle_escrow" : "fund_escrow",
          args,
          kp,
        );
      }
      setTxHash(hash);

      setPhase("recording");
      const result = await markTaskEscrowFundedAction(taskId, hash);
      if (!result.ok) throw new Error(result.message);

      setPhase("done");
      clearKey();
      setShowConfirm(false);
      // Bust the balance cache so a re-render shows the new USDC balance
      try {
        const cacheKey = `bountix:token-balance:${tokenAddress}:${userPk}`;
        sessionStorage.removeItem(cacheKey);
      } catch {}
      refreshAccount();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("escrow.fund.failed");
      setError(message.slice(0, 5000));
      setConfirmError(message.slice(0, 800));
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

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

  // State: no wallet saved yet → CTA to create one
  if (isLoaded && !publicKey) {
    return (
      <div className="comic-card-soft bg-[#f2e6ff] p-5">
        <p className="comic-chip bg-[#7c3cff] text-white">
          <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
          {t("escrow.fund.chip")}
        </p>
        <h2 className="mt-4 text-lg font-black text-[#140625]">
          {t("escrow.fund.title")}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#3c214b]">
          {t("escrow.fund.body", { amount: amountLabel })}
        </p>
        <p className="mt-3 text-sm font-semibold text-[#3c214b]">
          You need a Bountix Stellar wallet before you can fund this
          escrow. Create one in your wallet page.
        </p>
        <Link
          href="/wallet/signup"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-5 py-3 text-sm font-black uppercase text-[#140625] shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d]"
        >
          Create Bountix wallet
        </Link>
      </div>
    );
  }

  // State: wallet exists but locked OR insufficient balance → show warning + unlock/fund UI
  const showInsufficientBalance =
    usdcBalance !== null && usdcBalance < requiredAmount;

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
        {t("escrow.fund.body", { amount: amountLabel })}
      </p>

      {isLoaded && publicKey ? (
        <p className="mt-2 break-all text-xs font-mono font-bold text-[#5a3b66]">
          Funding from: {publicKey}
        </p>
      ) : null}

      {usdcBalance !== null || balanceLoading ? (
        <p className="mt-1 text-xs font-bold text-[#5a3b66]">
          {paymentToken} balance:{" "}
          {balanceLoading ? (
            <span className="inline-block h-3 w-20 animate-pulse rounded bg-[#5a3b66]/30 align-middle" />
          ) : (
            `${(Number(usdcBalance ?? BigInt(0)) / 1e7).toFixed(7)} ${paymentToken}`
          )}
        </p>
      ) : null}

      {phase === "error" && error ? (
        <div className="mt-4 flex gap-2 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p className="break-words">{error}</p>
        </div>
      ) : null}

      {showInsufficientBalance ? (
        <div className="mt-3 rounded-lg border-2 border-[#140625] bg-[#fff0f5] p-3 text-xs font-bold text-[#140625]">
          Your wallet balance ({paymentToken}) is below the required
          escrow amount. Top up at{" "}
          <Link
            href="/wallet"
            className="underline"
          >
            /wallet
          </Link>{" "}
          (use "Get 100 Testnet USDC") before funding.
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleFundClick}
        disabled={
          submitting ||
          showInsufficientBalance ||
          balanceLoading
        }
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {submitting ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
            {phase === "funding"
              ? t("escrow.fund.funding")
              : t("escrow.fund.recording")}
          </>
        ) : (
          <>{t("escrow.fund.button")}</>
        )}
      </button>
      <p className="mt-3 text-xs font-bold text-[#5a3b66]">
        {t("escrow.fund.prompts")}
      </p>

      <ConfirmationModal
        open={showConfirm}
        title={`Fund ${amountLabel} from your wallet`}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (submitting) return;
          setShowConfirm(false);
          setConfirmError(null);
        }}
        loading={submitting}
        error={confirmError}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#5a3b66]">Task</span>
            <span className="font-mono text-xs text-[#140625]">
              {taskId.slice(0, 8)}…
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5a3b66]">Amount</span>
            <span className="font-black text-[#140625]">
              {amountLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5a3b66]">Token</span>
            <span className="font-black text-[#140625]">
              {paymentToken}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5a3b66]">Your wallet</span>
            <span className="font-mono text-xs text-[#140625] truncate max-w-[200px]">
              {publicKey}
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-[#5a3b66]">
            You are paying {amountLabel} from your Bountix Stellar
            wallet into the escrow contract. Your wallet&apos;s secret
            key stays in this browser.
          </p>
        </div>
      </ConfirmationModal>
    </div>
  );
}
