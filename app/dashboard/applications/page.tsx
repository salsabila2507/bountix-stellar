import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TaskChatBox } from "@/components/marketplace/task-chat-box";
import {
  createTranslator,
  formatDate,
  type TranslationKey,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import {
  APPLICATION_COLUMNS,
  APPLICATION_STATUS_COLOR,
  SUBMISSION_COLUMNS,
  SUBMISSION_STATUS_COLOR,
  type DbApplication,
  type DbSubmission,
} from "@/lib/applications";
import {
  TASK_MESSAGE_COLUMNS,
  type DbTaskMessage,
} from "@/lib/task-messages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Applications",
  description: "Tasks you've applied to and submitted work for.",
};

type TaskLite = { id: string; title: string; creator_id: string };
type ProfileLite = {
  id: string;
  username: string;
  display_name: string | null;
};

async function loadMine() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: apps } = await supabase
    .from("task_applications")
    .select(APPLICATION_COLUMNS)
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });

  const myApps = (apps ?? []) as DbApplication[];
  const taskIds = Array.from(new Set(myApps.map((a) => a.task_id)));

  const tasksById = new Map<string, TaskLite>();
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, creator_id")
      .in("id", taskIds);
    for (const t of tasks ?? []) tasksById.set(t.id, t as TaskLite);
  }

  let mySubs: DbSubmission[] = [];
  if (myApps.length > 0) {
    const { data: subs } = await supabase
      .from("task_submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false });
    mySubs = (subs ?? []) as DbSubmission[];
  }
  const subsByApp = new Map<string, DbSubmission[]>();
  for (const s of mySubs) {
    const arr = subsByApp.get(s.application_id) ?? [];
    arr.push(s);
    subsByApp.set(s.application_id, arr);
  }

  let taskMessages: DbTaskMessage[] = [];
  if (taskIds.length > 0) {
    const { data: messages } = await supabase
      .from("task_messages")
      .select(TASK_MESSAGE_COLUMNS)
      .in("task_id", taskIds)
      .order("created_at", { ascending: true });
    taskMessages = (messages ?? []) as DbTaskMessage[];
  }

  const messagesByApp = new Map<string, DbTaskMessage[]>();
  for (const message of taskMessages) {
    if (!message.application_id) continue;
    const arr = messagesByApp.get(message.application_id) ?? [];
    arr.push(message);
    messagesByApp.set(message.application_id, arr);
  }

  const profileIds = new Set<string>([user.id]);
  for (const task of tasksById.values()) profileIds.add(task.creator_id);
  for (const message of taskMessages) {
    profileIds.add(message.sender_id);
    if (message.receiver_id) profileIds.add(message.receiver_id);
  }

  const profilesByUser = new Map<string, ProfileLite>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", Array.from(profileIds));
    for (const p of profiles ?? []) profilesByUser.set(p.id, p as ProfileLite);
  }

  return {
    myApps,
    tasksById,
    subsByApp,
    messagesByApp,
    profilesByUser,
    currentUserId: user.id,
  };
}

export default async function MyApplicationsPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const data = await loadMine();
  if (!data) redirect("/login");

  const {
    myApps,
    tasksById,
    subsByApp,
    messagesByApp,
    profilesByUser,
    currentUserId,
  } = data;

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("common.backToDashboard")}
        </Link>

        <div className="mt-6">
          <p className="comic-chip bg-[#38e7ff]">
            {t("dashboard.applications.chip")}
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            {t("dashboard.applications.title")}
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
            {t("dashboard.applications.body")}
          </p>
        </div>

        {myApps.length === 0 ? (
          <div className="comic-card mt-8 bg-white p-6 text-center sm:p-8">
            <h2 className="text-xl font-black text-[#140625]">
              {t("dashboard.applications.emptyTitle")}
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
              {t("dashboard.applications.emptyBody")}
            </p>
            <Link
              href="/tasks"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
            >
              {t("common.browseTasks")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {myApps.map((a) => {
              const task = tasksById.get(a.task_id);
              const subs = subsByApp.get(a.id) ?? [];
              const chatMessages = messagesByApp.get(a.id) ?? [];
              const latestSubmissionId = subs[0]?.id ?? null;
              return (
                <article
                  key={a.id}
                  className="comic-card bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/tasks/${a.task_id}`}
                        className="text-sm font-black uppercase text-[#7c3cff]"
                      >
                        {t("dashboard.applications.viewTask")}
                      </Link>
                      <h2 className="mt-1 text-lg font-black text-[#140625]">
                        {task?.title ?? t("common.tasks")}
                      </h2>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md border-2 border-[#140625] px-2 py-1 text-[0.7rem] font-black uppercase shadow-[2px_2px_0_#140625] ${APPLICATION_STATUS_COLOR[a.status]}`}
                    >
                      {t(`market.status.${a.status}` as TranslationKey)}
                    </span>
                  </div>

                  {a.message ? (
                    <p className="mt-3 whitespace-pre-line rounded-lg border-2 border-dashed border-[#140625] bg-[#fffaf4] p-3 text-sm font-semibold leading-6 text-[#3c214b]">
                      {a.message}
                    </p>
                  ) : null}

                  {subs.length > 0 ? (
                    <div className="mt-4 grid gap-3">
                      {subs.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 shadow-[3px_3px_0_#140625]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md border-2 border-[#140625] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625] ${SUBMISSION_STATUS_COLOR[s.status]}`}
                            >
                              {t(`market.status.${s.status}` as TranslationKey)}
                            </span>
                            <span className="text-xs font-bold text-[#5a3b66]">
                              {formatDate(s.created_at, locale)}
                            </span>
                            {s.raffle_winner_position !== null ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-[#140625] bg-[#ffdd3d] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625]">
                                <Trophy
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                {t("raffle.winnerNumber", {
                                  position: s.raffle_winner_position,
                                })}
                              </span>
                            ) : s.raffle_eligible ? (
                              <span className="inline-flex items-center rounded-md border-2 border-[#140625] bg-[#dff7e6] px-2 py-1 text-[0.65rem] font-black uppercase text-[#1f6b3a] shadow-[2px_2px_0_#140625]">
                                {t("raffle.eligible")}
                              </span>
                            ) : null}
                          </div>
                          <a
                            href={s.delivery_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-2 break-all text-sm font-black text-[#7c3cff] underline decoration-2 underline-offset-2"
                          >
                            <ExternalLink
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            {s.delivery_url}
                          </a>
                          {s.review_notes ? (
                            <p className="mt-2 rounded-lg border-2 border-dashed border-[#140625] bg-[#f2e6ff] p-2 text-xs font-bold text-[#3c214b]">
                              {s.review_notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <TaskChatBox
                    taskId={a.task_id}
                    applicationId={a.id}
                    submissionId={latestSubmissionId}
                    currentUserId={currentUserId}
                    messages={chatMessages}
                    senderProfilesById={profilesByUser}
                    locale={locale}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
