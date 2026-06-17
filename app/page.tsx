import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bolt,
  CheckCircle2,
  Clock3,
  Coins,
  Globe2,
  LockKeyhole,
  Menu,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TaskCarousel } from "@/components/landing/task-carousel";
import { createTranslator, type TranslationKey } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const assetBase = "/bountix-comic/bountix_assets_ready";
const telegramGroupUrl = "https://t.me/+V78fuYlQNvcxYTNl";
const xUrl = "https://x.com/bountixofc";

const navItems = [
  { href: "#explore", labelKey: "landing.nav.explore" },
  { href: "#how", labelKey: "landing.nav.how" },
  { href: "#categories", labelKey: "landing.nav.categories" },
  { href: "#rewards", labelKey: "landing.nav.rewards" },
] satisfies { href: string; labelKey: TranslationKey }[];

type ActionVariant = "pink" | "yellow" | "cyan" | "white";

type LandingAction = {
  href: string;
  labelKey: TranslationKey;
  variant: ActionVariant;
};

const actionVariantClasses = {
  pink: "bg-[#ff4fb8] text-white hover:bg-[#ff72c7]",
  yellow: "bg-[#ffdd3d] text-[#17072b] hover:bg-[#ffe775]",
  cyan: "bg-[#38e7ff] text-[#17072b] hover:bg-[#74f0ff]",
  white: "bg-white text-[#17072b] hover:bg-[#f0d7ff]",
} satisfies Record<ActionVariant, string>;

const guestHeaderActions = [
  { href: "/login", labelKey: "common.login", variant: "white" },
  { href: "/signup", labelKey: "common.joinWaitlist", variant: "pink" },
] satisfies LandingAction[];

const authedHeaderSecondaryActions = [
  { href: "/post-task", labelKey: "common.postTask", variant: "yellow" },
  { href: "/tasks", labelKey: "common.tasks", variant: "white" },
  { href: "/notifications", labelKey: "common.notifications", variant: "cyan" },
  { href: "/dashboard/profile", labelKey: "dashboard.nav.profile", variant: "white" },
] satisfies LandingAction[];

const guestHeroActions = [
  { href: "/signup", labelKey: "common.joinWaitlist", variant: "pink" },
  { href: "/tasks", labelKey: "common.browseTasks", variant: "yellow" },
] satisfies LandingAction[];

const authedHeroActions = [
  { href: "/post-task", labelKey: "common.postTask", variant: "yellow" },
  { href: "/tasks", labelKey: "common.tasks", variant: "white" },
] satisfies LandingAction[];

const guestFinalActions = [
  { href: "/signup", labelKey: "common.joinWaitlist", variant: "pink" },
  { href: "/login", labelKey: "common.login", variant: "white" },
  { href: "/tasks", labelKey: "common.browseTasks", variant: "yellow" },
] satisfies LandingAction[];

const authedFinalActions = [
  { href: "/dashboard", labelKey: "common.dashboard", variant: "pink" },
  { href: "/post-task", labelKey: "common.postTask", variant: "yellow" },
  { href: "/tasks", labelKey: "common.tasks", variant: "white" },
] satisfies LandingAction[];

const stickerItems = [
  {
    labelKey: "landing.sticker.post",
    src: `${assetBase}/sticker-chat-community.png`,
    className: "left-2 top-4 -rotate-6 bg-[#38e7ff]",
  },
  {
    labelKey: "landing.sticker.earn",
    src: `${assetBase}/sticker-earn.png`,
    className: "right-1 top-10 rotate-6 bg-[#ffdd3d]",
  },
  {
    labelKey: "landing.sticker.repeat",
    src: `${assetBase}/sticker-repeat.png`,
    className: "left-8 bottom-8 rotate-6 bg-[#f0d7ff]",
  },
  {
    labelKey: "landing.sticker.letsGo",
    src: `${assetBase}/sticker-lets-go.png`,
    className: "right-8 bottom-4 -rotate-6 bg-[#ff4fb8] text-white",
  },
] satisfies { labelKey: TranslationKey; src: string; className: string }[];

