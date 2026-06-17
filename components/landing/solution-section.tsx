import Image from "next/image";
import { ArrowRight, BadgeCheck, ClipboardList, Send } from "lucide-react";
import { MotionReveal } from "@/components/motion-reveal";

const assetBase = "/bountix-comic/bountix_assets_ready";

const steps = [
  {
    title: "Post a sharp task",
    description:
      "Creators publish scope, budget, proof requirements, and what done actually means.",
    icon: ClipboardList,
    color: "bg-[#38e7ff]",
  },
  {
    title: "Operators submit proof",
    description:
      "Community operators attach the deliverable, context, and links needed for review.",
    icon: Send,
    color: "bg-[#ff4fb8] text-white",
  },
  {
    title: "Reputation compounds",
    description:
      "Accepted work becomes a portable signal for the next creator choosing who to trust.",
    icon: BadgeCheck,
    color: "bg-[#ffdd3d]",
  },
];

export function SolutionSection() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="container-page">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <MotionReveal className="max-w-2xl">
            <p className="comic-chip bg-[#38e7ff]">The loop</p>
            <h2 className="mt-5 text-3xl font-black leading-tight text-[#140625] sm:text-5xl">
              A task marketplace that feels fast without feeling unserious.
            </h2>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <Image
              src={`${assetBase}/sticker-repeat.png`}
              alt=""
              width={144}
              height={144}
              className="hidden w-32 rotate-6 object-contain drop-shadow-[5px_5px_0_#140625] lg:block"
            />
          </MotionReveal>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <MotionReveal key={step.title} delay={index * 0.08}>
                <div className="comic-card relative h-full overflow-hidden p-6">
                  <div className="halftone-mask absolute bottom-0 right-0 h-28 w-28 opacity-25" />
                  <div className="relative flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#140625] shadow-[3px_3px_0_#140625] ${step.color}`}
                    >
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-5 w-5 text-[#140625]"
                    />
                    <span className="text-sm font-black uppercase text-[#7c3cff]">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="relative mt-7 text-2xl font-black text-[#140625]">
                    {step.title}
                  </h3>
                  <p className="relative mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
                    {step.description}
                  </p>
                </div>
              </MotionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
