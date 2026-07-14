"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  getStoredWallet,
  createAndStoreWallet,
  unlockWallet,
  type WalletAccount,
} from "./wallet-store"
import { fetchAccount, type AccountInfo } from "./horizon"

interface WalletContextType {
  isLoaded: boolean
  isLocked: boolean
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
  const [userId, setUserId] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)

  useEffect(() => {
    let currentUid: string | null = null

    const loadWalletForUser = (uid: string | null) => {
      currentUid = uid
      setUserId(uid)
      setAccount(null)
      const stored = uid ? getStoredWallet(uid) : null
      setIsLocked(stored?.authMode !== "session")
      setPublicKey(stored?.publicKey ?? null)
    }

    const handleWalletUpdated = () => {
      loadWalletForUser(currentUid)
    }

    const supabase = createClient()
    window.addEventListener("bountix-wallet-updated", handleWalletUpdated)

    supabase.auth.getUser().then(({ data: { user } }) => {
      loadWalletForUser(user?.id ?? null)
      setIsLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadWalletForUser(session?.user?.id ?? null)
      setIsLoaded(true)
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