const categoryPills = [
  "common.all",
  "landing.category.social",
  "landing.category.fun",
  "landing.category.local",
  "landing.category.creative",
  "landing.category.testing",
  "landing.category.other",
] satisfies TranslationKey[];

const bountyCards = [
  {
    titleKey: "landing.bounty.follow.title",
    descriptionKey: "landing.bounty.follow.body",
    reward: "15 USDC",
    categoryKey: "landing.category.social",
    icon: `${assetBase}/icon-marketing.png`,
    color: "bg-[#38e7ff]",
    applicants: "18",
  },
  {
    titleKey: "landing.bounty.partner.title",
    descriptionKey: "landing.bounty.partner.body",
    reward: "80 USDC",
    categoryKey: "landing.category.fun",
    icon: `${assetBase}/sticker-lets-go.png`,
    color: "bg-[#ff4fb8] text-white",
    applicants: "24",
  },
  {
    titleKey: "landing.bounty.dog.title",
    descriptionKey: "landing.bounty.dog.body",
    reward: "150 USDC",
    categoryKey: "landing.category.local",
    icon: `${assetBase}/icon-community.png`,
    color: "bg-[#ffdd3d]",
    applicants: "31",
  },
  {
    titleKey: "landing.bounty.meme.title",
    descriptionKey: "landing.bounty.meme.body",
    reward: "40 USDC",
    categoryKey: "landing.category.creative",
    icon: `${assetBase}/icon-writing.png`,
    color: "bg-[#f0d7ff]",
    applicants: "14",
  },
  {
    titleKey: "landing.bounty.qa.title",
    descriptionKey: "landing.bounty.qa.body",
    reward: "25 USDC",
    categoryKey: "landing.category.testing",
    icon: `${assetBase}/icon-development.png`,
    color: "bg-[#38e7ff]",
    applicants: "22",
  },
] satisfies {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  reward: string;
  categoryKey: TranslationKey;
  icon: string;
  color: string;
  applicants: string;
}[];

const howSteps = [
  {
    titleKey: "landing.how.step1.title",
    textKey: "landing.how.step1.body",
  },
  {
    titleKey: "landing.how.step2.title",
    textKey: "landing.how.step2.body",
  },
  {
    titleKey: "landing.how.step3.title",
    textKey: "landing.how.step3.body",
  },
] satisfies { titleKey: TranslationKey; textKey: TranslationKey }[];

const whyItems = [
  { labelKey: "landing.why.fastMatching", icon: Zap },
  { labelKey: "landing.why.trustedCommunity", icon: ShieldCheck },
  { labelKey: "landing.why.flexibleRewards", icon: Sparkles },
  { labelKey: "landing.why.realTimeProgress", icon: Clock3 },
  { labelKey: "landing.why.escrowProtected", icon: LockKeyhole },
] satisfies { labelKey: TranslationKey; icon: typeof Zap }[];

const stats = [
  ["LIVE", "landing.stats.live"],
  ["OPEN", "landing.stats.gated"],
  ["USDC", "landing.stats.usdc"],
  ["STELLAR", "landing.stats.stellar"],
] satisfies [string, TranslationKey][];

/**
 * Public landing must render even if Supabase env is not configured locally.
 */
