"use client"

import { useWallet } from "@/lib/stellar/wallet-context"
import { fetchPayments, type PaymentRecord } from "@/lib/stellar/horizon"
import { useEffect, useState } from "react"
import Link from "next/link"

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

  useEffect(() => {
    if (publicKey && !isLocked) {
      setLoadingPayments(true)
      fetchPayments(publicKey, 10)
        .then(setPayments)
        .catch(() => setPayments([]))
        .finally(() => setLoadingPayments(false))
    }
  }, [publicKey, isLocked])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (isLocked || !publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="card bg-base-200 shadow-xl max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Stellar Wallet</h1>
          <p className="text-base-content/70 mb-6">
            Create a new wallet or unlock your existing one.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/wallet/signup" className="btn btn-primary">
              Create Wallet
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const xlmBalance = account?.balances?.find((b) => b.asset_type === "native")
  const otherBalances = account?.balances?.filter((b) => b.asset_type !== "native") ?? []

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="card-title text-2xl">Wallet</h2>
              <p className="text-sm font-mono text-base-content/60 truncate max-w-xs sm:max-w-md">
                {publicKey}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={refreshAccount}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          <div className="stats shadow mt-4 w-full">
            <div className="stat">
              <div className="stat-title">XLM Balance</div>
              <div className="stat-value text-primary">
                {xlmBalance ? formatBalance(xlmBalance.balance, "native") : "0 XLM"}
              </div>
              <div className="stat-desc">Stellar Testnet</div>
            </div>
          </div>

          {otherBalances.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Other Assets</h3>
              <div className="flex flex-wrap gap-2">
                {otherBalances.map((b, i) => (
                  <div key={i} className="badge badge-outline badge-lg gap-2">
                    {formatBalance(b.balance, b.asset_type, b.asset_code)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/wallet/send" className="card bg-primary text-primary-content hover:opacity-90 transition-opacity">
          <div className="card-body items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <h3 className="card-title text-sm">Send</h3>
          </div>
        </Link>
        <Link href="/wallet/contacts" className="card bg-secondary text-secondary-content hover:opacity-90 transition-opacity">
          <div className="card-body items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="card-title text-sm">Contacts</h3>
          </div>
        </Link>
        <Link href="/wallet/assets" className="card bg-accent text-accent-content hover:opacity-90 transition-opacity">
          <div className="card-body items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="card-title text-sm">Assets</h3>
          </div>
        </Link>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Recent Payments</h3>
          {loadingPayments ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-base-content/60 text-center py-4">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>From / To</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 10).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={`badge ${p.from === publicKey ? "badge-error" : "badge-success"} badge-sm`}>
                          {p.from === publicKey ? "Sent" : "Received"}
                        </span>
                      </td>
                      <td>
                        {p.amount} {p.asset_code ?? "XLM"}
                      </td>
                      <td className="font-mono text-xs truncate max-w-[120px]">
                        {p.from === publicKey ? p.to : p.from}
                      </td>
                      <td className="text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
