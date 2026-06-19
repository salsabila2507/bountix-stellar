"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton({ label }: { label: string }) {
  const { logout } = usePrivy();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        await logout();
        router.push("/");
      }}
      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ff4fb8] hover:text-white"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
