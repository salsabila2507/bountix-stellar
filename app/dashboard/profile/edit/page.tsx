import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { createClient } from "@/utils/supabase/server";
import type { Profile, ProfileLanguage, ProfileRole, SocialLinks } from "@/lib/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Profile",
  description: "Edit your Bountix profile.",
};

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, role, skills, wallet_address, social_links, preferred_language, can_use_platform, is_early_contributor, referral_code, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    redirect("/dashboard/profile");
  }

  const profile: Profile = {
    ...data,
    role: data.role as ProfileRole,
    preferred_language: data.preferred_language as ProfileLanguage,
    social_links: (data.social_links ?? {}) as SocialLinks,
    skills: data.skills ?? [],
  } as Profile;

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to dashboard
        </Link>

        <section className="mx-auto mt-8 max-w-2xl">
          <ProfileEditForm profile={profile} />
        </section>
      </section>
    </main>
  );
}
