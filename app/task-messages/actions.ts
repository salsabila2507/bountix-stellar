"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

type MessageScopeInput = {
  taskId: string;
  applicationId?: string | null;
  submissionId?: string | null;
};

type MessageScope = {
  taskId: string;
  applicationId: string | null;
  submissionId: string | null;
  receiverId: string | null;
};

type ApplicationScopeRow = {
  id: string;
  task_id: string;
  applicant_id: string;
};

type SubmissionScopeRow = {
  id: string;
  task_id: string;
  application_id: string;
  submitter_id: string;
};

async function loadMessageScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isAdmin: boolean,
  input: MessageScopeInput,
): Promise<MessageScope | null> {
  const taskId = input.taskId;
  const applicationId = input.applicationId ?? null;
  const submissionId = input.submissionId ?? null;

  if (!isUuid(taskId)) return null;
  if (applicationId && !isUuid(applicationId)) return null;
  if (submissionId && !isUuid(submissionId)) return null;

  const { data: taskCreatorId } = await supabase.rpc("task_creator_id", {
    task_uuid: taskId,
  });

  if (!taskCreatorId || typeof taskCreatorId !== "string") return null;

  let application: ApplicationScopeRow | null = null;
  if (applicationId) {
    const { data } = await supabase
      .from("task_applications")
      .select("id, task_id, applicant_id")
      .eq("id", applicationId)
      .maybeSingle();

    application = data as ApplicationScopeRow | null;
    if (!application || application.task_id !== taskId) return null;
  }

  let submission: SubmissionScopeRow | null = null;
  if (submissionId) {
    const { data } = await supabase
      .from("task_submissions")
      .select("id, task_id, application_id, submitter_id")
      .eq("id", submissionId)
      .maybeSingle();

    submission = data as SubmissionScopeRow | null;
    if (!submission || submission.task_id !== taskId) return null;
    if (applicationId && submission.application_id !== applicationId) {
      return null;
    }
  }

  const isOwner = taskCreatorId === userId;
  const isApplicant = application?.applicant_id === userId;
  const isSubmitter = submission?.submitter_id === userId;
  const canAccess = isAdmin || isOwner || isApplicant || isSubmitter;

  if (!canAccess) return null;

  const receiverId =
    isOwner || isAdmin
      ? application?.applicant_id ?? submission?.submitter_id ?? null
      : taskCreatorId;

  return {
    taskId,
    applicationId,
    submissionId,
    receiverId,
  };
}

async function loadActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    isAdmin: profile?.role === "admin",
  };
}

function revalidateMessagePaths(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/dashboard/tasks/${taskId}/applicants`);
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard/submissions");
}

export async function sendTaskMessageAction(
  input: MessageScopeInput,
  formData: FormData,
) {
  const { supabase, user, isAdmin } = await loadActor();
  if (!user) redirect("/login");

  const scope = await loadMessageScope(supabase, user.id, isAdmin, input);
  if (!scope) return;

  const messageText = String(formData.get("message_text") ?? "").trim();
  if (messageText.length < 1 || messageText.length > 2000) return;

  const { error } = await supabase.from("task_messages").insert({
    task_id: scope.taskId,
    application_id: scope.applicationId,
    submission_id: scope.submissionId,
    sender_id: user.id,
    receiver_id: scope.receiverId,
    message_text: messageText,
  });

  if (error) return;

  revalidateMessagePaths(scope.taskId);
}

export async function markTaskMessagesReadAction(input: MessageScopeInput) {
  const { supabase, user, isAdmin } = await loadActor();
  if (!user) redirect("/login");

  const scope = await loadMessageScope(supabase, user.id, isAdmin, input);
  if (!scope) return;

  let query = supabase
    .from("task_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("task_id", scope.taskId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (scope.applicationId) {
    query = query.eq("application_id", scope.applicationId);
  }
  if (scope.submissionId) {
    query = query.eq("submission_id", scope.submissionId);
  }

  const { error } = await query;
  if (error) return;

  revalidateMessagePaths(scope.taskId);
}
