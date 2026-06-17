import Image from "next/image";
import {
  BadgeCheck,
  Clock3,
  Megaphone,
  Users,
} from "lucide-react";
import { CoordinationField } from "@/components/landing/coordination-field";
import { ButtonLink } from "@/components/ui/button";
import { tasks } from "@/lib/marketplace";

const assetBase = "/bountix-comic/bountix_assets_ready";

const heroIcons = [
  { label: "Design", src: `${assetBase}/icon-design.png` },
  { label: "Dev", src: `${assetBase}/icon-development.png` },
  { label: "Marketing", src: `${assetBase}/icon-marketing.png` },
  { label: "Writing", src: `${assetBase}/icon-writing.png` },
  { label: "Community", src: `${assetBase}/icon-community.png` },
];

const actionStickers = [
  {
    label: "POST",
    src: `${assetBase}/sticker-chat-community.png`,
    className: "left-0 top-4 rotate-[-8deg] bg-[#38e7ff]",
  },
  {
    label: "EARN",
    src: `${assetBase}/sticker-earn.png`,
    className: "right-0 top-10 rotate-[8deg] bg-[#ffdd3d]",
  },
  {
    label: "REPEAT",
    src: `${assetBase}/sticker-repeat.png`,
    className: "bottom-12 left-4 rotate-[7deg] bg-[#f2e6ff]",
  },
  {
    label: "LET'S GO",
    src: `${assetBase}/sticker-lets-go.png`,
    className: "bottom-2 right-8 rotate-[-6deg] bg-[#ff4fb8] text-white",
  },
];

const bountyIcons = [
  `${assetBase}/icon-marketing.png`,
  `${assetBase}/icon-design.png`,
  `${assetBase}/icon-writing.png`,
];

function StickerBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden sm:block">
      {actionStickers.map((sticker) => (
        <div
          key={sticker.label}
          className={`absolute flex items-center gap-2 rounded-lg border-2 border-[#140625] px-2.5 py-2 text-xs font-black text-[#140625] shadow-[4px_4px_0_#140625] ${sticker.className}`}
        >
          <Image
            src={sticker.src}
            alt=""
            width={46}
            height={46}
            className="h-10 w-10 object-contain"
          />
          {sticker.label}
        </div>
      ))}
    </div>
  );
}

function MobileStickerRow() {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2 sm:hidden">
      {actionStickers.map((sticker) => (
        <div
          key={sticker.label}
          className="flex min-h-16 flex-col items-center justify-center rounded-lg border-2 border-[#140625] bg-white px-1.5 py-2 text-center text-[0.62rem] font-black text-[#140625] shadow-[3px_3px_0_#140625]"
        >
          <Image
            src={sticker.src}
            alt=""
            width={34}
            height={34}
            className="h-8 w-8 object-contain"
          />
          <span className="mt-1 leading-none">{sticker.label}</span>
        </div>
      ))}
    </div>
  );
}

function BountyPreviewCards() {
  return (
    <div className="grid gap-3">
      {tasks.slice(0, 3).map((task, index) => (
        <article
          key={task.id}
          className="comic-card-soft relative overflow-hidden bg-white p-3 sm:p-4"
        >
          <div className="halftone-mask absolute -right-6 -top-6 h-20 w-20 opacity-20" />
          <div className="relative flex items-start gap-3">
            <Image
              src={bountyIcons[index]}
              alt=""
              width={46}
              height={46}
              className="h-11 w-11 shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm font-black leading-tight text-[#140625]">
                  {task.title}
                </p>
                <span className="shrink-0 rounded-md border-2 border-[#140625] bg-[#ffdd3d] px-2 py-1 text-xs font-black text-[#140625]">
                  {task.budget}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-[#5a3b66]">
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                  {task.timeline}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users aria-hidden="true" className="h-3.5 w-3.5" />
                  {task.applicants} applicants
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden pb-10 pt-4 sm:pb-14 sm:pt-6 lg:min-h-[calc(100vh-4.5rem)] lg:pb-10"
    >
      <CoordinationField />

      <div className="container-page relative z-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative z-20 max-w-2xl">
            <span className="comic-chip bg-[#38e7ff]">
              <Megaphone aria-hidden="true" className="h-3.5 w-3.5" />
              Community-powered task marketplace
            </span>

            <div className="mt-4 flex items-center gap-3 sm:hidden">
              <Image
                src={`${assetBase}/bountix-hero-emblem.png`}
                alt=""
                width={132}
                height={132}
                priority
                className="h-28 w-28 shrink-0 rotate-3 object-contain drop-shadow-[5px_5px_0_#140625]"
              />
              <div className="speech-bubble bg-white px-4 py-3 text-sm font-black leading-tight text-[#140625]">
                Post bounties. Reward execution.
              </div>
            </div>

            <h1 className="mt-5 text-5xl font-black leading-[0.92] text-[#140625] sm:text-6xl lg:text-7xl">
              Turn Tasks Into Rewards
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-[#3c214b] sm:text-xl sm:leading-8">
              Bountix helps communities post useful work, match trusted
              operators, verify proof, and turn every completed task into
              reputation that travels.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" className="sm:min-w-44">
                Sign up
              </ButtonLink>
              <ButtonLink
                href="/tasks"
                className="bg-[#ffdd3d] text-[#140625] hover:bg-[#38e7ff]"
              >
                Browse tasks
              </ButtonLink>
            </div>

            <MobileStickerRow />

            <div className="mt-5 flex flex-wrap gap-2">
              {heroIcons.map((icon) => (
                <span
                  key={icon.label}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-2.5 py-2 text-xs font-black text-[#140625] shadow-[3px_3px_0_#140625]"
                >
                  <Image
                    src={icon.src}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                  {icon.label}
                </span>
              ))}
            </div>

            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-lg border-2 border-[#140625] bg-[#f2e6ff] px-3 py-2 text-xs font-black text-[#140625] shadow-[3px_3px_0_#140625] sm:text-sm">
              <BadgeCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-[#7c3cff]" />
              Fun marketplace energy, professional proof and payout flow.
            </div>
          </div>

          <div className="relative z-10">
            <div className="relative mx-auto max-w-xl lg:max-w-2xl">
              <StickerBurst />
              <div className="relative mx-auto flex aspect-[1.06] max-h-[520px] min-h-[300px] items-center justify-center rounded-lg border-2 border-[#140625] bg-[#fffaf4] shadow-[10px_10px_0_#140625]">
                <div className="halftone-mask absolute inset-0 opacity-18" />
                <div className="absolute left-4 top-4 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-2 text-xs font-black text-[#140625] shadow-[3px_3px_0_#140625]">
                  BOUNTY PREVIEW
                </div>
                <Image
                  src={`${assetBase}/bountix-hero-emblem.png`}
                  alt="Bountix hero emblem"
                  width={520}
                  height={520}
                  priority
                  className="relative z-10 w-[78%] max-w-[460px] object-contain drop-shadow-[8px_8px_0_#140625]"
                />
              </div>
            </div>

            <div className="mt-4">
              <BountyPreviewCards />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-lg border-2 border-[#140625] bg-[#7c3cff] p-3 shadow-[6px_6px_0_#140625] sm:grid-cols-3 lg:mt-5">
          {[
            ["Post", "Drop a clear task brief"],
            ["Match", "Find community operators"],
            ["Reward", "Turn proof into reputation"],
          ].map(([label, text], index) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-md bg-white px-3 py-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-[#140625] bg-[#ffdd3d] text-sm font-black text-[#140625]">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-black text-[#140625]">{label}</p>
                <p className="text-xs font-semibold text-[#5a3b66]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
