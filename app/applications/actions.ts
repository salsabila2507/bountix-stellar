"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ESCROW_CONTRACT_ADDRESS } from "@/lib/escrow";
import { isUuid } from "@/lib/tasks";
import type {
  ApplyState,
  SubmitState,
} from "@/lib/application-form-state";

async function loadActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    user,
    profile: profile as { id: string; role: string } | null,
  };
}

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

// =====================================================================
// Applications
// =====================================================================

export async function applyToTaskAction(
  taskId: string,
  _previous: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  if (!isUuid(taskId)) return { status: "error", message: "Invalid task id." };

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");
  if (!profile) {
    return { status: "error", message: "Your profile is missing." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, access_level")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return { status: "error", message: "Task not found." };
  }

  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 1000) {
    return { status: "error", message: "Message must be 1000 chars or fewer." };
  }

  const { error } = await supabase.from("task_applications").insert({
    task_id: taskId,
    applicant_id: user.id,
    proposal: message || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "You already applied to this task.",
      };
    }
    return {
      status: "error",
      message: error.message || "Could not submit application.",
    };
  }

  // Notify the task creator that someone applied.
  await notifyTaskCreatorAction(taskId, user.id);

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/dashboard/applications`);
  return { status: "success", message: "Application submitted." };
}

/**
 * Insert a notification row for the task creator when a new application
 * is submitted. Best-effort — application insert already succeeded.
 */
async function notifyTaskCreatorAction(taskId: string, applicantId: string) {
  try {
    const { supabase, user } = await loadActor();
    if (!user) return;
    const { data: task } = await supabase
      .from("tasks")
      .select("creator_id, title")
      .eq("id", taskId)
      .maybeSingle();
    const row = task as { creator_id: string; title: string } | null;
    if (!row || row.creator_id === applicantId) return;
    const { data: applicant } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", applicantId)
      .maybeSingle();
    const profile = applicant as
      | { username: string | null; full_name: string | null }
      | null;
    const who =
      profile?.username || profile?.full_name || "Someone";
    await supabase.from("notifications").insert({
      user_id: row.creator_id,
      title: "New application",
      body: `${who} applied to "${row.title}"`,
      type: "personal",
      link_url: `/tasks/${taskId}#applications`,
    });
  } catch {}
}

