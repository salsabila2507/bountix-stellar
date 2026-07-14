"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ExternalLink, LoaderCircle, TriangleAlert, Wallet } from "lucide-react"
import { stellarTxUrl, uuidToBytes32 } from "@/lib/escrow"
import { invokeSorobanAdmin } from "@/lib/stellar"
import { reconcileReleasedEscrowAction, releaseEscrowAction } from "@/app/applications/actions"
import { walletHasUsdcTrustline } from "@/lib/stellar/usdc-trustline"

export type ReleaseRequest = {
  submissionId: string
  taskId: string
  taskTitle: string
  rewardAmount: number
  workerName: string
  workerWalletAddress: string | null
  createdAt: string
}

export function EscrowReleaseAdminPanel({ requests: initial }: { requests: ReleaseRequest[] }) {
  const router = useRouter()
  const [requests, setRequests] = useState(initial)

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border-2 border-[#140625] bg-[#f1d8ff] p-6 text-center">
        <Wallet aria-hidden="true" className="mx-auto h-8 w-8 text-[#7c3cff]" />
        <p className="mt-2 text-sm font-bold text-[#5a3b66]">
          No pending escrow releases.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {requests.map((req) => (
        <ReleaseRequestCard
          key={req.submissionId}
          request={req}
          onDone={() => {
            setRequests((prev) => prev.filter((r) => r.submissionId !== req.submissionId))
            router.refresh()
          }}
        />
      ))}
    </div>
  )
}

function ReleaseRequestCard({ request, onDone }: { request: ReleaseRequest; onDone: () => void }) {
  const reconciliationStarted = useRef(false)
  const [phase, setPhase] = useState<"idle" | "checking" | "assigning" | "releasing" | "recording" | "done" | "error">("idle")
  const [error, setError] = useState<string>("")
  const [assignTxHash, setAssignTxHash] = useState("")
  const [releaseTxHash, setReleaseTxHash] = useState("")

  const busy = phase === "checking" || phase === "assigning" || phase === "releasing" || phase === "recording"

  useEffect(() => {
    if (reconciliationStarted.current) return
    reconciliationStarted.current = true
    let cancelled = false

    void reconcileReleasedEscrowAction(request.submissionId).then((result) => {
      if (cancelled || !result.ok || !result.reconciled) return
      setPhase("done")
      onDone()
    })

    return () => {
      cancelled = true
    }
  }, [onDone, request.submissionId])

  async function handleRelease() {
    setError("")

    if (!request.workerWalletAddress) {
      setPhase("error")
      setError("Worker has not set a wallet address.")
      return
    }

    try {
      const taskKey = uuidToBytes32(request.taskId)

      setPhase("checking")
      const reconciliation = await reconcileReleasedEscrowAction(request.submissionId)
      if (!reconciliation.ok) throw new Error(reconciliation.message)
      if (reconciliation.reconciled) {
        setPhase("done")
        onDone()
        return
      }

      let payoutReady = false
      try {
        payoutReady = await walletHasUsdcTrustline(request.workerWalletAddress)
      } catch {
        throw new Error("Could not verify the worker wallet on Stellar. Try again.")
      }
      if (!payoutReady) {
        throw new Error(
          "Worker wallet is not ready for USDC payouts. The worker must open Wallet and activate USDC payouts before release.",
        )
      }

      setPhase("assigning")
      const assignHash = await invokeSorobanAdmin("assign_worker", [taskKey, request.workerWalletAddress])
      setAssignTxHash(assignHash)

      setPhase("releasing")
      const releaseHash = await invokeSorobanAdmin("release_escrow", [taskKey])
      setReleaseTxHash(releaseHash)

      setPhase("recording")
      const result = await releaseEscrowAction(request.submissionId, assignHash, releaseHash)
      if (!result.ok) throw new Error(result.message)

      setPhase("done")
      onDone()
    } catch (err) {
      setPhase("error")
      setError(err instanceof Error ? err.message : "Release failed")
    }
  }

  if (phase === "done") {
    return (
      <div className="rounded-lg border-2 border-[#1f6b3a] bg-[#dff7e6] p-4 shadow-[3px_3px_0_#140625]">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#1f6b3a]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#1f6b3a]">✓ Released</p>
            <p className="mt-1 text-xs font-bold text-[#3c214b]">{request.taskTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {assignTxHash ? (
                <a href={stellarTxUrl(assignTxHash)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-[0.65rem] font-black text-[#7c3cff] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]">
                  <ExternalLink className="h-3 w-3" /> Assign Tx
                </a>
              ) : null}
              {releaseTxHash ? (
                <a href={stellarTxUrl(releaseTxHash)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-[0.65rem] font-black text-[#7c3cff] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]">
                  <ExternalLink className="h-3 w-3" /> Release Tx
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-4 shadow-[3px_3px_0_#140625]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-[#5a3b66]">Task</p>
          <p className="mt-1 text-sm font-black text-[#140625]">{request.taskTitle}</p>
          <p className="mt-2 text-xs font-black uppercase text-[#5a3b66]">Worker</p>
          <p className="mt-1 text-sm font-bold text-[#3c214b]">{request.workerName}</p>
          {request.workerWalletAddress ? (
            <>
              <p className="mt-2 text-xs font-black uppercase text-[#5a3b66]">Wallet</p>
              <p className="mt-1 break-all font-mono text-xs text-[#3c214b]">{request.workerWalletAddress}</p>
            </>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 shrink-0 rounded-md border-2 border-[#140625] bg-[#ffdd3d] px-2 py-1 text-[0.65rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
          <Wallet className="h-3 w-3" />
          {request.rewardAmount} USDC
        </span>
      </div>

      {phase === "error" && error ? (
        <div className="mt-3 flex gap-2 rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] p-3 text-xs font-bold text-[#8a1742]">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleRelease}
        disabled={busy}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#23b26d] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#1f6b3a] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {busy ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            {phase === "checking" ? "Checking wallet…" : phase === "assigning" ? "Assigning worker…" : phase === "releasing" ? "Releasing escrow…" : "Recording…"}
          </>
        ) : (
          <>
            <Wallet aria-hidden="true" className="h-4 w-4" />
            Release escrow
          </>
        )}
      </button>
    </div>
  )
}
