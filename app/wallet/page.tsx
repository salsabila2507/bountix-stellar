"use client"

import { useWallet, useSecretKey } from "@/lib/stellar/wallet-context"
import { fetchPayments, type PaymentRecord } from "@/lib/stellar/horizon"
import { getCachedSorobanTokenBalance } from "@/lib/stellar"
import { buildChangeTrust, signTransaction, submitTransaction } from "@/lib/stellar/transactions"
import { Asset } from "@stellar/stellar-sdk"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { UnlockForm } from "@/components/wallet/unlock-form"
import { ConfirmationModal } from "@/components/wallet/confirmation-modal"
import { STELLAR_USDC_ADDRESS, USDC_CLASSIC_ISSUER, USDC_CLASSIC_CODE } from "@/lib/payments"

interface SorobanTransfer {
  txHash: string
  ledger: number
  from: string
  to: string
  amount: string
  token: string
  timestamp: string
}

function formatXlm(balance: string): string {
  const num = Number.parseFloat(balance)
  if (isNaN(num)) return "0"
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 }) + " XLM"
}

function formatSorobanUsdc(units: bigint): string {
  const num = Number(units) / 10_000_000
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 }) + " USDC"
}

export default function WalletDashboard() {
  const { isLoaded, isLocked, publicKey, account, refreshAccount } = useWallet()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [sorobanUsdcBalance, setSorobanUsdcBalance] = useState<bigint | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [usdcModalOpen, setUsdcModalOpen] = useState(false)
  const [usdcLoading, setUsdcLoading] = useState(false)
  const [usdcError, setUsdcError] = useState<string | null>(null)
  const [usdcMessage, setUsdcMessage] = useState<string | null>(null)
  const [sorobanTransfers, setSorobanTransfers] = useState<SorobanTransfer[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportPincodeError, setExportPincodeError] = useState<string | null>(null)
  const [exportedKey, setExportedKey] = useState<string | null>(null)
  const [exportCopied, setExportCopied] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const { requestUnlock, clearKey } = useSecretKey()

  useEffect(() => {
    if (publicKey && !isLocked) {
      setLoadingPayments(true)
      fetchPayments(publicKey, 10)
        .then(setPayments)
        .catch(() => setPayments([]))
        .finally(() => setLoadingPayments(false))
    }
  }, [publicKey, isLocked])

  // Load Soroban USDC balance
  useEffect(() => {
    if (publicKey && !isLocked) {
      setBalanceLoading(true)
      getCachedSorobanTokenBalance(STELLAR_USDC_ADDRESS, publicKey, true)
        .then(setSorobanUsdcBalance)
        .catch(() => setSorobanUsdcBalance(null))
        .finally(() => setBalanceLoading(false))
    }
  }, [publicKey, isLocked])

  // Load Soroban transfer history
  const fetchSorobanTransfers = useCallback(async () => {
    if (!publicKey) return
    setTransfersLoading(true)
    try {
      const res = await fetch(`/api/wallet/soroban-history?publicKey=${publicKey}`)
      const data = await res.json()
      setSorobanTransfers(data.transfers ?? [])
    } catch {
      setSorobanTransfers([])
    } finally {
      setTransfersLoading(false)
    }
  }, [publicKey])

  useEffect(() => {
    if (publicKey && !isLocked) {
      fetchSorobanTransfers()
    }
  }, [publicKey, isLocked, fetchSorobanTransfers])

  async function handleGetSorobanUsdc(pincode: string) {
    setUsdcError(null)
    setUsdcMessage(null)
    setUsdcLoading(true)
    try {
      if (!publicKey) return

      // Ensure account has XLM for fees
      try {
        await fetch(`https://friendbot.stellar.org?addr=${publicKey}`)
      } catch {
        // friendbot might fail if account already exists
      }

      // Check/add trustline for classic USDC
      const hasTrust = account?.balances?.some(
        (b) => b.asset_code === USDC_CLASSIC_CODE && b.asset_issuer === USDC_CLASSIC_ISSUER,
      )
      if (!hasTrust) {
        const wallet = await requestUnlock(pincode)
        const usdcAsset = new Asset(USDC_CLASSIC_CODE, USDC_CLASSIC_ISSUER)
        const trustTx = await buildChangeTrust(wallet.secretKey, usdcAsset)
        const signed = signTransaction(trustTx, wallet.secretKey)
        await submitTransaction(signed)
        await refreshAccount()
        clearKey()
      }

      const resp = await fetch("/api/wallet/faucet-soroban-usdc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
      })
      const data = await resp.json()

      if (data.success) {
        setUsdcMessage(`Received 100 Soroban USDC! Tx: ${data.txHash}`)
        const fresh = await getCachedSorobanTokenBalance(STELLAR_USDC_ADDRESS, publicKey, true)
        setSorobanUsdcBalance(fresh)
      } else {
        setUsdcError(data.error ?? "Failed to get Soroban USDC")
      }
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          ← Back to Bountix
        </Link>
      </div>
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
              className="inline-flex min-h-9 items-center rounded-lg border-2 border-[#140625] bg-white px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#f1d8ff]"
              onClick={() => {
                setExportedKey(null)
                setExportCopied(false)
                setExportPincodeError(null)
                setExportModalOpen(true)
              }}
              title="Export your secret key so you can restore this wallet in another browser."
            >
              Export Key
            </button>
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
              {xlmBalance ? formatXlm(xlmBalance.balance) : "0 XLM"}
            </div>
            <div className="text-xs font-bold text-[#7c3cff]">Stellar Testnet</div>
          </div>
          <div className="mt-3 border-t-2 border-[#140625]/20 pt-3">
            <div className="text-xs font-black uppercase text-[#5a3b66]">Soroban USDC Balance</div>
            <div className="mt-1 text-2xl font-black text-[#140625]">
              {balanceLoading ? (
                <span className="loading loading-spinner loading-sm text-[#38e7ff]" />
              ) : sorobanUsdcBalance !== null ? (
                formatSorobanUsdc(sorobanUsdcBalance)
              ) : (
                "0 USDC"
              )}
            </div>
          </div>
          <button
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setUsdcModalOpen(true)}
            disabled={usdcLoading}
          >
            {usdcLoading ? <span className="loading loading-spinner" /> : "Get 100 Soroban USDC"}
          </button>
          {usdcMessage && (
            <p className="mt-2 text-xs font-bold text-[#1f6b3a] break-all">{usdcMessage}</p>
          )}
          {usdcError && (
            <p className="mt-2 text-xs font-bold text-[#ff4fb8]">{usdcError}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Link href="/wallet/send" className="comic-card p-6 text-center bg-[#ffdd3d] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-[#140625]">Send</h3>
        </Link>
        <Link href="/wallet/swap" className="comic-card p-6 text-center bg-[#ff4fb8] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-white">Swap</h3>
        </Link>
        <Link href="/wallet/contacts" className="comic-card p-6 text-center bg-[#38e7ff] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-[#140625]">Contacts</h3>
        </Link>
        <Link href="/wallet/assets" className="comic-card p-6 text-center bg-[#f1d8ff] hover:-translate-y-0.5 transition">
          <h3 className="text-sm font-black text-[#140625]">Assets</h3>
        </Link>
      </div>

      <div className="comic-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-[#140625]">Soroban Token Transfers</h3>
          <button
            className="inline-flex min-h-8 items-center rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-xs font-black text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]"
            onClick={fetchSorobanTransfers}
          >
            ↻
          </button>
        </div>
        {transfersLoading ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner text-[#38e7ff]" />
          </div>
        ) : sorobanTransfers.length === 0 ? (
          <p className="text-sm font-bold text-[#5a3b66] text-center py-4">No Soroban token transfers yet</p>
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
                {sorobanTransfers.slice(0, 10).map((t, i) => (
                  <tr key={t.txHash + i} className="border-b border-[#140625]/10">
                    <td className="py-2 pr-4">
                      <span className={`rounded-md border-2 border-[#140625] px-2 py-0.5 text-[0.65rem] font-black ${t.from === publicKey ? "bg-[#ff4fb8] text-white" : "bg-[#dff7e6] text-[#1f6b3a]"}`}>
                        {t.from === publicKey ? "Sent" : "Received"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-bold text-[#140625]">
                      {Number.parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} {t.token}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-[#5a3b66] truncate max-w-[120px]">
                      {t.from === publicKey ? t.to : t.from}
                    </td>
                    <td className="py-2 text-xs text-[#5a3b66]">{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        title="Get Soroban USDC"
        onConfirm={handleGetSorobanUsdc}
        onCancel={() => {
          setUsdcModalOpen(false)
          setUsdcError(null)
        }}
        loading={usdcLoading}
        error={usdcError}
      >
        <p className="text-sm font-bold text-[#3c214b]">
          This will add a trustline for testnet USDC if needed, then request 100 Soroban USDC from the faucet.
        </p>
      </ConfirmationModal>

      <ConfirmationModal
        open={exportModalOpen}
        title="Export Secret Key"
        onConfirm={async (pincode) => {
          setExportPincodeError(null)
          setExportLoading(true)
          try {
            const wallet = await requestUnlock(pincode)
            setExportedKey(wallet.secretKey)
            clearKey()
          } catch (err: any) {
            setExportPincodeError(err?.message ?? "Could not unlock wallet")
          } finally {
            setExportLoading(false)
          }
        }}
        onCancel={() => {
          if (exportedKey) setExportedKey(null)
          setExportModalOpen(false)
          setExportPincodeError(null)
          setExportCopied(false)
          setExportLoading(false)
        }}
        loading={exportLoading}
        error={exportPincodeError}
      >
        {exportedKey ? (
          <div className="space-y-3 text-left">
            <p className="text-xs font-black text-[#ff4fb8]">
              ⚠️ Anyone with this secret key controls this wallet. Never share. Save it somewhere only you can access.
            </p>
            <textarea
              readOnly
              value={exportedKey}
              onFocus={(e) => e.currentTarget.select()}
              className="block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-xs font-mono font-bold text-[#140625]"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
                onClick={async () => {
                  try {
                    if (navigator?.clipboard?.writeText) {
                      await navigator.clipboard.writeText(exportedKey)
                      setExportCopied(true)
                      setTimeout(() => setExportCopied(false), 2500)
                    }
                  } catch {
                    // ignore — user can copy manually
                  }
                }}
              >
                {exportCopied ? "Copied!" : "Copy to clipboard"}
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
                onClick={() => {
                  setExportModalOpen(false)
                  setExportedKey(null)
                  setExportCopied(false)
                }}
              >
                Done
              </button>
            </div>
            <p className="text-xs font-bold text-[#5a3b66]">
              To restore in another browser, open <code className="font-mono">/wallet/signup</code> → Import.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-left text-sm font-bold text-[#3c214b]">
            <p>
              Enter your pincode to reveal your secret key. This unlocks
              the encrypted key in your browser and shows it once.
            </p>
            <p className="text-xs font-black text-[#ff4fb8]">
              ⚠️ Anyone with this secret key controls this wallet. Never paste it on a website you don&apos;t trust.
            </p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  )
}
