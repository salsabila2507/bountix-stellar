"use client"

import { WalletProvider } from "@/lib/stellar/wallet-context"
import { ReactNode } from "react"

export default function WalletLayout({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>
}
