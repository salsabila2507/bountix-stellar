"use client"

import { useWallet, useSecretKey } from "@/lib/stellar/wallet-context"
import { fetchPayments, type PaymentRecord } from "@/lib/stellar/horizon"
import { useEffect, useState } from "react"
import Link from "next/link"
import { UnlockForm } from "@/components/wallet/unlock-form"
import { ConfirmationModal } from "@/components/wallet/confirmation-modal"
import { buildChangeTrust, signTransaction, submitTransaction } from "@/lib/stellar/transactions"
import { Asset } from "@stellar/stellar-sdk"

function formatBalance(balance: string, asset_type: string, asset_code?: string): string {
  const num = Number.parseFloat(balance)
  if (isNaN(num)) return "0"
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })
  if (asset_type === "native") return `${formatted} XLM`
  return `${formatted} ${asset_code ?? "?"}`
}

export default function WalletDashboard() {
  const { isLoaded, isLocked, publicKey, account, refreshAccount } = useWallet()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [usdcModalOpen, setUsdcModalOpen] = useState(false)
  const [usdcLoading, setUsdcLoading] = useState(false)
  const [usdcError, setUsdcError] = useState<string | null>(null)
  const [usdcMessage, setUsdcMessage] = useState<string | null>(null)
  const { requestUnlock } = useSecretKey()

  useEffect(() => {
    if (publicKey && !isLocked) {
      setLoadingPayments(true)
      fetchPayments(publicKey, 10)
        .then(setPayments)
        .catch(() => setPayments([]))
        .finally(() => setLoadingPayments(false))
    }
  }, [publicKey, isLocked])

  async function handleGetUsdc(pincode: string) {
    setUsdcError(null)
    setUsdcMessage(null)
    setUsdcLoading(true)
    try {
      const wallet = await requestUnlock(pincode)

      // 1. Get faucet info
      const infoResp = await fetch("/api/wallet/faucet-usdc")
      const info = await infoResp.json()
      if (!info.configured) {
        setUsdcError("USDC faucet not configured. Ask the admin to run the faucet setup.")
        return
      }

      const issuer = info.issuer
      const usdcAsset = new Asset("USDC", issuer)

      // 2. Fund account if needed (friendbot)
      if (!publicKey) return
      try {
        await fetch(`https://friendbot.stellar.org?addr=${publicKey}`)
      } catch {
        // friendbot might fail if account already exists; that's fine
      }

      // 3. Add trustline if needed
      const hasTrustline = account?.balances?.some(
        (b) => b.asset_code === "USDC" && b.asset_issuer === issuer,
      )
      if (!hasTrustline) {
        const changeTrustTx = await buildChangeTrust(wallet.secretKey, usdcAsset)
        const signed = signTransaction(changeTrustTx, wallet.secretKey)
        await submitTransaction(signed)
      }

      // 4. Keep trying until we get USDC (handles needsFunding / needsTrustline retries)
      let attempts = 0
      while (attempts < 5) {
        attempts++
        const fundResp = await fetch("/api/wallet/faucet-usdc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey }),
        })
        const fundData = await fundResp.json()

        if (fundData.success) {
          setUsdcMessage(`Received 100 testnet USDC! Tx: ${fundData.txHash}`)
          await refreshAccount()
          return
        }

        if (fundData.needsTrustline) {
          // Trustline just added above; retry
          continue
        }

        if (fundData.needsFunding) {
          // Friendbot funded above; retry
          continue
        }

        // Unknown error
        setUsdcError(fundData.error ?? "Failed to get USDC")
        return
      }

      setUsdcError("Timed out trying to get USDC. Try again.")
    } catch (err: any) {
      setUsdcError(err?.message ?? "Something went wrong")
    } finally {
      setUsdcLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-[#38e7ff]" />
      </div>
    )
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="comic-card max-w-md w-full p-8 text-center">
          <p className="comic-chip bg-[#ffdd3d] mx-auto w-fit">Wallet</p>
          <h1 className="mt-3 text-2xl font-black text-[#140625]">Stellar Wallet</h1>
          <p className="mt-2 text-sm font-bold text-[#3c214b]">
            Create a wallet to get started.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              href="/wallet/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d]"
            >
              Create Wallet
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="comic-card max-w-md w-full p-8">
          <p className="comic-chip bg-[#7c3cff] text-white mx-auto w-fit">Wallet Locked</p>
          <h1 className="mt-3 text-2xl font-black text-[#140625] text-center">Unlock Wallet</h1>
          <p className="mt-2 text-sm font-bold text-[#3c214b] text-center">
            Enter your pincode to unlock your wallet.
          </p>
          <UnlockForm />
        </div>
      </div>
    )
  }

  const xlmBalance = account?.balances?.find((b) => b.asset_type === "native")
  const otherBalances = account?.balances?.filter((b) => b.asset_type !== "native") ?? []

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="comic-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#140625]">Wallet</h2>
            <p className="text-sm font-mono text-[#5a3b66] truncate max-w-xs sm:max-w-md">
              {publicKey}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex min-h-9 items-center rounded-lg border-2 border-[#140625] bg-white px-3 py-1 text-xs font-black text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]"
              onClick={refreshAccount}
            >
              ↻
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-4 shadow-[3px_3px_0_#140625]">
          <div className="stat">
            <div className="text-xs font-black uppercase text-[#5a3b66]">XLM Balance</div>
            <div className="mt-1 text-3xl font-black text-[#140625]">
              {xlmBalance ? formatBalance(xlmBalance.balance, "native") : "0 XLM"}
            </div>
            <div className="text-xs font-bold text-[#7c3cff]">Stellar Testnet</div>
          </div>
          <button
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setUsdcModalOpen(true)}
            disabled={usdcLoading}
          >
            {usdcLoading ? <span className="loading loading-spinner" /> : "Get 100 Testnet USDC"}
          </button>
          {usdcMessage && (
            <p className="mt-2 text-xs font-bold text-[#1f6b3a] break-all">{usdcMessage}</p>
          )}
          {usdcError && (
            <p className="mt-2 text-xs font-bold text-[#ff4fb8]">{usdcError}</p>
          )}
        </div>

        {otherBalances.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-black text-[#5a3b66]">Other Assets</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {otherBalances.map((b, i) => (
                <span key={i} className="rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-xs font-bold text-[#140625]">
                  {formatBalance(b.balance, b.asset_type, b.asset_code)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/wallet/send" className="comic-card p-6 text-center bg-[#ffdd3d] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-[#140625]">Send</h3>
        </Link>
        <Link href="/wallet/contacts" className="comic-card p-6 text-center bg-[#38e7ff] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-[#140625]">Contacts</h3>
        </Link>
        <Link href="/wallet/assets" className="comic-card p-6 text-center bg-[#f1d8ff] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-[#140625]">Assets</h3>
        </Link>
      </div>

      <div className="comic-card p-6">
        <h3 className="text-lg font-black text-[#140625]">Recent Payments</h3>
        {loadingPayments ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner text-[#38e7ff]" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm font-bold text-[#5a3b66] text-center py-4">No payments yet</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#140625] text-left text-xs font-black uppercase text-[#5a3b66]">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">From / To</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((p) => (
                  <tr key={p.id} className="border-b border-[#140625]/10">
                    <td className="py-2 pr-4">
                      <span className={`rounded-md border-2 border-[#140625] px-2 py-0.5 text-[0.65rem] font-black ${p.from === publicKey ? "bg-[#ff4fb8] text-white" : "bg-[#dff7e6] text-[#1f6b3a]"}`}>
                        {p.from === publicKey ? "Sent" : "Received"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-bold text-[#140625]">
                      {p.amount} {p.asset_code ?? "XLM"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-[#5a3b66] truncate max-w-[120px]">
                      {p.from === publicKey ? p.to : p.from}
                    </td>
                    <td className="py-2 text-xs text-[#5a3b66]">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={usdcModalOpen}
        title="Get Testnet USDC"
        onConfirm={handleGetUsdc}
        onCancel={() => {
          setUsdcModalOpen(false)
          setUsdcError(null)
        }}
        loading={usdcLoading}
        error={usdcError}
      >
        <p className="text-sm font-bold text-[#3c214b]">
          This will add a trustline for testnet USDC and request 100 USDC from the faucet.
        </p>
      </ConfirmationModal>
    </div>
  )
}
