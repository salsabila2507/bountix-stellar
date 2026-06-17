export const APPLICATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STATUS_COLOR: Record<ApplicationStatus, string> = {
  pending: "bg-[#ffdd3d]",
  accepted: "bg-[#23b26d] text-white",
  rejected: "bg-[#c9c0d3] text-[#5a3b66]",
  withdrawn: "bg-white text-[#5a3b66]",
};

export type DbApplication = {
  id: string;
  task_id: string;
  applicant_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

export const APPLICATION_COLUMNS =
  "id, task_id, applicant_id, message, status, created_at, updated_at";

export const SUBMISSION_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "revision_requested",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
};

export const SUBMISSION_STATUS_COLOR: Record<SubmissionStatus, string> = {
  pending_review: "bg-[#ffdd3d]",
  approved: "bg-[#23b26d] text-white",
  rejected: "bg-[#c9c0d3] text-[#5a3b66]",
  revision_requested: "bg-[#f0d7ff]",
};

export type DbSubmission = {
  id: string;
  task_id: string;
  application_id: string;
  submitter_id: string;
  delivery_url: string;
  notes: string | null;
  review_notes: string | null;
  status: SubmissionStatus;
  reviewed_at: string | null;
  assign_tx_hash: string | null;
  assigned_at: string | null;
  release_tx_hash: string | null;
  released_at: string | null;
  raffle_eligible: boolean;
  raffle_eligible_at: string | null;
  raffle_winner_position: number | null;
  raffle_winner_selected_at: string | null;
  created_at: string;
  updated_at: string;
};

export const SUBMISSION_COLUMNS =
  "id, task_id, application_id, submitter_id, delivery_url, notes, review_notes, status, reviewed_at, assign_tx_hash, assigned_at, release_tx_hash, released_at, raffle_eligible, raffle_eligible_at, raffle_winner_position, raffle_winner_selected_at, created_at, updated_at";
