import { PrivyClient } from "@privy-io/server-auth";
import { cookies } from "next/headers";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";
const privy = PRIVY_APP_ID && PRIVY_APP_SECRET ? new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET) : null;

export type PrivyUser = {
  id: string;
  email: string | null;
};

export async function getPrivyUser(): Promise<PrivyUser | null> {
  if (!privy) return null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("privy-token")?.value;
    if (!token) return null;

    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);

    return {
      id: user.id,
      email: user.email?.address ?? null,
    };
  } catch {
    return null;
  }
}
