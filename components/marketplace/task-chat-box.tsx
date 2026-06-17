import { MessageSquareText, Send } from "lucide-react";
import { sendTaskMessageAction } from "@/app/task-messages/actions";
import {
  createTranslator,
  DATE_LOCALE,
  type Locale,
} from "@/lib/i18n";
import type { DbTaskMessage } from "@/lib/task-messages";

type SenderProfile = {
  id: string;
  username: string;
  display_name: string | null;
};

type TaskChatBoxProps = {
  taskId: string;
  applicationId: string;
  submissionId?: string | null;
  currentUserId: string;
  messages: DbTaskMessage[];
  senderProfilesById: Map<string, SenderProfile>;
  locale: Locale;
};

function formatMessageTimestamp(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSenderLabel(
  message: DbTaskMessage,
  currentUserId: string,
  senderProfilesById: Map<string, SenderProfile>,
  t: ReturnType<typeof createTranslator>,
): string {
  if (message.sender_id === currentUserId) return t("chat.you");

  const profile = senderProfilesById.get(message.sender_id);
  if (profile?.display_name) return profile.display_name;
  if (profile?.username) return `@${profile.username}`;
  return t("chat.unknownSender");
}

export function TaskChatBox({
  taskId,
  applicationId,
  submissionId = null,
  currentUserId,
  messages,
  senderProfilesById,
  locale,
}: TaskChatBoxProps) {
  const t = createTranslator(locale);
  const sendMessage = sendTaskMessageAction.bind(null, {
    taskId,
    applicationId,
    submissionId,
  });

  return (
    <section className="mt-5 rounded-lg border-2 border-[#140625] bg-[#f8f0ff] p-4 shadow-[3px_3px_0_#140625]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#140625]">
          <MessageSquareText
            aria-hidden="true"
            className="h-4 w-4 text-[#7c3cff]"
          />
          {t("chat.messages")}
        </h3>
        <p className="text-xs font-bold text-[#5a3b66]">
          {t("chat.participantsOnly")}
        </p>
      </div>

      <div className="mt-3 grid max-h-80 gap-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-[#140625] bg-white p-3 text-sm font-bold text-[#5a3b66]">
            {t("chat.noMessages")}
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === currentUserId;
            return (
              <article
                key={message.id}
                className={`rounded-lg border-2 border-[#140625] p-3 shadow-[2px_2px_0_#140625] ${
                  isMine ? "bg-[#fff8ed]" : "bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase text-[#7c3cff]">
                    {getSenderLabel(
                      message,
                      currentUserId,
                      senderProfilesById,
                      t,
                    )}
                  </p>
                  <time
                    dateTime={message.created_at}
                    className="text-[0.7rem] font-bold text-[#5a3b66]"
                  >
                    {formatMessageTimestamp(message.created_at, locale)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-[#3c214b]">
                  {message.message_text}
                </p>
              </article>
            );
          })
        )}
      </div>

      <form action={sendMessage} className="mt-4 grid gap-2">
        <textarea
          name="message_text"
          rows={3}
          required
          maxLength={2000}
          placeholder={t("chat.writeMessage")}
          className="w-full rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none focus:ring-2 focus:ring-[#38e7ff]"
        />
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d]">
          <Send aria-hidden="true" className="h-4 w-4" />
          {t("chat.sendMessage")}
        </button>
      </form>
    </section>
  );
}
