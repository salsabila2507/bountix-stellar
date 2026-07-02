"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/lib/stellar/wallet-context"
import { useSecretKey } from "@/lib/stellar/wallet-context"
import { fetchAccount, type Balance } from "@/lib/stellar/horizon"
import { buildChangeTrust, signTransaction, submitTransaction } from "@/lib/stellar/transactions"
import { Asset } from "@stellar/stellar-sdk"
import { ConfirmationModal } from "@/components/wallet/confirmation-modal"

const KNOWN_ASSETS = [
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
  { code: "USDT", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
]

export default function AssetsPage() {
  const { publicKey, isLocked, refreshAccount } = useWallet()
  const { secretKey, requestUnlock, clearKey } = useSecretKey()

  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [addingAsset, setAddingAsset] = useState<{ code: string; issuer: string } | null>(null)

  useEffect(() => {
    if (publicKey && !isLocked) {
      fetchAccount(publicKey)
        .then((a) => setBalances(a.balances))
        .catch(() => setBalances([]))
    }
  }, [publicKey, isLocked])

  const hasTrustline = (code: string, issuer: string) =>
    balances.some((b) => b.asset_code === code && b.asset_issuer === issuer)

  const handleAddTrustline = (code: string, issuer: string) => {
    setAddingAsset({ code, issuer })
    setShowConfirm(true)
  }

  const handleConfirm = async (pincode: string) => {
    if (!addingAsset) return
    setConfirmError(null)
    setLoading(true)
    try {
      const wallet = await requestUnlock(pincode)
      const asset = new Asset(addingAsset.code, addingAsset.issuer)
      const tx = await buildChangeTrust(wallet.secretKey, asset)
      const signed = signTransaction(tx, wallet.secretKey)
      await submitTransaction(signed)
      setShowConfirm(false)
      clearKey()
      refreshAccount()
    } catch (err: any) {
      setConfirmError(err.message ?? "Failed to add trustline")
    } finally {
      setLoading(false)
    }
  }

  if (isLocked || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm font-bold text-[#5a3b66]">Unlock your wallet first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-black text-[#140625]">Assets & Trustlines</h1>

      <div className="comic-card p-6">
        <h2 className="text-lg font-black text-[#140625]">Your Balances</h2>
        {balances.length === 0 ? (
          <p className="text-sm font-bold text-[#5a3b66] text-center py-4">No balances loaded</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#140625] text-left text-xs font-black uppercase text-[#5a3b66]">
                  <th className="pb-2 pr-4">Asset</th>
                  <th className="pb-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b, i) => (
                  <tr key={i} className="border-b border-[#140625]/10">
                    <td className="py-2 pr-4 font-bold text-[#140625]">{b.asset_type === "native" ? "XLM" : `${b.asset_code}`}</td>
                    <td className="py-2 font-mono text-[#140625]">{Number(b.balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="comic-card p-6">
        <h2 className="text-lg font-black text-[#140625]">Available Assets</h2>
        <p className="mt-1 text-sm font-bold text-[#5a3b66]">
          Add trustlines to hold non-XLM assets.
        </p>
        <div className="mt-4 space-y-2">
          {KNOWN_ASSETS.map((asset) => {
            const added = hasTrustline(asset.code, asset.issuer)
            return (
              <div key={asset.code} className="flex items-center justify-between rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 shadow-[2px_2px_0_#140625]">
                <div>
                  <span className="font-black text-[#140625]">{asset.code}</span>
                  <p className="font-mono text-xs text-[#5a3b66] truncate w-48">{asset.issuer}</p>
                </div>
                {added ? (
                  <span className="rounded-md border-2 border-[#1f6b3a] bg-[#dff7e6] px-2 py-1 text-[0.65rem] font-black text-[#1f6b3a]">Added</span>
                ) : (
                  <button
                    className="inline-flex min-h-9 items-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#ffdd3d]"
                    onClick={() => handleAddTrustline(asset.code, asset.issuer)}
                  >
                    Add Trustline
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmationModal
        open={showConfirm}
        title="Add Trustline"
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirm(false)
          setConfirmError(null)
          setAddingAsset(null)
        }}
        loading={loading}
        error={confirmError}
      >
        <p className="text-sm text-[#140625]">
          Add trustline for <strong>{addingAsset?.code}</strong> ({addingAsset?.issuer?.slice(0, 8)}...)?
        </p>
      </ConfirmationModal>
    </div>
  )
}