export async function withdrawApplicationAction(applicationId: string) {
  if (!isUuid(applicationId)) return;
  const { supabase, user } = await loadActor();
  if (!user) redirect("/login");

  const { data: app } = await supabase
    .from("task_applications")
    .select("task_id, applicant_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app) return;
  if (app.applicant_id !== user.id) return;

  await supabase
    .from("task_applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);

  if (app?.task_id) revalidatePath(`/tasks/${app.task_id}`);
  revalidatePath(`/dashboard/applications`);
}

export async function decideApplicationAction(
  applicationId: string,
  decision: "accepted" | "rejected",
) {
  console.log("[decideApplicationAction]", { applicationId, decision });
  if (decision !== "accepted" && decision !== "rejected") {
    throw new Error("Invalid decision");
  }
  if (!isUuid(applicationId)) {
    throw new Error("Invalid application id");
  }
  const { supabase, user, profile } = await loadActor();
  console.log("[decideApplicationAction] actor", {
    userId: user?.id,
    profileRole: profile?.role,
  });
  if (!user) redirect("/login");

  const { data: app } = await supabase
    .from("task_applications")
    .select("task_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app) throw new Error("Application not found");
  console.log("[decideApplicationAction] app", app);

  const { data: task } = await supabase
    .from("tasks")
    .select("creator_id")
    .eq("id", app.task_id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  if (!task || (task.creator_id !== user.id && !isAdmin)) {
    console.log("[decideApplicationAction] not authorized", {
      taskCreator: task?.creator_id,
      currentUser: user.id,
      isAdmin,
    });
    throw new Error("Not authorized to decide on this application");
  }

  const { error } = await supabase
    .from("task_applications")
    .update({ status: decision })
    .eq("id", applicationId);

  if (error) {
    console.error("[decideApplicationAction] UPDATE error", error);
    throw new Error(error.message || "Failed to update application status");
  }

  console.log("[decideApplicationAction] SUCCESS", { applicationId, decision });

  // Notify the applicant and the task creator
  try {
    const { data: fullApp } = await supabase
      .from("task_applications")
      .select("applicant_id, task_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (fullApp) {
      const { data: task } = await supabase
        .from("tasks")
        .select("title, creator_id")
        .eq("id", fullApp.task_id)
        .maybeSingle();
      const title = (task as { title: string } | null)?.title ?? "task";
      const creatorId =
        (task as { creator_id: string } | null)?.creator_id ?? null;
      // Pick the right message
      const verb = decision === "accepted" ? "accepted" : "rejected";
      // Notify applicant
      await supabase.from("notifications").insert({
        user_id: fullApp.applicant_id,
        title: decision === "accepted" ? "Application accepted" : "Application rejected",
        body:
          decision === "accepted"
            ? `Your application for "${title}" was accepted. Submit your work anytime.`
            : `Your application for "${title}" was rejected. Don't worry — apply to other tasks.`,
        type: "personal",
        link_url:
          decision === "accepted"
            ? `/dashboard/applications#${applicationId}`
            : `/tasks/${fullApp.task_id}`,
      });
      // Extra: if accepted, also remind the creator to expect a submission
      if (decision === "accepted" && creatorId && creatorId !== fullApp.applicant_id) {
        await supabase.from("notifications").insert({
          user_id: creatorId,
          title: "Worker ready to deliver",
          body: `An applicant was accepted for "${title}". They can submit work from their dashboard.`,
          type: "personal",
          link_url: `/dashboard/tasks/${fullApp.task_id}/applicants`,
        });
      }
    }
  } catch (err) {
    console.error("[decideApplicationAction] notify error:", err);
  }

  if (app?.task_id) {
    revalidatePath(`/tasks/${app.task_id}`);
    revalidatePath(`/dashboard/tasks/${app.task_id}/applicants`);
  }
}

// =====================================================================
// Restore Withdrawn Application (admin/task-owner only)
// =====================================================================

export async function restoreApplicationAction(applicationId: string) {
  if (!isUuid(applicationId)) return;

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  const { data: app } = await supabase
    .from("task_applications")
    .select("task_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app) return;

  // Only restore withdrawn applications
  if (app.status !== "withdrawn") return;

  // Check permission: task owner or admin
  const { data: task } = await supabase
    .from("tasks")
    .select("creator_id")
    .eq("id", app.task_id)
    .maybeSingle();

  if (!task) return;

  const isAdmin = profile?.role === "admin";
  const isOwner = task.creator_id === user.id;
  if (!isAdmin && !isOwner) return;

  // Restore to "pending" so worker can submit work again
  await supabase
    .from("task_applications")
    .update({ status: "pending" })
    .eq("id", applicationId);

  revalidatePath(`/dashboard/tasks/${app.task_id}/applicants`);
  revalidatePath(`/tasks/${app.task_id}`);
}

// =====================================================================
// Submissions
// =====================================================================

export async function createSubmissionAction(
  applicationId: string,
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  if (!isUuid(applicationId))
    return { status: "error", message: "Invalid application." };

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");
  if (!profile) {
    return { status: "error", message: "Your profile is missing." };
  }

  const delivery_url = String(formData.get("delivery_url") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const fieldErrors: SubmitState["fieldErrors"] = {};

  if (!delivery_url) fieldErrors.delivery_url = "Delivery link is required.";
  else if (!isHttpsUrl(delivery_url))
    fieldErrors.delivery_url = "Use a valid HTTPS URL.";
  else if (delivery_url.length > 500)
    fieldErrors.delivery_url = "Link is too long (max 500).";
  if (notes.length > 2000)
    fieldErrors.notes = "Notes must be 2000 chars or fewer.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  const { data: app } = await supabase
    .from("task_applications")
    .select("task_id, applicant_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app?.task_id) {
    return { status: "error", message: "Application not found." };
  }
  if (app.applicant_id !== user.id) {
    return {
      status: "error",
      message: "You can only submit work for your own applications.",
    };
  }

  const { error } = await supabase.from("task_submissions").insert({
    task_id: app.task_id,
    application_id: applicationId,
    submitter_id: user.id,
    applicant_id: user.id,
    delivery_url,
    notes: notes || null,
    status: "pending_review",
  });

  if (error) {
    return { status: "error", message: error.message || "Could not submit." };
  }

  // Notify the task creator that work came in
  try {
    const { data: task } = await supabase
      .from("tasks")
      .select("title, creator_id")
      .eq("id", app.task_id)
      .maybeSingle();
    const row = task as { title: string; creator_id: string } | null;
    if (row && row.creator_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: row.creator_id,
        title: "Submissions received",
        body: `New work delivery posted for "${row.title}". Review and approve to enable payout.`,
        type: "personal",
        link_url: `/dashboard/tasks/${app.task_id}/applicants`,
      });
    }
  } catch (err) {
    console.error("[createSubmissionAction] notify error:", err);
  }

  revalidatePath(`/tasks/${app.task_id}`);
  revalidatePath(`/dashboard/applications`);
  return { status: "success", message: "Submission posted for review." };
}

export async function updateSubmissionAction(
  submissionId: string,
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  if (!isUuid(submissionId))
    return { status: "error", message: "Invalid submission." };

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");
  if (!profile) {
    return { status: "error", message: "Your profile is missing." };
  }

  const delivery_url = String(formData.get("delivery_url") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const fieldErrors: SubmitState["fieldErrors"] = {};

  if (!delivery_url) fieldErrors.delivery_url = "Delivery link is required.";
  else if (!isHttpsUrl(delivery_url))
    fieldErrors.delivery_url = "Use a valid HTTPS URL.";
  if (notes.length > 2000)
    fieldErrors.notes = "Notes must be 2000 chars or fewer.";
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  const { data: row } = await supabase
    .from("task_submissions")
    .select("task_id, submitter_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!row) {
    return { status: "error", message: "Submission not found." };
  }
  if (row.submitter_id !== user.id) {
    return {
      status: "error",
      message: "You can only edit your own submissions.",
    };
  }

  const { error } = await supabase
    .from("task_submissions")
    .update({ delivery_url, notes: notes || null })
    .eq("id", submissionId);

  if (error) {
    return { status: "error", message: error.message };
  }

  if (row?.task_id) revalidatePath(`/tasks/${row.task_id}`);
  return { status: "success", message: "Submission updated." };
}

export async function reviewSubmissionAction(
  submissionId: string,
  formData: FormData,
) {
  if (!isUuid(submissionId)) return;

  const decision = String(formData.get("decision") ?? "");
  if (
    decision !== "approved" &&
    decision !== "rejected" &&
    decision !== "revision_requested"
  ) {
    return;
  }
  const review_notes = String(formData.get("review_notes") ?? "").trim();

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("task_submissions")
    .select("task_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!row?.task_id) return;

  const { data: task } = await supabase
    .from("tasks")
    .select("creator_id")
    .eq("id", row.task_id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  if (!task || (task.creator_id !== user.id && !isAdmin)) return;

  await supabase
    .from("task_submissions")
    .update({
      status: decision,
      review_notes: review_notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  // Notify the applicant about the review decision
  try {
    const { data: sub } = await supabase
      .from("task_submissions")
      .select("submitter_id")
      .eq("id", submissionId)
      .maybeSingle();
    const { data: task } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", row.task_id)
      .maybeSingle();
    const subRow = sub as { submitter_id: string } | null;
    const title = (task as { title: string } | null)?.title ?? "task";
    if (subRow?.submitter_id) {
      const verbMap: Record<string, string> = {
        approved: "Your work was approved",
        rejected: "Your work was rejected",
        revision_requested: "Revisions requested",
      };
      const bodyMap: Record<string, string> = {
        approved: `Great work! "${title}" was approved.`,
        rejected: `"${title}" was rejected.${review_notes ? ` Reason: ${review_notes}` : ""}`,
        revision_requested: `"${title}" needs changes.${review_notes ? ` ${review_notes}` : ""}`,
      };
      await supabase.from("notifications").insert({
        user_id: subRow.submitter_id,
        title: verbMap[decision] ?? "Submission reviewed",
        body: bodyMap[decision] ?? `Your submission for "${title}" was reviewed.`,
        type: "personal",
        link_url: `/dashboard/applications#${submissionId}`,
      });
    }
  } catch (err) {
    console.error("[reviewSubmissionAction] notify error:", err);
  }

  if (row?.task_id) {
    revalidatePath(`/tasks/${row.task_id}`);
    revalidatePath(`/dashboard/tasks/${row.task_id}/applicants`);
  }
}

// =====================================================================
// Raffle Metadata (admin/owner only)
// =====================================================================

export async function setSubmissionRaffleEligibilityAction(
  submissionId: string,
  eligible: boolean,
) {
  if (!isUuid(submissionId)) return;

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("task_submissions")
    .select("id, task_id, raffle_winner_position")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) return;

  const { data: task } = await supabase
    .from("tasks")
    .select("id, creator_id, reward_mode")
    .eq("id", submission.task_id)
    .maybeSingle();

  if (!task || task.reward_mode !== "raffle") return;

  const isAdmin = profile?.role === "admin";
  const isOwner = task.creator_id === user.id;
  if (!isAdmin && !isOwner) return;

  if (!eligible && submission.raffle_winner_position !== null) {
    return;
  }

  const { data: selectedWinner } = await supabase
    .from("task_submissions")
    .select("id")
    .eq("task_id", task.id)
    .not("raffle_winner_position", "is", null)
    .limit(1)
    .maybeSingle();

  if (selectedWinner) return;

  const { error } = await supabase
    .from("task_submissions")
    .update({
      raffle_eligible: eligible,
      raffle_eligible_at: eligible ? new Date().toISOString() : null,
    })
    .eq("id", submissionId);

  if (error) return;

  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/dashboard/tasks/${task.id}/applicants`);
  revalidatePath("/dashboard/applications");
}

export async function selectRaffleWinnersAction(taskId: string) {
  if (!isUuid(taskId)) return;

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  const { data: task } = await supabase
    .from("tasks")
    .select("id, creator_id, reward_mode, raffle_winner_count")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.reward_mode !== "raffle") return;

  const isAdmin = profile?.role === "admin";
  const isOwner = task.creator_id === user.id;
  if (!isAdmin && !isOwner) return;

  const { error } = await supabase.rpc("select_raffle_winners", {
    p_task_id: taskId,
  });

  if (error) return;

  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/dashboard/tasks/${task.id}/applicants`);
  revalidatePath("/dashboard/applications");
}

// =====================================================================
// Escrow Release (admin/owner only)
// =====================================================================

export async function releaseEscrowAction(
  submissionId: string,
  assignTxHash: string,
  releaseTxHash: string,
) {
  if (!isUuid(submissionId)) {
    return { ok: false, message: "Invalid submission." };
  }
  if (!TX_HASH_RE.test(assignTxHash) || !TX_HASH_RE.test(releaseTxHash)) {
    return { ok: false, message: "Invalid transaction hash." };
  }

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  // Fetch submission + task + worker profile
  const { data: submission } = await supabase
    .from("task_submissions")
    .select("task_id, submitter_id, status, raffle_winner_position")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    return { ok: false, message: "Submission not found." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, creator_id, payment_method, reward_amount, reward_mode, raffle_winner_count",
    )
    .eq("id", submission.task_id)
    .maybeSingle();

  if (!task) {
    return { ok: false, message: "Task not found." };
  }

  // Check permission: must be task owner or admin
  const isAdmin = profile?.role === "admin";
  const isOwner = task.creator_id === user.id;
  if (!isAdmin && !isOwner) {
    return { ok: false, message: "Permission denied." };
  }

  // Only escrow tasks can release
  if (task.payment_method !== "escrow_stellar") {
    return { ok: false, message: "This task uses manual payment." };
  }

  if (submission.status !== "approved") {
    return {
      ok: false,
      message: "Approve the submission before releasing escrow.",
    };
  }

  if (task.reward_mode === "raffle") {
    if (task.raffle_winner_count > 1) {
      return {
        ok: false,
        message:
          "Use the raffle escrow release flow for multi-winner raffles.",
      };
    }
    if (submission.raffle_winner_position === null) {
      return {
        ok: false,
        message: "Only the selected raffle winner can receive escrow.",
      };
    }
  }

  // Fetch worker wallet address
  const { data: worker } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", submission.submitter_id)
    .maybeSingle();

  if (!worker?.wallet_address) {
    return {
      ok: false,
      message:
        "Worker has not set a wallet address. Ask them to add one in their profile.",
    };
  }

  // Record both assign and release tx hashes on the submission
  const { error } = await supabase
    .from("task_submissions")
    .update({
      assign_tx_hash: assignTxHash,
      assigned_at: new Date().toISOString(),
      release_tx_hash: releaseTxHash,
      released_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) {
    return {
      ok: false,
      message: error.message || "Could not record release.",
    };
  }

  // Notify the worker that they got paid
  try {
    const { data: t } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", task.id)
      .maybeSingle();
    const title = (t as { title: string } | null)?.title ?? "task";
    await supabase.from("notifications").insert({
      user_id: submission.submitter_id,
      title: "Escrow released",
      body: `Escrow for "${title}" has been released to your wallet. Net payout: see Stellar tx ${releaseTxHash.slice(0, 12)}…`,
      type: "personal",
      link_url: `/dashboard/applications#${submissionId}`,
    });
  } catch (err) {
    console.error("[releaseEscrowAction] notify error:", err);
  }

  revalidatePath(`/dashboard/tasks/${task.id}/applicants`);
  revalidatePath(`/tasks/${task.id}`);

  return { ok: true, message: "Escrow released." };
}

export async function releaseRaffleEscrowAction(
  taskId: string,
  assignTxHash: string,
  releaseTxHash: string,
) {
  if (!isUuid(taskId)) {
    return { ok: false, message: "Invalid task id." };
  }
  if (!TX_HASH_RE.test(assignTxHash) || !TX_HASH_RE.test(releaseTxHash)) {
    return { ok: false, message: "Invalid transaction hash." };
  }

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, creator_id, payment_method, reward_mode, raffle_winner_count, escrow_contract_address",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return { ok: false, message: "Task not found." };
  }

  const isAdmin = profile?.role === "admin";
  const isOwner = task.creator_id === user.id;
  if (!isAdmin && !isOwner) {
    return { ok: false, message: "Permission denied." };
  }

  if (task.payment_method !== "escrow_stellar") {
    return { ok: false, message: "This task uses manual payment." };
  }
  if (task.reward_mode !== "raffle") {
    return { ok: false, message: "This task is not a raffle." };
  }
  if (task.raffle_winner_count <= 1) {
    return { ok: false, message: "Use the single-worker release flow." };
  }
  if (
    (task.escrow_contract_address ?? "").toLowerCase() !==
    ESCROW_CONTRACT_ADDRESS.toLowerCase()
  ) {
    return {
      ok: false,
      message: "Multi-winner escrow release requires a V1-funded task.",
    };
  }

  const { data: winners } = await supabase
    .from("task_submissions")
    .select("id, status, release_tx_hash")
    .eq("task_id", taskId)
    .not("raffle_winner_position", "is", null);

  const winnerRows =
    (winners as
      | { id: string; status: string; release_tx_hash: string | null }[]
      | null) ?? [];

  if (winnerRows.length !== task.raffle_winner_count) {
    return { ok: false, message: "Raffle winners are not fully selected." };
  }
  if (winnerRows.some((winner) => winner.status !== "approved")) {
    return {
      ok: false,
      message: "Approve every selected winner before releasing escrow.",
    };
  }
  if (winnerRows.some((winner) => winner.release_tx_hash)) {
    return { ok: false, message: "This raffle escrow is already released." };
  }

  const { error } = await supabase
    .from("task_submissions")
    .update({
      assign_tx_hash: assignTxHash,
      assigned_at: new Date().toISOString(),
      release_tx_hash: releaseTxHash,
      released_at: new Date().toISOString(),
    })
    .in(
      "id",
      winnerRows.map((winner) => winner.id),
    );

  if (error) {
    return {
      ok: false,
      message: error.message || "Could not record raffle release.",
    };
  }

  // Notify each winner
  try {
    const { data: t } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .maybeSingle();
    const title = (t as { title: string } | null)?.title ?? "task";
    const { data: winnerSubs } = await supabase
      .from("task_submissions")
      .select("id, submitter_id")
      .in("id", winnerRows.map((w) => w.id));
    const list = (winnerSubs as { id: string; submitter_id: string }[]) ?? [];
    for (const w of list) {
      await supabase.from("notifications").insert({
        user_id: w.submitter_id,
        title: "Raffle escrow released",
        body: `Raffle escrow for "${title}" has been released to your wallet. See Stellar tx ${releaseTxHash.slice(0, 12)}…`,
        type: "personal",
        link_url: `/dashboard/applications#${w.id}`,
      });
    }
  } catch (err) {
    console.error("[releaseRaffleEscrowAction] notify error:", err);
  }

  revalidatePath(`/dashboard/tasks/${task.id}/applicants`);
  revalidatePath(`/tasks/${task.id}`);

  return { ok: true, message: "Raffle escrow released." };
}
