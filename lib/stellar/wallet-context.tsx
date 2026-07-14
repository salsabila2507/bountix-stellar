"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  getStoredWallet,
  saveWallet,
  createAndStoreWallet,
  unlockWallet,
  type StoredWallet,
  type WalletAccount,
} from "./wallet-store"
import { fetchAccount, type AccountInfo } from "./horizon"

interface WalletContextType {
  isLoaded: boolean
  isLocked: boolean
  authMode: StoredWallet["authMode"]
  userId: string | null
  publicKey: string | null
  account: AccountInfo | null
  createWallet: (pincode: string) => Promise<WalletAccount>
  unlock: (pincode: string) => Promise<WalletAccount>
  lock: () => void
  refreshAccount: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLocked, setIsLocked] = useState(true)
  const [authMode, setAuthMode] = useState<StoredWallet["authMode"]>("password")
  const [userId, setUserId] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)

  useEffect(() => {
    let currentUid: string | null = null
    let loadSeq = 0
    let authEventSeq = 0

    const applyStoredWallet = (uid: string | null, stored: StoredWallet | null) => {
      currentUid = uid
      setUserId(uid)
      setAccount(null)
      setAuthMode(stored?.authMode ?? "password")
      setIsLocked(stored?.authMode !== "session")
      setPublicKey(stored?.publicKey ?? null)
    }

    const loadWalletForUser = async (uid: string | null) => {
      const seq = ++loadSeq
      setIsLoaded(false)

      if (!uid) {
        applyStoredWallet(null, null)
        if (seq === loadSeq) setIsLoaded(true)
        return
      }

      const stored = uid ? getStoredWallet(uid) : null
      if (stored) {
        applyStoredWallet(uid, stored)
        if (seq === loadSeq) setIsLoaded(true)
        return
      }

      let resolvedWallet: StoredWallet | null = null
      try {
        const { data } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", uid)
          .maybeSingle()

        const legacy = getStoredWallet(null)
        if (legacy && data?.wallet_address === legacy.publicKey) {
          saveWallet(legacy.publicKey, legacy.encrypted, uid, legacy.authMode ?? "password")
          resolvedWallet = legacy
        }
      } catch {
        // Legacy migration is best-effort; a scoped wallet remains the source of truth.
      }

      if (seq !== loadSeq) return
      applyStoredWallet(uid, resolvedWallet)
      setIsLoaded(true)
    }

    const handleWalletUpdated = () => {
      void loadWalletForUser(currentUid)
    }

    const supabase = createClient()
    window.addEventListener("bountix-wallet-updated", handleWalletUpdated)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeq += 1
      void loadWalletForUser(session?.user?.id ?? null)
    })

    const initialAuthEventSeq = authEventSeq
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (authEventSeq !== initialAuthEventSeq) return
      void loadWalletForUser(user?.id ?? null)
    })

    return () => {
      window.removeEventListener("bountix-wallet-updated", handleWalletUpdated)
      subscription.unsubscribe()
    }
  }, [])

  const refreshAccount = useCallback(async () => {
    if (!publicKey) return
    try {
      const acc = await fetchAccount(publicKey)
      setAccount(acc)
    } catch {
      setAccount(null)
    }
  }, [publicKey])

  useEffect(() => {
    if (publicKey && isLocked === false) {
      queueMicrotask(() => {
        void refreshAccount()
      })
    }
  }, [publicKey, isLocked, refreshAccount])

  const createWallet = useCallback(async (pincode: string) => {
    const wallet = await createAndStoreWallet(pincode, userId)
    setPublicKey(wallet.publicKey)
    setIsLocked(false)
    return wallet
  }, [userId])

  const unlock = useCallback(async (pincode: string) => {
    const wallet = await unlockWallet(pincode, userId)
    setPublicKey(wallet.publicKey)
    setIsLocked(false)
    return wallet
  }, [userId])

  const lock = useCallback(() => {
    setIsLocked(true)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        isLoaded,
        isLocked,
        authMode,
        userId,
        publicKey,
        account,
        createWallet,
        unlock,
        lock,
        refreshAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider")
  return ctx
}

export function useSecretKey() {
  const [secretKey, setSecretKey] = useState<string | null>(null)
  const { unlock, lock } = useWallet()

  const requestUnlock = useCallback(
    async (pincode: string) => {
      const wallet = await unlock(pincode)
      setSecretKey(wallet.secretKey)
      return wallet
    },
    [unlock]
  )

  const clearKey = useCallback(() => {
    setSecretKey(null)
    lock()
  }, [lock])

  return { secretKey, requestUnlock, clearKey }
}
