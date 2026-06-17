import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Globe2,
  Hourglass,
  LockKeyhole,
  Megaphone,
  Send,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About",
  description:
    "Bountix is a task marketplace built around USDC on Stellar with manual payment and Stellar escrow.",
};

async function getCurrentUser() {
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function AboutPage() {
  const user = await getCurrentUser();

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-10 sm:py-14">

        {/* HERO */}
        <div className="comic-card relative overflow-hidden bg-[#fff8ed] p-6 sm:p-10">
          <div className="halftone-mask absolute inset-0 opacity-15" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-2 border-[#140625] bg-[#7c3cff]/40" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="comic-chip bg-[#7c3cff] text-white">
                <Globe2 aria-hidden="true" className="h-3.5 w-3.5" />
                Live MVP · Built for Stellar
              </p>
              <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
                Bountix is a task marketplace for Web3 projects, creators, and communities.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#3c214b] sm:text-lg">
                Bountix is open for signed-in users. They can create, apply to,
                submit, chat, and review tasks. Bountix and partners publish
                official tasks, campaigns, announcements, and giveaways.
                Rewards can be paid in USDC on Stellar through manual payment or
                Stellar escrow.
              </p>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[#3c214b] sm:text-lg">
                Bountix helps projects turn community work into structured
                tasks instead of scattered forms, group chats, and manual
                spreadsheets.
              </p>
            </div>
            <div className="grid gap-3 text-sm font-bold leading-6 text-[#5a3b66]">
              <Link
                href="/tasks"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
              >
                Browse tasks
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/post-task"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-5 py-3 text-sm font-black uppercase text-[#140625] shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
              >
                Post a task
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href={user ? "/dashboard/profile" : "/signup"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-5 py-3 text-sm font-black uppercase text-[#140625] shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
              >
                {user ? "Profile" : "Sign up"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* PROBLEM / SOLUTION / WHY BASE */}
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <article className="comic-card-soft bg-white p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ff4fb8] text-white shadow-[3px_3px_0_#140625]">
              <Target aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-black uppercase">Problem</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
              Web3 projects, creators, and communities need a simple way to
              distribute tasks, campaigns, giveaways, content requests,
              feedback jobs, and micro-work. Today the flow lives across
              forms, group chats, and shared sheets.
            </p>
          </article>
          <article className="comic-card-soft bg-white p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] shadow-[3px_3px_0_#140625]">
              <Zap aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-black uppercase">Solution</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
              Bountix is open for signed-in users. They create tasks,
              applicants pitch, accepted workers ship, and task
              creators review with approve, revision, or reject. Rewards can
              be paid in USDC on Stellar through manual payment or Stellar escrow.
            </p>
          </article>
          <article className="comic-card-soft bg-white p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] shadow-[3px_3px_0_#140625]">
              <Coins aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-black uppercase">Why Stellar</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
              Bountix supports USDC rewards on Stellar. Stellar gives us low-cost,
              fast payments for global contributors, and the deployed Stellar
              escrow contract can lock funds before work starts and release
              them after approval.
            </p>
          </article>
        </div>

        {/* WHAT'S SHIPPED */}
        <div className="mt-10 rounded-[1rem] border-2 border-[#140625] bg-white p-6 shadow-[8px_8px_0_#140625] sm:p-10">
          <p className="comic-chip bg-[#38e7ff]">Already shipped</p>
          <h2 className="mt-4 text-2xl font-black uppercase leading-none sm:text-4xl">
            What works today
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[#5a3b66]">
            Bountix is open for signed-in users. They can create, apply,
            submit, chat, and review tasks. Rewards can be paid in USDC on
            Stellar through manual payment or Stellar escrow.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Email auth via Supabase", "Sign up, log in, log out. Public and owner profile views with username, bio, skills, and wallet field."],
              ["Public soft open", "Signed-in profiles can create tasks, apply, submit, chat, and use payment flows."],
              ["Task lifecycle", "Create → open → in-progress → submitted → completed / cancelled. Owner edit + delete, per-user drafts."],
              ["Applications", "Workers apply, withdraw, get accepted or rejected. One application per (task, user)."],
              ["Submissions", "Accepted workers submit external delivery URLs and notes. No file uploads. Links only."],
              ["Review flow", "Owners and admins approve, request a revision, or reject with feedback notes."],
              ["Admin official content", "official_task, giveaway, campaign, announcement, and update. Admin-only at the database layer."],
              ["Secure access controls", "Role-based permissions protect admin tools, task actions, applications, and submissions."],
              ["Legacy signup data preserved", "Old signup data and tables stay intact; the active access path is account signup."],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-lg border-2 border-[#140625] bg-[#fff8ed] p-4 shadow-[4px_4px_0_#140625]"
              >
                <BadgeCheck
                  aria-hidden="true"
                  className="h-5 w-5 text-[#23b26d]"
                />
                <h3 className="mt-2 text-sm font-black uppercase">
                  {title}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#5a3b66]">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* WHO IT IS FOR */}
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="comic-card-soft bg-[#f2e6ff] p-5">
            <Send aria-hidden="true" className="h-5 w-5 text-[#7c3cff]" />
            <h3 className="mt-3 text-lg font-black uppercase">Who it&apos;s for</h3>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-[#3c214b]">
              <li>
                <strong>Web3 projects + DAOs</strong> running campaigns,
                giveaways, content briefs, QA passes, or meme contests.
              </li>
              <li>
                <strong>Creators + operators</strong> who want a clean way to
                pitch, ship, and get rewarded for online or local work.
              </li>
              <li>
                <strong>Communities</strong> distributing micro-tasks and
                bounties to grow contributor surface.
              </li>
            </ul>
          </article>
          <article className="comic-card-soft bg-[#fff8ed] p-5">
            <Megaphone
              aria-hidden="true"
              className="h-5 w-5 text-[#7c3cff]"
            />
            <h3 className="mt-3 text-lg font-black uppercase">
              Honest status
            </h3>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-[#3c214b]">
              <li>Live MVP. Signup is open for the public platform.</li>
              <li>Demo / fake / test tasks stay Early Contributors only.</li>
              <li>Rewards can be paid in USDC on Stellar through manual payment or Stellar escrow.</li>
              <li>No file uploads, no analytics tables. Free-tier-friendly by design.</li>
            </ul>
          </article>
        </div>

        {/* ROADMAP */}
        <div className="mt-10 rounded-[1rem] border-2 border-[#140625] bg-[#7c3cff] p-6 text-white shadow-[8px_8px_0_#140625] sm:p-10">
          <p className="comic-chip bg-[#ffdd3d] text-[#140625]">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            What&apos;s live
          </p>
          <h2 className="mt-4 text-2xl font-black uppercase leading-none drop-shadow-[3px_3px_0_#17072b] sm:text-4xl">
            USDC escrow on Stellar is live. Grow the contributor network.
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/85 sm:text-base">
            Stellar escrow and manual payment are available now. The next work is
            growing users, services, safety, and multilingual
            coverage on top of the existing marketplace.
          </p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <RoadmapStep n="1" title="USDC escrow on Stellar" body="Stellar network escrow is deployed and wired for fund and release flows." />
            <RoadmapStep n="2" title="Public soft open" body="Let signed-in creators and operators create, apply, submit, chat, and build initial task liquidity." />
            <RoadmapStep n="3" title="Services + deals" body="Long-running creator services and negotiated deals on top of the marketplace." />
            <RoadmapStep n="4" title="Reporting + safety" body="Report task / profile / submission. Admin review queue and audit trail." />
            <RoadmapStep n="5" title="Multilingual EN/ID/ZH" body="Profile language already supports en/id/zh. Wire UI strings." />
          </ol>
        </div>

        {/* FOOTER STATS */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Stat
            title="Status"
            body="Phase 3 MVP: tasks, applications, submissions, chat, manual payment copy, and Stellar escrow flows are live."
            chip="Live platform"
            chipColor="bg-[#ff4fb8] text-white"
            icon={<Hourglass className="h-4 w-4" />}
          />
          <Stat
            title="Direction"
            body="USDC on Stellar. No custom token. Rewards and escrow flows are designed around a simple, stable payment path."
            chip="USDC · Stellar"
            chipColor="bg-[#38e7ff]"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
        </div>
      </section>
    </main>
  );
}

function RoadmapStep({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-lg border-2 border-[#140625] bg-[#fff7e8] p-4 text-[#140625] shadow-[4px_4px_0_#140625]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] text-sm font-black shadow-[2px_2px_0_#140625]">
        {n}
      </span>
      <h4 className="mt-3 text-sm font-black uppercase">{title}</h4>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#5a3b66]">
        {body}
      </p>
    </li>
  );
}

function Stat({
  title,
  body,
  chip,
  chipColor,
  icon,
}: {
  title: string;
  body: string;
  chip: string;
  chipColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="comic-card-soft bg-white p-5">
      <span className={`comic-chip ${chipColor}`}>
        {icon}
        {chip}
      </span>
      <h3 className="mt-4 text-lg font-black uppercase">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
        {body}
      </p>
    </div>
  );
}
