"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import {
  hasWallet,
  getPublicKey,
  createAndStoreWallet,
  unlockWallet,
  clearWallet,
  type WalletAccount,
} from "./wallet-store"
import { fetchAccount, type AccountInfo } from "./horizon"

interface WalletContextType {
  isLoaded: boolean
  isLocked: boolean
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
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)

  useEffect(() => {
    const pk = getPublicKey()
    if (pk) {
      setPublicKey(pk)
      setIsLocked(true)
    }
    setIsLoaded(true)
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
      refreshAccount()
    }
  }, [publicKey, isLocked, refreshAccount])

  const createWallet = useCallback(async (pincode: string) => {
    const wallet = await createAndStoreWallet(pincode)
    setPublicKey(wallet.publicKey)
    setIsLocked(false)
    return wallet
  }, [])

  const unlock = useCallback(async (pincode: string) => {
    const wallet = await unlockWallet(pincode)
    setPublicKey(wallet.publicKey)
    setIsLocked(false)
    return wallet
  }, [])

  const lock = useCallback(() => {
    setIsLocked(true)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        isLoaded,
        isLocked,
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
