import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, ExternalLink, Trophy } from "lucide-react";
import { EarlyContributorsOnlyBadge } from "@/components/marketplace/badges";
import {
  TASK_TYPE_COLOR,
  type DbTask,
} from "@/lib/tasks";
import { formatUsdc } from "@/lib/payments";
import {
  DEFAULT_LOCALE,
  createTranslator,
  formatDate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

function StatusChip({
  status,
  locale,
}: {
  status: DbTask["status"];
  locale: Locale;
}) {
  const t = createTranslator(locale);
  const colors: Record<DbTask["status"], string> = {
    draft: "bg-white text-[#5a3b66]",
    open: "bg-[#38e7ff]",
    in_progress: "bg-[#ffdd3d]",
    submitted: "bg-[#f0d7ff]",
    completed: "bg-[#23b26d] text-white",
    cancelled: "bg-[#c9c0d3] text-[#5a3b66]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border-2 border-[#140625] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625] ${colors[status]}`}
    >
      {t(`market.status.${status}` as TranslationKey)}
    </span>
  );
}

export function DbTaskCard({
  task,
  detailHrefPrefix = "/tasks/",
  locale = DEFAULT_LOCALE,
}: {
  task: DbTask;
  detailHrefPrefix?: string;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const isOfficial = task.task_type !== "user_task";
  const isRaffle = task.reward_mode === "raffle";
  const isEarlyContributorOnly = task.access_level === "early_contributor";

  return (
    <Link
      href={`${detailHrefPrefix}${task.id}`}
      className="group relative block overflow-hidden rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[7px_7px_0_#140625] transition duration-200 hover:-translate-y-1 hover:bg-[#fff8ed]"
    >
      <span
        aria-hidden="true"
        className="halftone-mask absolute -right-8 -top-8 h-28 w-28 opacity-20"
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-3 w-full ${
          isOfficial ? "bg-[#7c3cff]" : "bg-[#38e7ff]"
        }`}
      />
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-md border-2 border-[#140625] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625] ${
              TASK_TYPE_COLOR[task.task_type]
            }`}
          >
            {t(`task.type.${task.task_type}` as TranslationKey)}
          </span>
          <StatusChip status={task.status} locale={locale} />
          {isRaffle ? (
            <span className="inline-flex items-center gap-1 rounded-md border-2 border-[#140625] bg-[#ffdd3d] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625]">
              <Trophy aria-hidden="true" className="h-3 w-3" />
              {t("raffle.label")}
            </span>
          ) : null}
          {isOfficial ? (
            <span className="inline-flex items-center rounded-md border-2 border-[#140625] bg-[#fff7e8] px-2 py-1 text-[0.6rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
              {t("market.badge.official")}
            </span>
          ) : null}
          {isEarlyContributorOnly ? (
            <EarlyContributorsOnlyBadge locale={locale} />
          ) : null}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {task.category ? (
              <p className="text-xs font-black uppercase text-[#7c3cff]">
                {task.category}
              </p>
            ) : null}
            <h3 className="mt-2 text-xl font-black leading-tight text-[#140625]">
              {task.title}
            </h3>
          </div>
          {task.reward_amount !== null ? (
            <p className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]">
              {formatUsdc(task.reward_amount, task.payment_token ?? "USDC")}
              {isRaffle ? t("market.reward.perWinner") : null}
              <Image
                src="/bountix-comic/stellar-icon.svg"
                alt="Stellar"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
            </p>
          ) : null}
        </div>

        <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-[#5a3b66]">
          {task.description}
        </p>

        <div className="mt-5 grid gap-2 text-xs font-black text-[#5a3b66] sm:grid-cols-2">
          {isRaffle ? (
            <span className="inline-flex items-center gap-2">
              <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
              {task.raffle_winner_count}{" "}
              {task.raffle_winner_count === 1
                ? t("raffle.winner")
                : t("raffle.winners")}
            </span>
          ) : null}
          {task.end_date ? (
            <span className="inline-flex items-center gap-2">
              <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
              {t("market.card.ends", {
                date: formatDate(task.end_date, locale),
              })}
            </span>
          ) : null}
          {task.external_link ? (
            <span className="inline-flex items-center gap-2">
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              {t("market.card.externalLink")}
            </span>
          ) : null}
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#7c3cff]">
          {t("market.card.viewTask")}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
