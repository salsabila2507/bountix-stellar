import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Users } from "lucide-react";
import {
  EarlyContributorsOnlyBadge,
  NegotiableBadge,
  PaymentBadge,
  StatusBadge,
  TaskTypeBadge,
} from "@/components/marketplace/badges";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";
import type { Task } from "@/lib/marketplace";

const assetBase = "/bountix-comic/bountix_assets_ready";

const categoryIcons: Record<string, string> = {
  Research: `${assetBase}/icon-writing.png`,
  QA: `${assetBase}/icon-design.png`,
  Operations: `${assetBase}/icon-community.png`,
  Growth: `${assetBase}/icon-marketing.png`,
  Development: `${assetBase}/icon-development.png`,
};

type TaskCardProps = {
  task: Task;
  locale?: Locale;
};

export function TaskCard({ task, locale = DEFAULT_LOCALE }: TaskCardProps) {
  const t = createTranslator(locale);
  const icon = categoryIcons[task.category] ?? `${assetBase}/icon-community.png`;
  const title = t(`preview.${task.id}.title` as TranslationKey);
  const summary = t(`preview.${task.id}.summary` as TranslationKey);

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group relative block overflow-hidden rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[7px_7px_0_#140625] transition duration-200 hover:-translate-y-1 hover:bg-[#fff8ed]"
    >
      <span
        aria-hidden="true"
        className="halftone-mask absolute -right-8 -top-8 h-28 w-28 opacity-20"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-3 w-full bg-[#38e7ff]"
      />
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          <TaskTypeBadge type="task" locale={locale} />
          <PaymentBadge type={task.paymentType} locale={locale} />
          <StatusBadge status={task.status} locale={locale} />
          <NegotiableBadge negotiable={task.negotiable} locale={locale} />
          {task.accessLevel === "early_contributor" ? (
            <EarlyContributorsOnlyBadge locale={locale} />
          ) : null}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Image
              src={icon}
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[#7c3cff]">
                {task.category}
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight text-[#140625]">
                {title}
              </h3>
            </div>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]">
            {task.budget}
            <Image
              src="/bountix-comic/stellar-icon.svg"
              alt="Stellar"
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
          </p>
        </div>

        <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-[#5a3b66]">
          {summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {task.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border-2 border-[#140625] bg-[#f1d8ff] px-2.5 py-1 text-xs font-black text-[#140625]"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 border-t-2 border-dashed border-[#140625]/30 pt-4 text-xs font-black text-[#5a3b66] sm:grid-cols-3">
          <span className="inline-flex items-center gap-2">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            {task.timeline}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {task.applicants} {t("market.card.applicants")}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {task.location}
          </span>
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#7c3cff]">
          {t("market.card.previewBounty")}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
