import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Edit3,
  Gift,
  Globe,
  Link as LinkIcon,
  Users,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import {
  getReferralLink,
  getReferralReviewStatus,
  type ReferralReviewStatus,
} from "@/lib/referrals";
import { getServerUser } from "@/lib/server-user";
import {
  PROFILE_LANGUAGE_LABEL,
  PROFILE_ROLE_LABEL,
  type Profile,
  type ProfileLanguage,
  type ProfileRole,
  type SocialLinks,
} from "@/lib/profile";

type ReferredUser = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  referred_at: string;
};

type ReferralSummary = {
  totalInvited: number;
  referredUsers: ReferredUser[];
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Profile",
  description: "Your Bountix profile, status, and task access.",
};

async function getSessionAndProfile(): Promise<
  { profile: Profile; referrals: ReferralSummary } | { profile: null }
> {
  const serverUser = await getServerUser();
  if (!serverUser) return { profile: null };
  const { supabase, userId } = serverUser;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, role, skills, wallet_address, social_links, preferred_language, can_use_platform, is_early_contributor, referral_code, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return { profile: null };
  const { data: referralRows, count } = await supabase
    .from("referrals")
    .select("referred_id, created_at", { count: "exact" })
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (referralRows ?? []) as {
    referred_id: string;
    created_at: string;
  }[];
  const referredIds = rows.map((row) => row.referred_id);
  const { data: referredProfiles } = referredIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, created_at")
        .in("id", referredIds)
    : { data: [] };
  const referredById = new Map(
    ((referredProfiles ?? []) as {
      id: string;
      username: string;
      display_name: string | null;
      created_at: string;
    }[]).map((referred) => [referred.id, referred]),
  );
  const referredUsers = rows
    .map((row) => {
      const referred = referredById.get(row.referred_id);
      if (!referred) return null;
      return {
        ...referred,
        referred_at: row.created_at,
      };
    })
    .filter((referred): referred is ReferredUser => referred !== null);

  return {
    profile: {
      ...data,
      role: data.role as ProfileRole,
      preferred_language: data.preferred_language as ProfileLanguage,
      social_links: (data.social_links ?? {}) as SocialLinks,
      skills: data.skills ?? [],
    } as Profile,
    referrals: {
      totalInvited: count ?? rows.length,
      referredUsers,
    },
  };
}

function getReferralStatusLabel(
  status: ReferralReviewStatus,
  t: ReturnType<typeof createTranslator>,
) {
  if (status === "approved") return t("referral.status.approved");
  if (status === "pending_review") {
    return t("referral.status.pendingReview");
  }
  return t("referral.status.inviteToQualify");
}

