import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TaskForm } from "@/components/marketplace/task-form";
import { deleteTaskAction } from "@/app/tasks/actions";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { getServerUser } from "@/lib/server-user";
import { TASK_LIST_COLUMNS, isUuid, type DbTask } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export const metadata = {
  title: "Edit task",
  description: "Edit your Bountix task.",
};

async function loadEditableTask(taskId: string) {
  if (!isUuid(taskId)) return null;

  const serverUser = await getServerUser();
  if (!serverUser) return null;
  const { supabase, userId } = serverUser;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: task } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return null;

  const isAdmin = profile.role === "admin";
  const isOwner = task.creator_id === userId;
  if (!isAdmin && !isOwner) return null;

  return { task: task as DbTask, isAdmin };
}

export default async function EditTaskPage({ params }: RouteParams) {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { id } = await params;
  const serverUser = await getServerUser();
  if (!serverUser) {
    redirect("/login");
  }

  const result = await loadEditableTask(id);
  if (!result) {
    notFound();
  }

  // Bind the delete action to this task id.
  const handleDelete = deleteTaskAction.bind(null, result.task.id);

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href={`/tasks/${result.task.id}`}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("common.backToTask")}
        </Link>

        <section className="mx-auto mt-8 max-w-2xl">
          <TaskForm
            mode="edit"
            isAdmin={result.isAdmin}
            initialTask={result.task}
            locale={locale}
          />

          <form action={handleDelete} className="mt-6">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-4 text-sm font-black uppercase text-[#c42463] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffe1ed]"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {t("common.deleteTask")}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
