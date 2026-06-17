import Image from "next/image";
import { BadgeCheck, CheckCircle2, Gauge, ShieldCheck, Star } from "lucide-react";
import { MotionReveal } from "@/components/motion-reveal";

const assetBase = "/bountix-comic/bountix_assets_ready";

const stats = [
  { label: "Reputation", value: "842", icon: Gauge },
  { label: "Completed", value: "67", icon: CheckCircle2 },
  { label: "Approval", value: "98%", icon: BadgeCheck },
];

const specialties = ["Research", "Ops", "Growth", "QA"];

function OperatorProfileCard() {
  return (
    <div className="comic-card relative overflow-hidden p-5">
      <div className="halftone-mask absolute right-0 top-0 h-32 w-32 opacity-30" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-[#7c3cff]">
            Operator profile
          </p>
          <h3 className="mt-3 text-3xl font-black text-[#140625]">Nova Park</h3>
          <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-[#5a3b66]">
            Verified execution record across internet-native teams.
          </p>
        </div>
        <Image
          src={`${assetBase}/icon-community.png`}
          alt=""
          width={76}
          height={76}
          className="h-16 w-16 shrink-0 object-contain"
        />
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3"
          >
            <Icon aria-hidden="true" className="h-4 w-4 text-[#ff4fb8]" />
            <p className="mt-3 text-lg font-black text-[#140625]">{value}</p>
            <p className="mt-1 text-[0.68rem] font-black uppercase text-[#5a3b66]">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-6">
        <p className="text-xs font-black uppercase text-[#7c3cff]">
          Specialties
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-1.5 text-xs font-black text-[#140625]"
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OperatorProfileSection() {
  return (
    <section className="comic-band py-16 sm:py-20">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <MotionReveal>
          <p className="comic-chip bg-[#ffdd3d]">Reputation</p>
          <h2 className="mt-5 text-3xl font-black leading-tight text-[#140625] sm:text-5xl">
            Execution history should be portable, visible, and earned.
          </h2>
          <p className="mt-5 max-w-xl text-base font-medium leading-8 text-[#3c214b]">
            Bountix profiles turn accepted tasks into a record of scores,
            approvals, specialties, and the work trail behind them.
          </p>
          <div className="mt-7 inline-flex items-center gap-3 rounded-lg border-2 border-[#140625] bg-white px-4 py-3 text-sm font-black text-[#140625] shadow-[4px_4px_0_#140625]">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#23b26d]" />
            Reputation grows from accepted work.
          </div>
          <div className="mt-5 flex gap-2 text-[#ff4fb8]">
            {[0, 1, 2, 3, 4].map((star) => (
              <Star
                key={star}
                aria-hidden="true"
                className="h-6 w-6 fill-current"
              />
            ))}
          </div>
        </MotionReveal>
        <MotionReveal delay={0.12}>
          <OperatorProfileCard />
        </MotionReveal>
      </div>
    </section>
  );
}
