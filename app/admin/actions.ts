"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

function isInternalPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/\s/.test(value) &&
    value.length <= 500
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin") redirect("/dashboard/profile");

  return { supabase, user };
}

export async function createGlobalNotificationAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();

  if (title.length < 1 || title.length > 140) return;
  if (body.length > 1000) return;
  if (linkUrl && !isInternalPath(linkUrl)) return;

  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("notifications").insert({
    user_id: null,
    type: "global",
    title,
    body,
    link_url: linkUrl || null,
  });

  if (error) return;

  revalidatePath("/admin");
  revalidatePath("/notifications");
}

export async function deleteTaskAsAdminAction(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isUuid(taskId)) return;
  if (reason.length < 4 || reason.length > 1000) return;

  await requireAdmin();
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("id, creator_id, title")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return;

  await admin.from("notifications").insert({
    user_id: task.creator_id,
    type: "task_moderation",
    title: "Task removed by admin",
    body: `Your task "${task.title}" was removed by Bountix admin. Reason: ${reason}`,
    link_url: "/dashboard/tasks",
  });

  const { error } = await admin.from("tasks").delete().eq("id", taskId);
  if (error) return;

  revalidatePath("/admin");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/notifications");
}
