export type DbTaskMessage = {
  id: string;
  task_id: string;
  application_id: string | null;
  submission_id: string | null;
  sender_id: string;
  receiver_id: string | null;
  message_text: string;
  created_at: string;
  read_at: string | null;
};

export const TASK_MESSAGE_COLUMNS =
  "id, task_id, application_id, submission_id, sender_id, receiver_id, message_text, created_at, read_at";
