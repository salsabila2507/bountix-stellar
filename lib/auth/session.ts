import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "bountix-default-session-secret-change-in-prod";

export type SessionUser = {
  id: string;
  email: string | null;
};

function sign(payload: string): string {
  const hmac = createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  return hmac.digest("hex");
}

export function createSessionCookie(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: userId })).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function readSessionCookie(value: string | undefined): SessionUser | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(payload);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get("session")?.value;
    return readSessionCookie(value);
  } catch {
    return null;
  }
}
