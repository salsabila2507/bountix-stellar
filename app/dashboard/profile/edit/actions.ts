"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  buildSocialLinks,
  parseSkills,
  PROFILE_LANGUAGES,
  validateUrl,
  validateUsername,
  validateWalletAddress,
  type ProfileLanguage,
  type SocialLinks,
} from "@/lib/profile";
import type { ProfileEditState } from "@/lib/profile-edit-state";

export async function saveProfileAction(
  _previous: ProfileEditState,
  formData: FormData,
): Promise<ProfileEditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatar_url = String(formData.get("avatar_url") ?? "").trim();
  const wallet_address = String(formData.get("wallet_address") ?? "").trim();
  const preferred_language = String(formData.get("preferred_language") ?? "en");
  const skillsRaw = String(formData.get("skills") ?? "");

  const social: SocialLinks = {
    x: String(formData.get("social_x") ?? "").trim() || undefined,
    telegram:
      String(formData.get("social_telegram") ?? "").trim() || undefined,
    github: String(formData.get("social_github") ?? "").trim() || undefined,
    website: String(formData.get("social_website") ?? "").trim() || undefined,
  };

  const fieldErrors: ProfileEditState["fieldErrors"] = {};

  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  if (display_name && display_name.length > 60) {
    fieldErrors.display_name = "Display name must be 60 characters or fewer.";
  }
  if (bio && bio.length > 500) {
    fieldErrors.bio = "Bio must be 500 characters or fewer.";
  }
  if (avatar_url) {
    const e = validateUrl(avatar_url);
    if (e) fieldErrors.avatar_url = e;
    else if (avatar_url.length > 500)
      fieldErrors.avatar_url = "Avatar URL must be 500 characters or fewer.";
  }
  if (wallet_address) {
    const e = validateWalletAddress(wallet_address);
    if (e) fieldErrors.wallet_address = e;
  }
  if (social.website) {
    const e = validateUrl(social.website);
    if (e) fieldErrors.website = e;
  }
  if (!PROFILE_LANGUAGES.includes(preferred_language as ProfileLanguage)) {
    fieldErrors.preferred_language = "Pick a supported language.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const update = {
    username,
    display_name: display_name || null,
    bio: bio || null,
    avatar_url: avatar_url || null,
    wallet_address: wallet_address || null,
    skills: parseSkills(skillsRaw),
    social_links: buildSocialLinks(social),
    preferred_language: preferred_language as ProfileLanguage,
  };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "That username is already taken.",
        fieldErrors: { username: "Try a different username." },
      };
    }
    return {
      status: "error",
      message: error.message || "Could not save profile right now.",
    };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/profile/${username}`);

  return { status: "success", message: "Profile saved." };
}
