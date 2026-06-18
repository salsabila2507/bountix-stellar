import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const ref = request.nextUrl.searchParams.get("ref");
  let redirectUrl = "/dashboard/profile";
  if (ref) redirectUrl += `?ref=${encodeURIComponent(ref)}`;
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  response.cookies.set("privy-token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
