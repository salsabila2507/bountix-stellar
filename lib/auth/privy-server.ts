import { getSessionUser } from "@/lib/auth/session";

export type PrivyUser = {
  id: string;
};

export async function getPrivyUser(): Promise<PrivyUser | null> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return null;
    return sessionUser;
  } catch {
    return null;
  }
}
