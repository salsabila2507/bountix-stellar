import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Gift,
  Megaphone,
  ShieldAlert,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  createGlobalNotificationAction,
  deleteTaskAsAdminAction,
} from "@/app/admin/actions";
import { SiteHeader } from "@/components/site-header";
import { DbTaskCard } from "@/components/marketplace/db-task-card";
import { DisputeCard, type Dispute } from "@/components/admin/dispute-card";
import { EscrowReleaseAdminPanel, type ReleaseRequest } from "@/components/admin/escrow-release-admin-panel";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/utils/supabase/server";
import {
  TASK_LIST_COLUMNS,
  TASK_STATUS_LABEL,
  TASK_TYPE_LABEL,
  type DbTask,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  description:
    "Bountix admin area. Manage official tasks, giveaways, campaigns, announcements, and updates.",
};

type AdminProfile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  can_use_platform: boolean;
  created_at: string;
};

type AdminReferralProfile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  referral_code: string;
  created_at: string;
};

type AdminReferralGroup = {
  referrer: AdminReferralProfile;
  referralCode: string;
  invitedUsers: (AdminReferralProfile & { referred_at: string })[];
};

type AdminTaskOwner = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type AdminModerationTask = DbTask & {
  creator: AdminTaskOwner | null;
};

async function loadAdmin() {
  const serverUser = await getServerUser();
  if (!serverUser) return { authorized: false as const };
  const { supabase, userId } = serverUser;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") return { authorized: false as const };

  const admin = createAdminClient();

  const { data: openDisputes } = await admin
    .from("disputes")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  // Escrow release queue: approved, unreleased submissions on escrow tasks.
  // Keep this as separate queries; embedded joins can fail silently when FK names drift.
  const { data: approvedSubs } = await admin
    .from("task_submissions")
    .select("id, task_id, submitter_id, status, released_at, raffle_winner_position, created_at")
    .eq("status", "approved")
    .is("released_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  type ReleaseSubRow = {
    id: string;
    task_id: string;
    submitter_id: string;
    raffle_winner_position: number | null;
    created_at: string;
  };
  type ReleaseTaskRow = {
    id: string;
    title: string | null;
    reward_amount: number | null;
    payment_method: string | null;
    reward_mode: string | null;
    raffle_winner_count: number | null;
    escrow_tx_hash: string | null;
  };
  type ReleaseProfileRow = {
    id: string;
    display_name: string | null;
    username: string | null;
    wallet_address: string | null;
  };

  const releaseSubRows = ((approvedSubs ?? []) as ReleaseSubRow[]).filter(Boolean);
  const releaseTaskIds = Array.from(new Set(releaseSubRows.map((s) => s.task_id)));
  const releaseSubmitterIds = Array.from(new Set(releaseSubRows.map((s) => s.submitter_id)));

  const { data: releaseTasks } = releaseTaskIds.length
    ? await admin
        .from("tasks")
        .select("id, title, reward_amount, payment_method, reward_mode, raffle_winner_count, escrow_tx_hash")
        .in("id", releaseTaskIds)
    : { data: [] };

  const { data: releaseProfiles } = releaseSubmitterIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, username, wallet_address")
        .in("id", releaseSubmitterIds)
    : { data: [] };

  const releaseTasksById = new Map(
    ((releaseTasks ?? []) as ReleaseTaskRow[]).map((task) => [task.id, task]),
  );
  const releaseProfilesById = new Map(
    ((releaseProfiles ?? []) as ReleaseProfileRow[]).map((profile) => [profile.id, profile]),
  );

  const releaseRequests: ReleaseRequest[] = releaseSubRows
    .map((submission) => {
      const task = releaseTasksById.get(submission.task_id);
      const worker = releaseProfilesById.get(submission.submitter_id);
      if (!task || task.payment_method !== "escrow_stellar" || !task.escrow_tx_hash) {
        return null;
      }
      if (
        task.reward_mode === "raffle" &&
        (task.raffle_winner_count ?? 1) > 1
      ) {
        return null;
      }
      if (task.reward_mode === "raffle" && submission.raffle_winner_position === null) {
        return null;
      }

      return {
        submissionId: submission.id,
        taskId: submission.task_id,
        taskTitle: task.title ?? "Untitled",
        rewardAmount: task.reward_amount ?? 0,
        workerName: worker?.display_name ?? worker?.username ?? "Unknown",
        workerWalletAddress: worker?.wallet_address ?? null,
        createdAt: submission.created_at,
      } satisfies ReleaseRequest;
    })
    .filter((request): request is ReleaseRequest => request !== null)
    .slice(0, 50);

  const { data: tasks } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .neq("task_type", "user_task")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: moderationTaskRows } = await admin
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  const moderationRows = (moderationTaskRows ?? []) as DbTask[];
  const moderationCreatorIds = Array.from(
    new Set(moderationRows.map((task) => task.creator_id)),
  );
  const { data: moderationProfiles } = moderationCreatorIds.length
    ? await admin
        .from("profiles")
        .select("id, username, display_name")
        .in("id", moderationCreatorIds)
    : { data: [] };
  const moderationProfilesById = new Map(
    ((moderationProfiles ?? []) as AdminTaskOwner[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const moderationTasks: AdminModerationTask[] = moderationRows.map((task) => ({
    ...task,
    creator: moderationProfilesById.get(task.creator_id) ?? null,
  }));

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, role, can_use_platform, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: referralRows, count: referralCount } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_id, referral_code, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(500);

  const referrals = (referralRows ?? []) as {
    id: string;
    referrer_id: string;
    referred_id: string;
    referral_code: string;
    created_at: string;
  }[];
  const referralProfileIds = Array.from(
    new Set(referrals.flatMap((row) => [row.referrer_id, row.referred_id])),
  );
  const { data: referralProfiles } = referralProfileIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id, username, display_name, role, referral_code, created_at",
        )
        .in("id", referralProfileIds)
    : { data: [] };
  const referralProfilesById = new Map(
    ((referralProfiles ?? []) as AdminReferralProfile[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const referralGroupsByReferrer = new Map<string, AdminReferralGroup>();

  for (const row of referrals) {
    const referrer = referralProfilesById.get(row.referrer_id);
    const referred = referralProfilesById.get(row.referred_id);
    if (!referrer || !referred) continue;

    const group =
      referralGroupsByReferrer.get(row.referrer_id) ??
      ({
        referrer,
        referralCode: row.referral_code,
        invitedUsers: [],
      } satisfies AdminReferralGroup);
    group.invitedUsers.push({
      ...referred,
      referred_at: row.created_at,
    });
    referralGroupsByReferrer.set(row.referrer_id, group);
  }

  const referralGroups = Array.from(referralGroupsByReferrer.values()).sort(
    (a, b) => {
      if (b.invitedUsers.length !== a.invitedUsers.length) {
        return b.invitedUsers.length - a.invitedUsers.length;
      }
      return a.referrer.username.localeCompare(b.referrer.username);
    },
  );

  // Stats
  const { count: pendingApps } = await supabase
    .from("task_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: pendingSubs } = await supabase
    .from("task_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  const { count: totalTasks } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true });

  return {
    authorized: true as const,
    officialTasks: (tasks ?? []) as DbTask[],
    moderationTasks,
    profiles: (profiles ?? []) as AdminProfile[],
    openDisputes: (openDisputes ?? []) as unknown as Dispute[],
    releaseRequests,
    stats: {
      pendingApps: pendingApps ?? 0,
      pendingSubs: pendingSubs ?? 0,
      totalTasks: totalTasks ?? 0,
      referralInvites: referralCount ?? referrals.length,
      openDisputes: (openDisputes ?? []).length,
      releaseRequests: releaseRequests.length,
    },
    referralGroups,
  };
}

export default async function AdminHomePage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const result = await loadAdmin();
  if (!result.authorized) redirect("/dashboard/profile");

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="comic-chip bg-[#7c3cff] text-white">
              <Megaphone aria-hidden="true" className="h-3.5 w-3.5" />
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
              Bountix admin
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
              Publish official tasks, giveaways, campaigns, announcements, and
              updates. Review applicant + submission queues across the
              platform.
            </p>
          </div>
          <Link
            href="/post-task"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
          >
            New official content
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border-2 border-[#140625] bg-[#ffdd3d] p-5 shadow-[5px_5px_0_#140625]">
              <p className="text-xs font-black uppercase text-[#5a3b66]">
                Pending applicants
              </p>
              <p className="mt-2 text-3xl font-black text-[#140625]">
                {result.stats.pendingApps}
              </p>
            </div>
            <div className="rounded-lg border-2 border-[#140625] bg-[#38e7ff] p-5 shadow-[5px_5px_0_#140625]">
              <p className="text-xs font-black uppercase text-[#5a3b66]">
                Pending review
              </p>
              <p className="mt-2 text-3xl font-black text-[#140625]">
                {result.stats.pendingSubs}
              </p>
            </div>
            <div className="rounded-lg border-2 border-[#140625] bg-white p-5 shadow-[5px_5px_0_#140625]">
              <p className="text-xs font-black uppercase text-[#5a3b66]">
                Tasks total
              </p>
              <p className="mt-2 text-3xl font-black text-[#140625]">
                {result.stats.totalTasks}
              </p>
            </div>
            <div className="rounded-lg border-2 border-[#140625] bg-[#f1d8ff] p-5 shadow-[5px_5px_0_#140625]">
              <p className="text-xs font-black uppercase text-[#5a3b66]">
                Disputes
              </p>
              <p className="mt-2 text-3xl font-black text-[#140625]">
                {result.stats.openDisputes}
              </p>
            </div>
            <div className="rounded-lg border-2 border-[#140625] bg-[#dff7e6] p-5 shadow-[5px_5px_0_#140625]">
              <p className="text-xs font-black uppercase text-[#5a3b66]">
                Pending Releases
              </p>
              <p className="mt-2 text-3xl font-black text-[#140625]">
                {result.stats.releaseRequests}
              </p>
            </div>
          </div>

          {result.openDisputes.length > 0 ? (
            <div className="mt-10">
              <h2 className="flex items-center gap-2 text-2xl font-black uppercase leading-none">
                Open Disputes
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
                Workers disputed the rejection of their submissions. Review and resolve.
              </p>
              <div className="comic-card mt-6 grid gap-4 bg-white p-5 sm:p-6">
                {result.openDisputes.map((d) => (
                  <DisputeCard key={d.id} dispute={d} />
                ))}
              </div>
            </div>
          ) : null}

        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-black uppercase leading-none">
            <Wallet aria-hidden="true" className="h-5 w-5" />
            Escrow Releases
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
            Approved submissions waiting for escrow release. Review and release payment to workers.
          </p>
          <div className="mt-6">
            <EscrowReleaseAdminPanel requests={result.releaseRequests} />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-black uppercase leading-none">
            <ShieldAlert aria-hidden="true" className="h-5 w-5" />
            Task moderation
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
            Remove prohibited tasks from any user account. A reason is required and sent to the task creator.
          </p>
        </div>

        <div className="comic-card mt-6 overflow-hidden bg-white p-0">
          {result.moderationTasks.length === 0 ? (
            <div className="p-5 text-sm font-bold text-[#5a3b66]">
              No tasks found.
            </div>
          ) : (
            <div className="grid divide-y-2 divide-[#140625]">
              {result.moderationTasks.map((task) => {
                const creatorName = task.creator?.display_name ?? task.creator?.username ?? "Unknown creator";

                return (
                  <div
                    key={task.id}
                    className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border-2 border-[#140625] bg-[#38e7ff] px-2 py-1 text-[0.65rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
                          {TASK_TYPE_LABEL[task.task_type]}
                        </span>
                        <span className="rounded-md border-2 border-[#140625] bg-[#ffdd3d] px-2 py-1 text-[0.65rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
                          {TASK_STATUS_LABEL[task.status]}
                        </span>
                        {task.escrow_tx_hash ? (
                          <span className="rounded-md border-2 border-[#140625] bg-[#ffe1ed] px-2 py-1 text-[0.65rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
                            Escrow funded
                          </span>
                        ) : null}
                      </div>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="mt-3 block text-lg font-black text-[#140625] underline decoration-2 underline-offset-2 hover:text-[#7c3cff]"
                      >
                        {task.title}
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#5a3b66]">
                        {task.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase text-[#5a3b66]">
                        <span>By {creatorName}</span>
                        <span>Created {new Date(task.created_at).toLocaleDateString("en-US")}</span>
                        {task.reward_amount !== null ? (
                          <span>{task.reward_amount} {task.reward_currency}</span>
                        ) : null}
                      </div>
                    </div>

                    <form action={deleteTaskAsAdminAction} className="grid gap-2">
                      <input type="hidden" name="task_id" value={task.id} />
                      <label className="grid gap-2 text-xs font-black uppercase text-[#5a3b66]">
                        Removal reason
                        <textarea
                          name="reason"
                          required
                          minLength={4}
                          maxLength={1000}
                          rows={3}
                          placeholder="Example: Prohibited content / spam / scam / unsafe task."
                          className="min-h-24 resize-y rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold normal-case text-[#140625] outline-none focus:bg-white"
                        />
                      </label>
                      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]">
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        Remove task
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-black uppercase leading-none">
            <Gift aria-hidden="true" className="h-5 w-5" />
            {t("admin.referrals.title")}
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
            {t("admin.referrals.body")}
          </p>
        </div>

        <div className="comic-card mt-6 overflow-hidden bg-white p-0">
          <div className="grid gap-0 divide-y-2 divide-[#140625]">
            <div className="grid gap-3 bg-[#f1d8ff] p-4 text-xs font-black uppercase text-[#140625] sm:grid-cols-[1fr_110px_1fr]">
              <span>{t("admin.referrals.referrer")}</span>
              <span>{t("admin.referrals.count")}</span>
            </div>
            {result.referralGroups.length === 0 ? (
              <div className="p-5 text-sm font-bold text-[#5a3b66]">
                {t("admin.referrals.empty")}
              </div>
            ) : (
              result.referralGroups.map((group) => (
                <div
                  key={group.referrer.id}
                  className="grid gap-3 p-4 text-sm font-bold text-[#3c214b] sm:grid-cols-[1fr_110px] sm:items-start"
                >
                  <div>
                    <Link
                      href={`/profile/${group.referrer.username}`}
                      className="font-black text-[#7c3cff] underline decoration-2 underline-offset-2"
                    >
                      @{group.referrer.username}
                    </Link>
                    <p className="mt-1 text-xs text-[#5a3b66]">
                      {group.referrer.display_name ?? "No display name"} ·{" "}
                      {group.referrer.role}
                    </p>
                    <p className="mt-2 break-all rounded-md border-2 border-[#140625] bg-[#fffaf4] px-2 py-1 text-xs font-black text-[#140625] shadow-[2px_2px_0_#140625]">
                      {group.referralCode}
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-md border-2 border-[#140625] bg-[#ffdd3d] px-2 py-1 text-[0.65rem] font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625]">
                    <Users aria-hidden="true" className="h-3.5 w-3.5" />
                    {group.invitedUsers.length}
                  </span>

                  <div className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 sm:col-span-2">
                    <p className="text-xs font-black uppercase text-[#5a3b66]">
                      {t("admin.referrals.referredUsers")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.invitedUsers.map((referred) => (
                        <Link
                          key={referred.id}
                          href={`/profile/${referred.username}`}
                          className="rounded-md border-2 border-[#140625] bg-white px-2 py-1 text-xs font-black text-[#7c3cff] shadow-[2px_2px_0_#140625] underline decoration-2 underline-offset-2"
                        >
                          @{referred.username}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-black uppercase leading-none">
            <Bell aria-hidden="true" className="h-5 w-5" />
            {t("admin.notifications.title")}
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
            {t("admin.notifications.body")}
          </p>
        </div>

        <form
          action={createGlobalNotificationAction}
          className="comic-card mt-6 grid gap-4 bg-white p-5 sm:p-6"
        >
          <label className="grid gap-2 text-sm font-black text-[#140625]">
            {t("admin.notifications.titleLabel")}
            <input
              name="title"
              maxLength={140}
              required
              className="min-h-11 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#140625]">
            {t("admin.notifications.bodyLabel")}
            <textarea
              name="body"
              maxLength={1000}
              rows={3}
              className="min-h-28 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#140625]">
            {t("admin.notifications.linkLabel")}
            <input
              name="link_url"
              placeholder={t("admin.notifications.linkPlaceholder")}
              maxLength={500}
              className="min-h-11 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white"
            />
          </label>
          <button className="inline-flex min-h-11 w-fit items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]">
            {t("admin.notifications.create")}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="text-2xl font-black uppercase leading-none">
            Official content
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
            Posts marked official_task / giveaway / campaign / announcement /
            update.
          </p>
        </div>

        {result.officialTasks.length === 0 ? (
          <div className="comic-card mt-6 bg-white p-6 text-center sm:p-8">
            <h3 className="text-lg font-black text-[#140625]">
              No official content yet
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-[#5a3b66]">
              Use{" "}
              <Link
                href="/post-task"
                className="font-black text-[#7c3cff] underline decoration-2 underline-offset-2"
              >
                Post a task
              </Link>{" "}
              and pick an admin task type to publish official content.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {result.officialTasks.map((t) => (
              <DbTaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
