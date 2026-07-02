import { getPrivyUser } from "@/lib/auth/privy-server";
import { getDefaultPrivyUsername } from "@/lib/auth/profile";
import { createAdminClient } from "@/utils/supabase/server";

export async function getServerUser() {
  const supabase = createAdminClient();
  const privyUser = await getPrivyUser();
  if (privyUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("privy_did", privyUser.id)
      .maybeSingle();

    if (profile) {
      if (!profile.username) {
        await supabase
          .from("profiles")
          .update({ username: getDefaultPrivyUsername(privyUser.id) })
          .eq("id", profile.id);
      }
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
