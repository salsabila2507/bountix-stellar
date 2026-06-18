"use client";

import { PrivyProvider } from "@/lib/auth/privy-provider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <PrivyProvider>{children}</PrivyProvider>;
}
