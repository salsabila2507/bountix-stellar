import { NextResponse, type NextRequest } from "next/server";

/** Pass-through middleware — auth is handled by Privy client-side. */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
