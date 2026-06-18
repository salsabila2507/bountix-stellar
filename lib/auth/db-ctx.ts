import { getPrivyUser } from "@/lib/auth/privy-server";
import { createClient } from "@/utils/supabase/server";

export type AuthCtx = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
};

export async function getAuthCtx(): Promise<AuthCtx | null> {
  const privyUser = await getPrivyUser();
  if (!privyUser) return null;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("privy_did", privyUser.id)
    .maybeSingle();

  if (profile) {
    return { supabase, userId: profile.id, email: privyUser.email };
  }

  const { data: newProfile } = await supabase
    .from("profiles")
    .insert({
      privy_did: privyUser.id,
      email: privyUser.email,
    })
    .select("id")
    .single();

  if (newProfile) {
    return { supabase, userId: newProfile.id, email: privyUser.email };
  }

  return { supabase, userId: privyUser.id, email: privyUser.email };
}

export async function requireAuthCtx(): Promise<AuthCtx> {
  const ctx = await getAuthCtx();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}