async function getCurrentUser() {
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

function ComicButton({
  href,
  children,
  variant = "pink",
}: {
  href: string;
  children: React.ReactNode;
  variant?: ActionVariant;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#17072b] px-5 py-3 text-center text-sm font-black uppercase shadow-[5px_5px_0_#17072b] transition hover:-translate-y-0.5 ${actionVariantClasses[variant]}`}
    >
      {children}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

function Sticker({
  sticker,
}: {
  sticker: { label: string; src: string; className: string };
}) {
  return (
    <div
      className={`absolute z-20 hidden items-center gap-2 rounded-lg border-2 border-[#17072b] px-3 py-2 text-xs font-black uppercase text-[#17072b] shadow-[5px_5px_0_#17072b] sm:flex ${sticker.className}`}
    >
      <Image
        src={sticker.src}
        alt=""
        width={52}
        height={52}
        className="h-11 w-11 object-contain"
      />
      {sticker.label}
    </div>
  );
}

function BountyCard({
  bounty,
  accessLabel,
  paymentLabel,
}: {
  bounty: {
    title: string;
    description: string;
    reward: string;
    category: string;
    icon: string;
    color: string;
    applicants: string;
  };
  accessLabel: string;
  paymentLabel: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-lg border-2 border-[#17072b] bg-white p-4 shadow-[6px_6px_0_#17072b]">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(rgba(23,7,43,0.22)_1px,transparent_1.6px)] bg-[length:10px_10px]" />
      <div className="relative flex items-start justify-between gap-4">
        <span
          className={`rounded-lg border-2 border-[#17072b] px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_#17072b] ${bounty.color}`}
        >
          {bounty.category}
        </span>
        <Image
          src={bounty.icon}
          alt=""
          width={58}
          height={58}
          className="h-12 w-12 shrink-0 object-contain"
        />
      </div>
      <span className="relative mt-3 inline-flex items-center gap-1 rounded-md border-2 border-[#17072b] bg-[#ff4fb8] px-2 py-0.5 text-[0.65rem] font-black uppercase text-white shadow-[2px_2px_0_#17072b]">
        {accessLabel}
      </span>
      <h3 className="relative mt-3 min-h-14 text-xl font-black leading-tight text-[#17072b]">
        {bounty.title}
      </h3>
      <p className="relative mt-3 line-clamp-3 min-h-[4.5rem] text-sm font-bold leading-6 text-[#5a3b66]">
        {bounty.description}
      </p>
      <div className="relative mt-5 flex items-center justify-between gap-3 border-t-2 border-dashed border-[#17072b]/25 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] px-3 py-2 text-sm font-black text-[#17072b]">
            {bounty.reward}
            <Image
              src="/bountix-comic/stellar-icon.svg"
              alt="Stellar"
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-[#17072b] bg-[#0d3a86] px-2 py-1 text-[0.6rem] font-black uppercase tracking-wide text-white shadow-[2px_2px_0_#17072b]">
            <Coins aria-hidden="true" className="h-3 w-3" />
            {paymentLabel}
          </span>
        </div>
        <span className="flex items-center gap-2 text-xs font-black text-[#5a3b66]">
          <span className="flex -space-x-2">
            <span className="h-6 w-6 rounded-full border-2 border-[#17072b] bg-[#38e7ff]" />
            <span className="h-6 w-6 rounded-full border-2 border-[#17072b] bg-[#ff4fb8]" />
            <span className="h-6 w-6 rounded-full border-2 border-[#17072b] bg-[#ffdd3d]" />
          </span>
          {bounty.applicants}
        </span>
      </div>
    </article>
  );
}

export default async function Home() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const heroActions = user ? authedHeroActions : guestHeroActions;
  const finalActions = user ? authedFinalActions : guestFinalActions;
  const mobileHeaderActions = user
    ? [
        {
          href: "/dashboard",
          labelKey: "common.dashboard",
          variant: "pink",
        } satisfies LandingAction,
        ...authedHeaderSecondaryActions,
      ]
    : guestFinalActions;
  const stickers = stickerItems.map((sticker) => ({
    ...sticker,
    label: t(sticker.labelKey),
  }));
  const translatedBountyCards = bountyCards.map((bounty) => ({
    title: t(bounty.titleKey),
    description: t(bounty.descriptionKey),
    reward: bounty.reward,
    category: t(bounty.categoryKey),
    icon: bounty.icon,
    color: bounty.color,
    applicants: bounty.applicants,
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ff4fb8_0,#6f3cff_34%,#17072b_74%)] px-0 py-0 text-[#17072b] sm:px-5 sm:py-6">
      <div className="mx-auto max-w-[1180px] overflow-hidden border-[#17072b] bg-[#fff7e8] shadow-none sm:rounded-[1.4rem] sm:border-[3px] sm:shadow-[12px_12px_0_rgba(0,0,0,0.34)]">
        <header className="relative z-40 border-b-2 border-[#17072b] bg-[#fff7e8]">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 sm:min-h-16 sm:px-6">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3"
              aria-label="Bountix home"
            >
              <Image
                src={`${assetBase}/bountix-logo-dark-banner.png`}
                alt="Bountix"
                width={164}
                height={48}
                priority
                className="hidden h-9 w-auto object-contain sm:block"
              />
              <span className="relative h-10 w-10 overflow-hidden rounded-lg border-2 border-[#17072b] bg-[#38e7ff] shadow-[3px_3px_0_#17072b] sm:hidden">
                <Image
                  src={`${assetBase}/bountix-app-icon.png`}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                  priority
                />
              </span>
              <span className="text-lg font-black uppercase sm:hidden">
                Bountix
              </span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-black uppercase text-[#17072b] transition hover:bg-[#ffdd3d]"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <LanguageSwitcher locale={locale} />
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-[#17072b] bg-[#ff4fb8] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#17072b] transition hover:-translate-y-0.5 hover:bg-[#ff72c7]"
                  >
                    {t("common.dashboard")}
                  </Link>
                  <details className="relative">
                    <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border-2 border-[#17072b] bg-white px-3 py-2 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b] transition hover:-translate-y-0.5 hover:bg-[#f0d7ff] [&::-webkit-details-marker]:hidden">
                      <Menu aria-hidden="true" className="h-4 w-4" />
                      Menu
                    </summary>
                    <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-lg border-2 border-[#17072b] bg-[#fff7e8] p-3 shadow-[7px_7px_0_#17072b]">
                      <div className="grid gap-2">
                        {authedHeaderSecondaryActions.map((action) => (
                          <Link
                            key={action.href}
                            href={action.href}
                            className={`flex min-h-10 items-center rounded-lg border-2 border-[#17072b] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#17072b] transition hover:-translate-y-0.5 ${actionVariantClasses[action.variant]}`}
                          >
                            {t(action.labelKey)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </details>
                </>
              ) : (
                guestHeaderActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-[#17072b] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#17072b] transition hover:-translate-y-0.5 ${actionVariantClasses[action.variant]}`}
                  >
                    {t(action.labelKey)}
                  </Link>
                ))
              )}
            </div>

            <details className="relative lg:hidden">
              <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center rounded-lg border-2 border-[#17072b] bg-white px-3 py-2 text-[#17072b] shadow-[3px_3px_0_#17072b] transition hover:bg-[#f0d7ff] [&::-webkit-details-marker]:hidden">
                <Menu aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-lg border-2 border-[#17072b] bg-[#fff7e8] p-3 shadow-[7px_7px_0_#17072b]">
                <div className="grid gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg border-2 border-[#17072b] bg-white px-3 py-2 text-sm font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b] transition hover:bg-[#ffdd3d]"
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </div>
                <div className="mt-3 border-t-2 border-[#17072b]/20 pt-3">
                  <LanguageSwitcher
                    locale={locale}
                    className="w-full justify-between"
                  />
                </div>
                <div className="mt-3 grid gap-2 border-t-2 border-[#17072b]/20 pt-3">
                  {mobileHeaderActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`rounded-lg border-2 border-[#17072b] px-3 py-2 text-sm font-black uppercase shadow-[3px_3px_0_#17072b] transition hover:-translate-y-0.5 ${actionVariantClasses[action.variant]}`}
                    >
                      {t(action.labelKey)}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </header>

        <section className="relative overflow-hidden bg-[#17072b] px-4 py-5 text-white sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1.8px)] bg-[length:18px_18px] opacity-55" />
          <div className="absolute -left-20 top-12 h-28 w-[130%] -rotate-6 border-y-2 border-white/20 bg-[#6f3cff]/45" />
          <div className="absolute -right-32 bottom-16 h-28 w-[120%] rotate-6 border-y-2 border-white/15 bg-[#ff4fb8]/25" />

          <div className="relative z-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] px-3 py-1.5 text-xs font-black uppercase text-[#17072b] shadow-[4px_4px_0_#000]">
                {t("early.liveAccess")}
              </p>
              <div className="mt-3 flex items-center gap-3 sm:hidden">
                <div className="relative h-24 w-24 shrink-0 rounded-lg border-2 border-[#17072b] bg-white shadow-[5px_5px_0_#000]">
                  <Image
                    src={`${assetBase}/bountix-hero-emblem.png`}
                    alt="Bountix hero emblem"
                    width={112}
                    height={112}
                    priority
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#38e7ff] px-2 py-1 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#000]">
                    <Image
                      src={`${assetBase}/sticker-chat-community.png`}
                      alt=""
                      width={30}
                      height={30}
                      className="h-7 w-7 object-contain"
                    />
                    {t("landing.sticker.post")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] px-2 py-1 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#000]">
                    <Image
                      src={`${assetBase}/sticker-earn.png`}
                      alt=""
                      width={30}
                      height={30}
                      className="h-7 w-7 object-contain"
                    />
                    {t("landing.sticker.earn")}
                  </span>
                </div>
              </div>
              <h1 className="mt-4 text-[3.35rem] font-black uppercase leading-[0.82] tracking-normal sm:text-7xl lg:text-[6.6rem]">
                <span className="block text-white drop-shadow-[5px_5px_0_#000]">
                  {t("landing.hero.line1")}
                </span>
                <span className="block text-[#ff4fb8] drop-shadow-[5px_5px_0_#000]">
                  {t("landing.hero.line2")}
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base font-bold leading-7 text-white/86 sm:text-xl sm:leading-8">
                {t("landing.hero.body")}
              </p>
              <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                {heroActions.map((action) => (
                  <ComicButton
                    key={action.href}
                    href={action.href}
                    variant={action.variant}
                  >
                    {t(action.labelKey)}
                  </ComicButton>
                ))}
              </div>
            </div>

            <div className="relative min-h-[230px] sm:min-h-[360px] lg:min-h-[520px]">
              {stickers.map((sticker) => (
                <Sticker key={sticker.label} sticker={sticker} />
              ))}
              <div className="absolute right-2 top-2 z-10 h-[210px] w-[210px] rounded-[1rem] border-2 border-[#17072b] bg-white shadow-[8px_8px_0_#000] sm:right-14 sm:top-8 sm:h-[330px] sm:w-[330px] lg:right-16 lg:h-[430px] lg:w-[430px]">
                <div className="absolute inset-0 bg-[radial-gradient(rgba(23,7,43,0.16)_1px,transparent_1.6px)] bg-[length:13px_13px]" />
                <Image
                  src="/bountix-comic/hero-logo-latest.png"
                  alt="Bountix"
                  width={520}
                  height={520}
                  priority
                  className="relative z-10 h-full w-full object-contain p-4 drop-shadow-[8px_8px_0_#17072b]"
                />
              </div>
              <div className="absolute bottom-2 left-0 z-20 flex sm:hidden">
                <div className="flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#38e7ff] px-2 py-1.5 text-xs font-black uppercase text-[#17072b] shadow-[4px_4px_0_#000]">
                  <Image
                    src={`${assetBase}/sticker-chat-community.png`}
                    alt=""
                    width={36}
                    height={36}
                    className="h-8 w-8 object-contain"
                  />
                  {t("landing.sticker.post")}
                </div>
                <div className="-ml-2 mt-8 flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] px-2 py-1.5 text-xs font-black uppercase text-[#17072b] shadow-[4px_4px_0_#000]">
                  <Image
                    src={`${assetBase}/sticker-earn.png`}
                    alt=""
                    width={36}
                    height={36}
                    className="h-8 w-8 object-contain"
                  />
                  {t("landing.sticker.earn")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <TaskCarousel locale={locale} />

        <section id="explore" className="bg-[#fff7e8] px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#38e7ff] px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0_#17072b]">
                <Bolt aria-hidden="true" className="h-4 w-4" />
                {t("landing.featured.badge")}
              </p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
                {t("landing.featured.title")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#5a3b66] sm:text-base">
                {t("landing.featured.body")}
              </p>
            </div>
            <Link
              href="/tasks"
              className="hidden items-center gap-2 text-sm font-black uppercase text-[#6f3cff] md:inline-flex"
            >
              {t("landing.featured.view")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div id="categories" className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {categoryPills.map((pillKey, index) => (
              <button
                key={pillKey}
                type="button"
                className={`shrink-0 rounded-lg border-2 border-[#17072b] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#17072b] ${
                  index === 0 ? "bg-[#ff4fb8] text-white" : "bg-white"
                }`}
              >
                {t(pillKey)}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {translatedBountyCards.map((bounty) => (
              <BountyCard
                key={bounty.title}
                bounty={bounty}
                accessLabel={t("early.access")}
                paymentLabel={t("payment.usdcReady")}
              />
            ))}
          </div>
        </section>

        <section
          id="base-ready"
          className="relative overflow-hidden border-y-2 border-[#17072b] bg-[#0d3a86] px-4 py-10 text-white sm:px-6 sm:py-12 lg:px-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1.6px)] bg-[length:14px_14px] opacity-50" />
          <div className="relative mx-auto max-w-[1180px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#38e7ff] px-3 py-1.5 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b]">
                  <Coins aria-hidden="true" className="h-4 w-4" />
                  {t("landing.stellar.badge")}
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-none drop-shadow-[3px_3px_0_#17072b] sm:text-5xl">
                  {t("landing.stellar.title")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-white/90 sm:text-base">
                  {t("landing.stellar.body")}
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border-2 border-[#17072b] bg-white px-3 py-2 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b] sm:inline-flex">
                <Globe2 aria-hidden="true" className="h-4 w-4" />
                {t("landing.stellar.onchain")}
              </div>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              <article className="rounded-[1rem] border-2 border-[#17072b] bg-[#fff7e8] p-5 text-[#17072b] shadow-[6px_6px_0_#17072b]">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#17072b] bg-[#38e7ff] shadow-[3px_3px_0_#17072b]">
                  <Coins aria-hidden="true" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-2xl font-black uppercase leading-tight">
                  {t("landing.stellar.usdc.title")}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
                  {t("landing.stellar.usdc.body")}
                </p>
                <span className="mt-4 inline-flex rounded-md border-2 border-[#17072b] bg-[#38e7ff] px-2 py-0.5 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#17072b]">
                  {t("common.live")}
                </span>
              </article>

              <article className="rounded-[1rem] border-2 border-[#17072b] bg-[#fff7e8] p-5 text-[#17072b] shadow-[6px_6px_0_#17072b]">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] shadow-[3px_3px_0_#17072b]">
                  <LockKeyhole aria-hidden="true" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-2xl font-black uppercase leading-tight">
                  {t("landing.stellar.escrow.title")}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
                  {t("landing.stellar.escrow.body")}
                </p>
                <span className="mt-4 inline-flex rounded-md border-2 border-[#17072b] bg-[#38e7ff] px-2 py-0.5 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#17072b]">
                  {t("common.live")}
                </span>
              </article>

              <article className="rounded-[1rem] border-2 border-[#17072b] bg-[#fff7e8] p-5 text-[#17072b] shadow-[6px_6px_0_#17072b]">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#17072b] bg-[#f0d7ff] shadow-[3px_3px_0_#17072b]">
                  <ShieldCheck aria-hidden="true" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-2xl font-black uppercase leading-tight">
                  {t("landing.stellar.reputation.title")}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
                  {t("landing.stellar.reputation.body")}
                </p>
                <span className="mt-4 inline-flex rounded-md border-2 border-[#17072b] bg-white px-2 py-0.5 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#17072b]">
                  {t("common.roadmap")}
                </span>
              </article>
            </div>

            <p className="mt-6 max-w-3xl text-xs font-bold leading-6 text-white/75">
              {t("landing.stellar.previewNote")}
            </p>
          </div>
        </section>

        <section
          id="how"
          className="border-y-2 border-[#17072b] bg-[#f0d7ff] px-4 py-8 sm:px-6 lg:px-10"
        >
          <div className="rounded-[1rem] border-2 border-[#17072b] bg-white p-4 shadow-[8px_8px_0_#17072b] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black uppercase leading-none sm:text-5xl">
                {t("landing.how.title")}
              </h2>
              <Rocket aria-hidden="true" className="hidden h-10 w-10 text-[#ff4fb8] sm:block" />
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {howSteps.map((step, index) => (
                <article
                  key={step.titleKey}
                  className="relative rounded-lg border-2 border-[#17072b] bg-[#fff7e8] p-5 shadow-[5px_5px_0_#17072b]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] text-2xl font-black shadow-[3px_3px_0_#17072b]">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-2xl font-black uppercase">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
                    {t(step.textKey)}
                  </p>
                  {index < howSteps.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="absolute -right-5 top-1/2 hidden h-8 w-8 -translate-y-1/2 text-[#17072b] lg:block"
                    />
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="rewards"
          className="grid gap-6 bg-[#fff7e8] px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-10"
        >
          <div>
            <p className="inline-flex rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0_#17072b]">
              {t("landing.why.badge")}
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-none sm:text-5xl">
              {t("landing.why.title")}
            </h2>
            <div className="mt-6 grid gap-3">
              {whyItems.map(({ labelKey, icon: Icon }) => (
                <div
                  key={labelKey}
                  className="flex items-center gap-3 rounded-lg border-2 border-[#17072b] bg-white p-3 shadow-[4px_4px_0_#17072b]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#17072b] bg-[#38e7ff]">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="font-black uppercase">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1rem] border-2 border-[#17072b] bg-white p-5 text-[#17072b] shadow-[8px_8px_0_#17072b]">
              <div className="grid grid-cols-2 gap-3">
                {stats.map(([value, labelKey], index) => (
                  <div
                    key={labelKey}
                    className={`rounded-lg border-2 border-[#17072b] p-4 shadow-[3px_3px_0_#17072b] ${
                      index % 3 === 0
                        ? "bg-[#38e7ff]"
                        : index % 3 === 1
                          ? "bg-[#ffdd3d]"
                          : "bg-[#f0d7ff]"
                    }`}
                  >
                    <p className="text-3xl font-black text-[#17072b]">
                      {value}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase text-[#5a3b66]">
                      {t(labelKey)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[1rem] border-2 border-[#17072b] bg-white p-5 shadow-[7px_7px_0_#17072b]">
              <MessageCircle
                aria-hidden="true"
                className="absolute right-4 top-4 h-7 w-7 text-[#ff4fb8]"
              />
              <p className="max-w-md text-xl font-black leading-tight">
                &quot;{t("landing.quote")}&quot;
              </p>
              <p className="mt-3 text-sm font-bold uppercase text-[#6f3cff]">
                {t("landing.quoteBy")}
              </p>
            </div>
          </div>
        </section>

        <section className="border-t-2 border-[#17072b] bg-[#ffdd3d] px-4 py-8 text-[#17072b] sm:px-6 lg:px-10">
          <div className="rounded-[1rem] border-2 border-[#17072b] bg-white p-6 shadow-[8px_8px_0_#17072b]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#38e7ff] px-3 py-1.5 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b]">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  {t("landing.cta.badge")}
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-none sm:text-5xl">
                  {t("landing.cta.title")}
                </h2>
                <p className="mt-4 max-w-xl text-base font-bold leading-7 text-[#5a3b66]">
                  {t("landing.cta.body")}
                </p>
                <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-[#5a3b66]">
                  {t("payment.copy")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[320px] lg:grid-cols-1">
                {finalActions.map((action) => (
                  <ComicButton
                    key={action.href}
                    href={action.href}
                    variant={action.variant}
                  >
                    {t(action.labelKey)}
                  </ComicButton>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t-2 border-[#17072b] bg-[#fff7e8] px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-md">
              <Image
                src={`${assetBase}/bountix-logo-dark-banner.png`}
                alt="Bountix"
                width={154}
                height={44}
                className="h-9 w-auto object-contain"
              />
              <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
                {t("landing.footer.body")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-black uppercase">
              <a href={xUrl} target="_blank" rel="noreferrer">
                {t("nav.x")}
              </a>
              <a href={telegramGroupUrl} target="_blank" rel="noreferrer">
                {t("nav.telegram")}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