export default async function DashboardProfilePage() {
  let locale;
  let t;
  let result;
  try {
    locale = await getRequestLocale();
    t = createTranslator(locale);
    result = await getSessionAndProfile();
  } catch {
    redirect("/login");
  }
  if (!result || !result.profile) {
    redirect("/login");
  }
  const profile = result.profile;
  const referrals = result.referrals;
  const referralLink = getReferralLink(profile.referral_code);
  const referralReviewStatus = getReferralReviewStatus({
    invitedCount: referrals.totalInvited,
    isEarlyContributor: profile.is_early_contributor,
  });
  const referralStatusLabel = getReferralStatusLabel(referralReviewStatus, t);

  const isAdmin = profile.role === "admin";

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="comic-chip bg-[#ffdd3d]">
              {t("dashboard.profile.chip")}
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
              Hi, @{profile.username}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/profile/${profile.username}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
            >
              {t("dashboard.profile.viewPublic")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/profile/edit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
            >
              <Edit3 aria-hidden="true" className="h-4 w-4" />
              {t("common.editProfile")}
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <article className="comic-card relative overflow-hidden bg-[#fff8ed] p-6 sm:p-8">
            <div className="halftone-mask absolute -right-10 -top-10 h-40 w-40 opacity-20" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-[#140625] bg-[#ffdd3d] shadow-[5px_5px_0_#140625]">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-black text-[#140625]">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <div>
                <p className="text-sm font-bold text-[#7c3cff]">
                  @{profile.username}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#140625] sm:text-3xl">
                  {profile.display_name ?? `@${profile.username}`}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
                    <BadgeCheck
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    />
                    {PROFILE_ROLE_LABEL[profile.role]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-white px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
                    <Globe aria-hidden="true" className="h-3.5 w-3.5" />
                    {PROFILE_LANGUAGE_LABEL[profile.preferred_language]}
                  </span>
                  {profile.is_early_contributor ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#f1d8ff] px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
                      <BadgeCheck
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-[#7c3cff]"
                      />
                      {t("early.contributor")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="mt-6 whitespace-pre-line text-sm font-semibold leading-7 text-[#3c214b]">
              {profile.bio ?? t("dashboard.profile.noBio")}
            </p>

            {profile.skills.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-xs font-black uppercase text-[#5a3b66]">
                  {t("dashboard.profile.skills")}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border-2 border-[#140625] bg-white px-3 py-1.5 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <aside className="grid h-fit gap-4">
            <div className="comic-card-soft bg-[#dff7e6] p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck
                  aria-hidden="true"
                  className="h-5 w-5 text-[#1f6b3a]"
                />
                <h2 className="text-lg font-black text-[#140625]">
                  {t("dashboard.profile.fullAccess")}
                </h2>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-[#3c214b]">
                {t("dashboard.profile.fullAccessBody")}
              </p>
              {isAdmin ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border-2 border-[#140625] bg-white px-2 py-0.5 text-[0.65rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
                  {t("dashboard.profile.adminBypass")}
                </p>
              ) : null}
            </div>

            <div className="comic-card-soft bg-[#f1d8ff] p-5">
              <div className="flex items-center gap-2">
                <Gift aria-hidden="true" className="h-5 w-5 text-[#7c3cff]" />
                <h2 className="text-lg font-black text-[#140625]">
                  {t("referral.inviteFriends")}
                </h2>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-[#3c214b]">
                {t("referral.earnChance")}
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-[#3c214b]">
                {t("referral.earlyTasks")}
              </p>

              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-[#5a3b66]">
                    {t("referral.code")}
                  </p>
                  <p className="mt-1 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]">
                    {profile.referral_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-[#5a3b66]">
                    {t("referral.link")}
                  </p>
                  <a
                    href={referralLink}
                    className="mt-1 flex items-start gap-2 break-all rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-bold text-[#7c3cff] shadow-[3px_3px_0_#140625] underline decoration-2 underline-offset-2"
                  >
                    <LinkIcon
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    {referralLink}
                  </a>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-lg border-2 border-[#140625] bg-[#ffdd3d] p-3 shadow-[3px_3px_0_#140625]">
                  <p className="flex items-center gap-1.5 text-xs font-black uppercase text-[#5a3b66]">
                    <Users aria-hidden="true" className="h-3.5 w-3.5" />
                    {t("referral.totalInvited")}
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#140625]">
                    {referrals.totalInvited}
                  </p>
                </div>
                <div className="rounded-lg border-2 border-[#140625] bg-white p-3 shadow-[3px_3px_0_#140625]">
                  <p className="text-xs font-black uppercase text-[#5a3b66]">
                    {t("referral.reviewStatus")}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#140625]">
                    {referralStatusLabel}
                  </p>
                </div>
              </div>

              {referrals.referredUsers.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-black uppercase text-[#5a3b66]">
                    {t("referral.recentInvites")}
                  </p>
                  <div className="mt-2 grid gap-2">
                    {referrals.referredUsers.map((referred) => (
                      <Link
                        key={referred.id}
                        href={`/profile/${referred.username}`}
                        className="rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-bold text-[#3c214b] shadow-[2px_2px_0_#140625] transition hover:bg-[#fffaf4]"
                      >
                        <span className="font-black text-[#7c3cff]">
                          @{referred.username}
                        </span>
                        <span className="ml-1 text-[#5a3b66]">
                          {referred.display_name ?? ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="comic-card-soft bg-[#fffaf4] p-5">
              <div className="flex items-center gap-2">
                <Coins aria-hidden="true" className="h-5 w-5 text-[#7c3cff]" />
                <h2 className="text-lg font-black text-[#140625]">
                  {t("dashboard.profile.payments")}
                </h2>
              </div>
              <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
                {t("dashboard.profile.paymentsBody")}
              </p>
            </div>

            <div className="comic-card-soft bg-white p-5">
              <div className="flex items-center gap-2">
                <Wallet
                  aria-hidden="true"
                  className="h-5 w-5 text-[#7c3cff]"
                />
                <h2 className="text-lg font-black text-[#140625]">
                  {t("dashboard.profile.wallet")}
                </h2>
              </div>
              <p className="mt-2 break-all text-sm font-semibold leading-6 text-[#3c214b]">
                {profile.wallet_address ?? t("dashboard.profile.notConnected")}
              </p>
              <p className="mt-2 text-xs font-bold text-[#5a3b66]">
                {t("dashboard.profile.addressInfo")}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
