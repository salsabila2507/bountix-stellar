import Image from "next/image";
import { Bolt, Globe2 } from "lucide-react";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

const assetBase = "/bountix-comic/bountix_assets_ready";

type CarouselTask = {
  titleKey: TranslationKey;
  categoryKey: TranslationKey;
  reward: string;
  badgeKey: TranslationKey;
  cardColor: string;
  badgeColor: string;
  icon: string;
};

const carouselTasks: CarouselTask[] = [
  {
    titleKey: "landing.bounty.follow.title",
    categoryKey: "landing.category.social",
    reward: "15 USDC",
    badgeKey: "early.access",
    cardColor: "bg-[#fff7e8]",
    badgeColor: "bg-[#38e7ff]",
    icon: `${assetBase}/icon-marketing.png`,
  },
  {
    titleKey: "landing.bounty.partner.title",
    categoryKey: "landing.category.fun",
    reward: "80 USDC",
    badgeKey: "common.preview",
    cardColor: "bg-[#ffe8f5]",
    badgeColor: "bg-[#ff4fb8] text-white",
    icon: `${assetBase}/sticker-lets-go.png`,
  },
  {
    titleKey: "landing.bounty.dog.title",
    categoryKey: "landing.category.local",
    reward: "150 USDC",
    badgeKey: "early.access",
    cardColor: "bg-[#fff7e8]",
    badgeColor: "bg-[#ffdd3d]",
    icon: `${assetBase}/icon-community.png`,
  },
  {
    titleKey: "carousel.task.ship.title",
    categoryKey: "carousel.category.jastip",
    reward: "45 USDC",
    badgeKey: "common.preview",
    cardColor: "bg-[#e7f9ff]",
    badgeColor: "bg-[#7c3cff] text-white",
    icon: `${assetBase}/sticker-earn.png`,
  },
  {
    titleKey: "carousel.task.singapore.title",
    categoryKey: "landing.category.local",
    reward: "30 USDC",
    badgeKey: "early.access",
    cardColor: "bg-[#fff7e8]",
    badgeColor: "bg-[#ffdd3d]",
    icon: `${assetBase}/icon-community.png`,
  },
  {
    titleKey: "landing.bounty.meme.title",
    categoryKey: "landing.category.creative",
    reward: "40 USDC",
    badgeKey: "common.preview",
    cardColor: "bg-[#f5e8ff]",
    badgeColor: "bg-[#f0d7ff]",
    icon: `${assetBase}/icon-writing.png`,
  },
  {
    titleKey: "landing.bounty.qa.title",
    categoryKey: "landing.category.testing",
    reward: "25 USDC",
    badgeKey: "early.access",
    cardColor: "bg-[#e7f9ff]",
    badgeColor: "bg-[#38e7ff]",
    icon: `${assetBase}/icon-development.png`,
  },
  {
    titleKey: "carousel.task.venue.title",
    categoryKey: "landing.category.local",
    reward: "60 USDC",
    badgeKey: "common.preview",
    cardColor: "bg-[#fff7e8]",
    badgeColor: "bg-[#ffdd3d]",
    icon: `${assetBase}/sticker-chat-community.png`,
  },
];

function CarouselCard({
  task,
  locale,
}: {
  task: CarouselTask;
  locale: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <article
      className={`task-carousel-card relative flex w-[260px] shrink-0 flex-col gap-3 rounded-lg border-2 border-[#17072b] p-4 shadow-[5px_5px_0_#17072b] sm:w-[300px] ${task.cardColor}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-md border-2 border-[#17072b] px-2 py-1 text-[0.65rem] font-black uppercase text-[#17072b] shadow-[2px_2px_0_#17072b] ${task.badgeColor}`}
        >
          {t(task.categoryKey)}
        </span>
        <span className="inline-flex items-center rounded-md border-2 border-[#17072b] bg-white px-2 py-0.5 text-[0.6rem] font-black uppercase text-[#17072b] shadow-[2px_2px_0_#17072b]">
          {t(task.badgeKey)}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-[#17072b] bg-white shadow-[3px_3px_0_#17072b]">
          <Image
            src={task.icon}
            alt=""
            width={44}
            height={44}
            className="h-9 w-9 object-contain"
          />
        </span>
        <h3 className="text-[0.95rem] font-black leading-tight text-[#17072b]">
          {t(task.titleKey)}
        </h3>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t-2 border-dashed border-[#17072b]/30 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#17072b] bg-[#ffdd3d] px-2.5 py-1 text-xs font-black text-[#17072b] shadow-[2px_2px_0_#17072b]">
          {task.reward}
          <Image
            src="/bountix-comic/stellar-icon.svg"
            alt="Stellar"
            width={14}
            height={14}
            className="h-3.5 w-3.5 object-contain"
          />
        </span>
        <span className="text-[0.65rem] font-black uppercase text-[#7c3cff]">
          {t("common.reward")}
        </span>
      </div>
    </article>
  );
}

export function TaskCarousel({
  locale = DEFAULT_LOCALE,
}: {
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const loopTasks = [...carouselTasks, ...carouselTasks];

  return (
    <section className="relative overflow-hidden border-y-2 border-[#17072b] bg-[#7c3cff] px-0 py-10 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1.6px)] bg-[length:16px_16px] opacity-60" />
      <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#17072b] bg-[#ffdd3d] px-3 py-1.5 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b]">
              <Globe2 aria-hidden="true" className="h-4 w-4" />
              {t("carousel.badge")}
            </span>
            <h2 className="mt-3 text-3xl font-black uppercase leading-none text-white drop-shadow-[3px_3px_0_#17072b] sm:text-5xl">
              {t("carousel.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/85 sm:text-base">
              {t("carousel.body")}
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border-2 border-[#17072b] bg-white px-3 py-2 text-xs font-black uppercase text-[#17072b] shadow-[3px_3px_0_#17072b] sm:inline-flex">
            <Bolt aria-hidden="true" className="h-4 w-4" />
            {t("early.preview")}
          </div>
        </div>
      </div>

      <div
        className="task-carousel-wrap relative mt-8"
        aria-label={t("carousel.aria")}
      >
        <div className="task-carousel-track flex gap-4 sm:gap-5">
          {loopTasks.map((task, index) => (
            <CarouselCard
              key={`${task.titleKey}-${index}`}
              task={task}
              locale={locale}
            />
          ))}
        </div>
        <div className="task-carousel-fade task-carousel-fade-left" aria-hidden="true" />
        <div className="task-carousel-fade task-carousel-fade-right" aria-hidden="true" />
      </div>
    </section>
  );
}
