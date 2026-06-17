import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, Sparkles } from "lucide-react";
import { AccessBadge, PaymentBadge } from "@/components/marketplace/badges";
import type { Creator } from "@/lib/marketplace";

type CreatorCardProps = {
  creator: Creator;
};

export function CreatorCard({ creator }: CreatorCardProps) {
  return (
    <Link
      href={`/creators/${creator.id}`}
      className="group relative block overflow-hidden rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[7px_7px_0_#140625] transition duration-200 hover:-translate-y-1 hover:bg-[#fff8ed]"
    >
      <span
        aria-hidden="true"
        className="halftone-mask absolute -right-8 -top-8 h-28 w-28 opacity-20"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-3 w-full bg-[#ff4fb8]"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] text-sm font-black text-[#140625] shadow-[4px_4px_0_#140625]">
              {creator.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <h3 className="text-lg font-black text-[#140625]">
                {creator.name}
              </h3>
              <p className="text-sm font-bold text-[#7c3cff]">
                {creator.handle}
              </p>
            </div>
          </div>
          {creator.availableForEscrow ? (
            <PaymentBadge type="escrow" />
          ) : (
            <PaymentBadge type="regular" />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <AccessBadge variant="preview" />
        </div>

        <p className="mt-5 text-xs font-black uppercase text-[#7c3cff]">
          {creator.title}
        </p>
        <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#5a3b66]">
          {creator.summary}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg border-2 border-[#140625] bg-[#38e7ff] p-3 shadow-[3px_3px_0_#140625]">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            <p className="mt-2 text-lg font-black text-[#140625]">
              {creator.reputation}
            </p>
            <p className="text-[0.68rem] font-black uppercase text-[#5a3b66]">
              Rep
            </p>
          </div>
          <div className="rounded-lg border-2 border-[#140625] bg-[#ffdd3d] p-3 shadow-[3px_3px_0_#140625]">
            <BadgeCheck aria-hidden="true" className="h-4 w-4" />
            <p className="mt-2 text-lg font-black text-[#140625]">
              {creator.approvalRate}
            </p>
            <p className="text-[0.68rem] font-black uppercase text-[#5a3b66]">
              Approval
            </p>
          </div>
          <div className="rounded-lg border-2 border-[#140625] bg-[#f1d8ff] p-3 shadow-[3px_3px_0_#140625]">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            <p className="mt-2 text-lg font-black text-[#140625]">
              {creator.responseTime}
            </p>
            <p className="text-[0.68rem] font-black uppercase text-[#5a3b66]">
              Reply
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {creator.specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-lg border-2 border-[#140625] bg-white px-2.5 py-1 text-xs font-black text-[#140625]"
            >
              {specialty}
            </span>
          ))}
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#7c3cff]">
          View profile
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
