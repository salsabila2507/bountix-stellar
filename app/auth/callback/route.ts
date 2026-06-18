import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Auth callback — Privy handles auth client-side. */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard/profile", request.url));
}
