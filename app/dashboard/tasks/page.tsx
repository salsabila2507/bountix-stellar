import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { DbTaskCard } from "@/components/marketplace/db-task-card";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import { TASK_LIST_COLUMNS, type DbTask } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Tasks",
  description: "Tasks you've posted on Bountix.",
};

async function loadMyTasks(): Promise<{
  userId: string | null;
  tasks: DbTask[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, tasks: [] };

    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_LIST_COLUMNS)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return { userId: user.id, tasks: [] };
    return { userId: user.id, tasks: data as DbTask[] };
  } catch {
    return { userId: null, tasks: [] };
  }
}

export default async function DashboardTasksPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { userId, tasks } = await loadMyTasks();
  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t("common.backToDashboard")}
          </Link>
          <Link
            href="/post-task"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t("form.postTask.post")}
          </Link>
        </div>

        <div className="mt-6">
          <p className="comic-chip bg-[#ffdd3d]">{t("dashboard.tasks.chip")}</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            {t("dashboard.tasks.title")}
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
            {t("dashboard.tasks.body")}
          </p>
        </div>

        {tasks.length > 0 ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {tasks.map((t) => (
              <DbTaskCard key={t.id} task={t} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="comic-card mt-8 bg-white p-6 text-center sm:p-8">
            <h2 className="text-xl font-black text-[#140625]">
              {t("dashboard.tasks.emptyTitle")}
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
              {t("dashboard.tasks.emptyBody")}
            </p>
            <Link
              href="/post-task"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t("dashboard.tasks.postFirst")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
