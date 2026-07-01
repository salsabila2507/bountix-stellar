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
        <p className="text-base-content/60">Unlock your wallet first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Assets & Trustlines</h1>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Your Balances</h2>
          {balances.length === 0 ? (
            <p className="text-base-content/60 text-center py-4">No balances loaded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b, i) => (
                    <tr key={i}>
                      <td>{b.asset_type === "native" ? "XLM" : `${b.asset_code}`}</td>
                      <td className="font-mono">{Number(b.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Available Assets</h2>
          <p className="text-sm text-base-content/60 mb-4">
            Add trustlines to hold non-XLM assets.
          </p>
          <div className="space-y-2">
            {KNOWN_ASSETS.map((asset) => {
              const added = hasTrustline(asset.code, asset.issuer)
              return (
                <div key={asset.code} className="flex items-center justify-between p-3 rounded-lg bg-base-300">
                  <div>
                    <span className="font-semibold">{asset.code}</span>
                    <p className="font-mono text-xs text-base-content/40 truncate w-48">{asset.issuer}</p>
                  </div>
                  {added ? (
                    <span className="badge badge-success badge-sm">Added</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddTrustline(asset.code, asset.issuer)}>
                      Add Trustline
                    </button>
                  )}
                </div>
              )
            })}
          </div>
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
        <p className="text-sm">
          Add trustline for <strong>{addingAsset?.code}</strong> ({addingAsset?.issuer?.slice(0, 8)}...)?
        </p>
      </ConfirmationModal>
    </div>
  )
}
