"use client"

import Link from "next/link"
import { ArrowLeftFromLine, House, User } from "lucide-react"
import type { ReactNode } from "react"

export default function WalletLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav className="sticky top-0 z-50 border-b-2 border-[#140625] bg-[#fffaf4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-xs font-black text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]"
            >
              <House className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center gap-1 rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-xs font-black text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]"
            >
              <User className="h-3.5 w-3.5" />
              Profile
            </Link>
          </div>
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-1 text-xs font-black text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]"
          >
            <ArrowLeftFromLine className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}
