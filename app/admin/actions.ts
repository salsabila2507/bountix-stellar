"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

function isInternalPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/\s/.test(value) &&
    value.length <= 500
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin") redirect("/dashboard/profile");

  return { supabase, user };
}

export async function setEarlyContributorAction(formData: FormData) {
  const profileId = String(formData.get("profile_id") ?? "");
  const isEarlyContributor =
    String(formData.get("is_early_contributor") ?? "") === "true";

  if (!isUuid(profileId)) return;

  const { supabase } = await requireAdmin();

  const { data: target } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ is_early_contributor: isEarlyContributor })
    .eq("id", profileId);

  if (error) return;

  revalidatePath("/admin");
  revalidatePath("/dashboard/profile");
  if (target?.username) {
    revalidatePath(`/profile/${target.username}`);
  }
}

export async function grantEarlyContributorFromReferralAction(
  formData: FormData,
) {
  const profileId = String(formData.get("profile_id") ?? "");

  if (!isUuid(profileId)) return;

  const { supabase } = await requireAdmin();

  const { data: target } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ is_early_contributor: true })
    .eq("id", profileId);

  if (error) return;

  revalidatePath("/admin");
  revalidatePath("/dashboard/profile");
  if (target?.username) {
    revalidatePath(`/profile/${target.username}`);
  }
}

export async function createGlobalNotificationAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();

  if (title.length < 1 || title.length > 140) return;
  if (body.length > 1000) return;
  if (linkUrl && !isInternalPath(linkUrl)) return;

  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("notifications").insert({
    user_id: null,
    type: "global",
    title,
    body,
    link_url: linkUrl || null,
  });

  if (error) return;

  revalidatePath("/admin");
  revalidatePath("/notifications");
}
