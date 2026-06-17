import { MessageCircleOff, ScrollText, ShieldAlert } from "lucide-react";
import { MotionReveal } from "@/components/motion-reveal";

const problemItems = [
  {
    icon: MessageCircleOff,
    title: "Chat chaos",
    description:
      "Work starts in community chat, then disappears into DMs and half-finished spreadsheets.",
  },
  {
    icon: ShieldAlert,
    title: "Trust blur",
    description:
      "Creators cannot tell who executes clearly until the deadline is already on fire.",
  },
  {
    icon: ScrollText,
    title: "Proof gets lost",
    description:
      "Operators finish valuable work, then lose the public proof inside private threads.",
  },
];

export function ProblemSection() {
  return (
    <section className="comic-band py-16 sm:py-20">
      <div className="container-page">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <MotionReveal>
            <p className="comic-chip bg-[#ff4fb8] text-white">The problem</p>
            <h2 className="mt-5 text-3xl font-black leading-tight text-[#140625] sm:text-5xl">
              Internet work has the talent. The workflow needs a punch.
            </h2>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <div className="speech-bubble bg-white p-5">
              <p className="text-base font-medium leading-8 text-[#3c214b]">
                Bountix gives community-powered teams a brighter place to define
                work, find the right operator, review proof, and keep reputation
                attached to the person who earned it.
              </p>
            </div>
          </MotionReveal>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {problemItems.map(({ icon: Icon, title, description }, index) => (
            <MotionReveal key={title} delay={index * 0.06}>
              <div className="comic-card h-full p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] text-[#140625] shadow-[3px_3px_0_#140625]">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-black text-[#ff4fb8]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-black text-[#140625]">
                  {title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
                  {description}
                </p>
              </div>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
