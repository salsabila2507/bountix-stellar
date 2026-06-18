"use client";

import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";
import type { ReactNode } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function PrivyProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) return <>{children}</>;
  return (
    <PrivyProviderBase
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "light",
          accentColor: "#7c3cff",
          logo: "/bountix-comic/bountix_assets_ready/bountix-app-icon.png",
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
