import { getSessionUser } from "@/lib/auth/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const allCookies = cookieStore.getAll().map((c) => c.name);

  const sessionUser = await getSessionUser();

  return Response.json({
    hasSessionCookie: !!sessionCookie,
    sessionCookieLength: sessionCookie?.length ?? 0,
    sessionCookiePrefix: sessionCookie ? sessionCookie.substring(0, 20) + "..." : null,
    sessionUser,
    allCookieNames: allCookies,
    envSessionSecret: process.env.SESSION_SECRET ? "set" : "not set (using default)",
  });
}
