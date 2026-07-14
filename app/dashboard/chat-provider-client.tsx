"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ChatProvider = dynamic(
  () => import("@/lib/chat/chat-provider").then((m) => m.ChatProvider),
  { ssr: false },
);

export default function ChatProviderClient({ children }: { children: ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
}
