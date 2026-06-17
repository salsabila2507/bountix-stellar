import Image from "next/image";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ServiceOfferCard } from "@/components/marketplace/service-offer-card";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import {
  SERVICE_LIST_COLUMNS,
  type DbServiceOffer,
  type PublicServiceOffer,
  type ServiceCreatorProfile,
} from "@/lib/services";
import type { SocialLinks } from "@/lib/profile";

const assetBase = "/bountix-comic/bountix_assets_ready";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Creator Services",
  description: "Real creator service offers posted by Bountix users.",
};

async function fetchActiveServiceOffers(): Promise<{
  services: PublicServiceOffer[];
  viewerIsAuthed: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_LIST_COLUMNS)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(48);

    if (error || !data) {
      return { services: [], viewerIsAuthed: Boolean(user) };
    }

    const rows = data as DbServiceOffer[];
    const creatorIds = Array.from(
      new Set(rows.map((row) => row.creator_id).filter(Boolean) as string[]),
    );
    if (creatorIds.length === 0) {
      return { services: [], viewerIsAuthed: Boolean(user) };
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, skills, social_links, is_early_contributor",
      )
      .in("id", creatorIds);

    const profileMap = new Map<string, ServiceCreatorProfile>();
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        skills: profile.skills ?? [],
        social_links: (profile.social_links ?? {}) as SocialLinks,
        is_early_contributor: Boolean(profile.is_early_contributor),
      });
    }

    return {
      services: rows.flatMap((row) => {
        if (!row.creator_id) return [];
        const creator = profileMap.get(row.creator_id);
        if (!creator) return [];
        return [{ ...row, creator }];
      }),
      viewerIsAuthed: Boolean(user),
    };
  } catch {
    return { services: [], viewerIsAuthed: false };
  }
}

export default async function CreatorsPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { services, viewerIsAuthed } = await fetchActiveServiceOffers();
  const hasServices = services.length > 0;

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <div className="comic-card relative overflow-hidden bg-[#fff8ed] p-5 sm:p-8">
          <div className="halftone-mask absolute inset-0 opacity-15" />
          <div className="absolute bottom-6 right-8 hidden -rotate-6 md:block">
            <Image
              src={`${assetBase}/sticker-chat-community.png`}
              alt=""
              width={120}
              height={120}
              className="h-28 w-28 object-contain drop-shadow-[5px_5px_0_#140625]"
            />
          </div>
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="comic-chip bg-[#ffdd3d]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                {t("creators.chip")}
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.95] text-[#140625] sm:text-7xl">
                {hasServices
                  ? t("creators.titleLive")
                  : t("creators.titlePreparing")}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#3c214b] sm:text-xl">
                {hasServices
                  ? t("creators.bodyLive")
                  : t("creators.bodyPreparing")}
              </p>
            </div>
            <Link
              href={viewerIsAuthed ? "/post-service" : "/signup"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {viewerIsAuthed
                ? t("common.postService")
                : t("service.signUpToRequest")}
            </Link>
          </div>
        </div>

        <div className="mt-10">
          {hasServices ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceOfferCard
                  key={service.id}
                  service={service}
                  locale={locale}
                  viewerIsAuthed={viewerIsAuthed}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-[#140625] bg-white p-8 text-center shadow-[6px_6px_0_#140625]">
              <h2 className="text-xl font-black text-[#140625]">
                {t("creators.emptyTitle")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-[#5a3b66]">
                {t("creators.emptyBody")}
              </p>
              <Link
                href={viewerIsAuthed ? "/post-service" : "/signup"}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("service.beFirst")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
