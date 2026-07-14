"use client"

export interface LocalTx {
  id: string
  txHash: string
  type: "send" | "receive" | "swap" | "create_account" | "change_trust" | "other"
  amount: string
  asset: string
  counterparty: string | null
  memo: string | null
  memoType: string | null
  status: "success" | "pending" | "failed"
  createdAt: string
}

function storageKey(userId?: string | null): string {
  const suffix = userId ? `_${userId}` : ""
  return `stellar_transactions${suffix}`
}

function getAll(userId?: string | null): LocalTx[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(storageKey(userId))
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(txs: LocalTx[], userId?: string | null): void {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(userId), JSON.stringify(txs))
}

export function getLocalTransactions(userId?: string | null, limit = 20): LocalTx[] {
  const all = getAll(userId)
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)
}

export function addLocalTransaction(
  tx: Omit<LocalTx, "id" | "createdAt">,
  userId?: string | null,
): LocalTx {
  const all = getAll(userId)
  const newTx: LocalTx = {
    ...tx,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  all.unshift(newTx)
  save(all, userId)
  return newTx
}
