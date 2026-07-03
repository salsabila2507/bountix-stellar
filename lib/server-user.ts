import { createClient, createAdminClient } from "@/utils/supabase/server";
import { createHash } from "node:crypto";

function getDefaultUsername(userId: string) {
  const suffix = createHash("sha256").update(userId).digest("hex").slice(0, 10);
  return `user_${suffix}`;
}

export async function getServerUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    if (!profile.username) {
      await adminSupabase
        .from("profiles")
        .update({ username: getDefaultUsername(user.id) })
        .eq("id", profile.id);
    }
    return { supabase: adminSupabase, userId: profile.id };
  }

  const { data: newProfile } = await adminSupabase
    .from("profiles")
    .insert({
      id: user.id,
      username: getDefaultUsername(user.id),
    })
    .select("id")
    .single();

  if (newProfile) {
    return { supabase: adminSupabase, userId: newProfile.id };
  }

  return { supabase: adminSupabase, userId: user.id };
}
