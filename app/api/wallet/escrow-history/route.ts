import { NextRequest, NextResponse } from "next/server";
import { StrKey } from "@stellar/stellar-sdk";
import { createAdminClient } from "@/utils/supabase/server";
import { formatUsdc } from "@/lib/payments";

type ProfileRow = { id: string };
type SubmissionRow = {
  id: string;
  task_id: string;
  submitter_id: string;
  release_tx_hash: string | null;
  released_at: string | null;
};
type TaskRow = {
  id: string;
  title: string | null;
  reward_amount: number | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicKey = searchParams.get("publicKey")?.trim();

  if (!publicKey || !StrKey.isValidEd25519PublicKey(publicKey)) {
    return NextResponse.json({ error: "Invalid publicKey", payouts: [] }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("wallet_address", publicKey);

    if (profileError) {
      return NextResponse.json({ error: profileError.message, payouts: [] }, { status: 200 });
    }

    const profileRows = (profiles ?? []) as ProfileRow[];
    const userIds = profileRows.map((profile) => profile.id);
    if (userIds.length === 0) {
      return NextResponse.json({ payouts: [] });
    }

    const { data: submissions, error: submissionError } = await admin
      .from("task_submissions")
      .select("id, task_id, submitter_id, release_tx_hash, released_at")
      .in("submitter_id", userIds)
      .not("release_tx_hash", "is", null)
      .not("released_at", "is", null)
      .order("released_at", { ascending: false })
      .limit(25);

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message, payouts: [] }, { status: 200 });
    }

    const submissionRows = (submissions ?? []) as SubmissionRow[];
    const taskIds = Array.from(new Set(submissionRows.map((submission) => submission.task_id)));
    const { data: tasks } = taskIds.length
      ? await admin
          .from("tasks")
          .select("id, title, reward_amount")
          .in("id", taskIds)
      : { data: [] };

    const tasksById = new Map(
      ((tasks ?? []) as TaskRow[]).map((task) => [task.id, task]),
    );

    const payouts = submissionRows.map((submission) => {
      const task = tasksById.get(submission.task_id);
      return {
        id: submission.id,
        taskId: submission.task_id,
        taskTitle: task?.title ?? "Untitled task",
        amount: task?.reward_amount ?? 0,
        amountLabel: formatUsdc(task?.reward_amount ?? 0),
        token: "USDC",
        txHash: submission.release_tx_hash,
        releasedAt: submission.released_at,
      };
    });

    return NextResponse.json({ payouts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, payouts: [] }, { status: 200 });
  }
}
