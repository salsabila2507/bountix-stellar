import type { ReactNode } from "react";
import ChatProviderClient from "./chat-provider-client";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ChatProviderClient>{children}</ChatProviderClient>;
}
