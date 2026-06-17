import Image from "next/image";
import { BadgeCheck, CircleDollarSign, User } from "lucide-react";
import type { CompletedWork } from "@/lib/completed-work";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";

const assetBase = "/bountix-comic/bountix_assets_ready";

const taskTypeIcons: Record<string, string> = {
  Engagement: `${assetBase}/icon-community.png`,
  Design: `${assetBase}/icon-design.png`,
  QA: `${assetBase}/icon-design.png`,
  Community: `${assetBase}/icon-community.png`,
  Content: `${assetBase}/icon-writing.png`,
  Marketing: `${assetBase}/icon-marketing.png`,
};

type CompletedWorkCardProps = {
  item: CompletedWork;
  locale?: Locale;
};

export function CompletedWorkCard({
  item,
  locale = DEFAULT_LOCALE,
}: CompletedWorkCardProps) {
  const t = createTranslator(locale);
  const icon =
    taskTypeIcons[item.taskType] ?? `${assetBase}/icon-community.png`;

  return (
    <article className="group relative block overflow-hidden rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[7px_7px_0_#140625]">
      <span
        aria-hidden="true"
        className="halftone-mask absolute -right-8 -top-8 h-28 w-28 opacity-20"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-3 w-full bg-[#23b26d]"
      />
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#23b26d] px-2.5 py-1 text-xs font-black text-white shadow-[3px_3px_0_#140625]">
            <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
            {t("market.card.completedTask")}
          </span>
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-white px-2.5 py-1 text-xs font-black text-[#140625] shadow-[3px_3px_0_#140625]">
            <CircleDollarSign
              aria-hidden="true"
              className="h-3.5 w-3.5 text-[#23b26d]"
            />
            {t("payment.manualTitle")}
          </span>
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#f1d8ff] px-2.5 py-1 text-xs font-black text-[#140625] shadow-[3px_3px_0_#140625]">
            {item.taskType}
          </span>
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
                {item.project}
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight text-[#140625]">
                {item.title}
              </h3>
            </div>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]">
            {item.rewardAmount} {item.rewardCurrency}
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
          {item.description}
        </p>

        <div className="mt-5 rounded-lg border-2 border-dashed border-[#140625]/30 bg-[#f6fff9] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-[#23b26d]">
            {t("market.card.resultSubmitted")}
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-[#3c214b]">
            {item.result}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t-2 border-dashed border-[#140625]/30 pt-4 text-xs font-black text-[#5a3b66]">
          <User aria-hidden="true" className="h-3.5 w-3.5" />
          {t("market.card.completedBy", { worker: item.worker })}
        </div>
      </div>
    </article>
  );
}
