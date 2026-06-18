import { getPrivyUser } from "@/lib/auth/privy-server";
import { createClient } from "@/utils/supabase/server";

export async function getServerUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return { supabase, userId: user.id, email: user.email };
  }

  const privyUser = await getPrivyUser();
  if (privyUser) {
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

  return null;
}
