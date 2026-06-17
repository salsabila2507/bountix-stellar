import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Clock3,
  MessageSquareText,
  Tags,
  UserRound,
} from "lucide-react";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";
import type { PublicServiceOffer } from "@/lib/services";

const assetBase = "/bountix-comic/bountix_assets_ready";

const categoryIcons: Record<string, string> = {
  Design: `${assetBase}/icon-design.png`,
  Development: `${assetBase}/icon-development.png`,
  Marketing: `${assetBase}/icon-marketing.png`,
  Research: `${assetBase}/icon-writing.png`,
  Writing: `${assetBase}/icon-writing.png`,
};

function formatPrice(service: PublicServiceOffer, negotiableLabel: string) {
  if (service.price_amount === null) return negotiableLabel;
  const amount = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(service.price_amount);
  return `${amount} ${service.currency}`;
}

export function ServiceOfferCard({
  service,
  locale = DEFAULT_LOCALE,
  viewerIsAuthed,
}: {
  service: PublicServiceOffer;
  locale?: Locale;
  viewerIsAuthed: boolean;
}) {
  const t = createTranslator(locale);
  const creatorName =
    service.creator.display_name ?? `@${service.creator.username}`;
  const profileHref = `/profile/${service.creator.username}`;
  const icon =
    categoryIcons[service.category ?? ""] ?? `${assetBase}/icon-community.png`;
  const price = formatPrice(service, t("service.price.negotiable"));
  const isNegotiable = service.price_type === "negotiable";

  return (
    <article className="relative overflow-hidden rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[7px_7px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#fff8ed]">
      <span
        aria-hidden="true"
        className="halftone-mask absolute -right-8 -top-8 h-28 w-28 opacity-20"
      />
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-2.5 py-1 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
            {t("service.offer")}
          </span>
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-white px-2.5 py-1 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
            {service.payment_method === "escrow_stellar"
              ? t("service.payment.escrow_stellar")
              : t("service.payment.manual")}
          </span>
          {isNegotiable ? (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-2.5 py-1 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
              {t("service.price.negotiable")}
            </span>
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
            <div>
              <p className="text-xs font-black uppercase text-[#7c3cff]">
                {service.category ?? t("creators.card.categoryFallback")}
              </p>
              <h2 className="mt-2 text-xl font-black leading-tight text-[#140625]">
                {service.title}
              </h2>
            </div>
          </div>
          <p className="inline-flex shrink-0 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]">
            {isNegotiable && service.price_amount
              ? `${price} · ${t("service.price.negotiable")}`
              : price}
          </p>
        </div>

        <Link
          href={profileHref}
          className="mt-4 inline-flex min-w-0 items-center gap-2 text-sm font-black text-[#7c3cff] hover:underline"
        >
          <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {creatorName} · @{service.creator.username}
          </span>
          {service.creator.is_early_contributor ? (
            <BadgeCheck
              aria-label={t("early.contributor")}
              className="h-4 w-4 shrink-0 text-[#7c3cff]"
            />
          ) : null}
        </Link>

        <p className="mt-4 line-clamp-4 text-sm font-semibold leading-6 text-[#5a3b66]">
          {service.description}
        </p>

        {(service.tags ?? []).length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {(service.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-lg border-2 border-[#140625] bg-[#f2e6ff] px-2.5 py-1 text-xs font-black text-[#140625]"
              >
                <Tags aria-hidden="true" className="h-3.5 w-3.5" />
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 border-t-2 border-dashed border-[#140625]/30 pt-4 text-sm font-bold text-[#5a3b66]">
          <span className="inline-flex items-center gap-2 font-black">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-[#7c3cff]" />
            {t("service.deliveryTime")}:{" "}
            {service.delivery_time ?? t("service.noDeliveryTime")}
          </span>
          <p>
            {service.payment_method === "escrow_stellar"
              ? t("service.payment.escrowCopy")
              : t("service.payment.manualCopy")}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={viewerIsAuthed ? profileHref : "/signup"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
          >
            <MessageSquareText aria-hidden="true" className="h-4 w-4" />
            {viewerIsAuthed
              ? t("service.contactCreator")
              : t("service.signUpToRequest")}
          </Link>
          <Link
            href={profileHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-4 text-sm font-black uppercase text-[#140625] shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
          >
            {t("service.viewCreatorProfile")}
          </Link>
        </div>
      </div>
    </article>
  );
}
