import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export type PrivyUser = {
  id: string;
  email: string | null;
};

export async function getPrivyUser(): Promise<PrivyUser | null> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return null;

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, privy_did")
      .eq("privy_did", sessionUser.id)
      .maybeSingle();

    if (!profile) return null;

    return {
      id: profile.id,
      email: null,
    };
  } catch {
    return null;
  }
}
