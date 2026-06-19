import { getPrivyUser } from "@/lib/auth/privy-server";
import { getDefaultPrivyUsername } from "@/lib/auth/profile";
import { createClient } from "@/utils/supabase/server";

export async function getServerUser() {
  const supabase = await createClient();
  const privyUser = await getPrivyUser();
  if (privyUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("privy_did", privyUser.id)
      .maybeSingle();

    if (profile) {
      return { supabase, userId: profile.id };
    }

    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        privy_did: privyUser.id,
        username: getDefaultPrivyUsername(privyUser.id),
      })
      .select("id")
      .single();

    if (newProfile) {
      return { supabase, userId: newProfile.id };
    }

    return { supabase, userId: privyUser.id };
  }

  return null;
}
