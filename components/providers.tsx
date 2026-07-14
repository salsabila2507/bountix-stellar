"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/stellar/wallet-context";

const ChatProvider = dynamic(
  () => import("@/lib/chat/chat-provider").then((m) => m.ChatProvider),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ChatProvider>{children}</ChatProvider>
    </WalletProvider>
  );
}
