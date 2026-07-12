"use client";

import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/stellar/wallet-context";
import { ChatProvider } from "@/lib/chat/chat-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </WalletProvider>
  );
}
