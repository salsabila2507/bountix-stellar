"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MessageSquareText, Send, LoaderCircle } from "lucide-react"
import TencentCloudChat from "@tencentcloud/lite-chat"
import { useChat } from "@/lib/chat/chat-provider"
import {
  createTranslator,
  DATE_LOCALE,
  type Locale,
} from "@/lib/i18n"

type ChatMessage = {
  id: string
  senderId: string
  text: string
  timestamp: number
}

type ChatSdkMessage = {
  ID: string
  conversationID?: string
  from: string
  type: string
  cloudCustomData?: string
  payload: { text: string }
  timestamp: number
}

type MessageReceivedEvent = {
  data?: ChatSdkMessage[]
}

function getMessageApplicationId(message: ChatSdkMessage): string | null {
  try {
    const meta = JSON.parse(message.cloudCustomData || "{}") as { applicationId?: unknown }
    return typeof meta.applicationId === "string" ? meta.applicationId : null
  } catch {
    return null
  }
}

type TaskChatBoxProps = {
  taskId: string
  applicationId: string
  currentUserId: string
  otherUserId: string | null
  locale: Locale
}

function formatTimestamp(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts * 1000))
}

export function TaskChatBox({
  taskId,
  applicationId,
  otherUserId,
  currentUserId,
  locale,
}: TaskChatBoxProps) {
  const t = createTranslator(locale)
  const { chat, isReady } = useChat()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chat || !isReady || !otherUserId) {
      queueMicrotask(() => setLoading(false))
      return
    }

    const chatClient = chat
    const conversationID = `C2C${otherUserId}`
    let cancelled = false

    async function load() {
      try {
        const res = await chatClient.getMessageList({ conversationID })
        if (cancelled) return

        const items: ChatMessage[] = (res.data.messageList as ChatSdkMessage[])
          .filter((m) =>
            m.type === TencentCloudChat.TYPES.MSG_TEXT &&
            getMessageApplicationId(m) === applicationId,
          )
          .map((m) => ({
            id: m.ID,
            senderId: m.from,
            text: m.payload.text,
            timestamp: m.timestamp,
          }))

        setMessages(items)
      } catch (err) {
        console.warn("[chat] load error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    function onMessageReceived(event: MessageReceivedEvent) {
      if (cancelled) return
      const msgs = event.data || []
      for (const m of msgs) {
        if (
          m.conversationID === conversationID &&
          m.type === TencentCloudChat.TYPES.MSG_TEXT
        ) {
          if (getMessageApplicationId(m) === applicationId) {
            setMessages((prev) => {
              if (prev.some((p) => p.id === m.ID)) return prev
              return [
                ...prev,
                {
                  id: m.ID,
                  senderId: m.from,
                  text: m.payload.text,
                  timestamp: m.timestamp,
                },
              ]
            })
          }
        }
      }
    }

    chatClient.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, onMessageReceived)

    return () => {
      cancelled = true
      chatClient.off(TencentCloudChat.EVENT.MESSAGE_RECEIVED, onMessageReceived)
    }
  }, [chat, isReady, otherUserId, applicationId])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending || !chat || !isReady || !otherUserId) return

    setSending(true)
    try {
      const message = chat.createTextMessage({
        to: otherUserId,
        conversationType: TencentCloudChat.TYPES.CONV_C2C,
        payload: { text: trimmed },
        cloudCustomData: JSON.stringify({ taskId, applicationId }),
      })
      await chat.sendMessage(message)
      setText("")

      fetch("/api/task-messages/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, applicationId, otherUserId, text: trimmed }),
      }).catch(() => {})
    } catch (err) {
      console.error("[chat] send error:", err)
    } finally {
      setSending(false)
    }
  }, [text, sending, chat, isReady, otherUserId, taskId, applicationId])

  const loggedIn = isReady && otherUserId

  return (
    <section className="mt-5 rounded-lg border-2 border-[#140625] bg-[#f8f0ff] p-4 shadow-[3px_3px_0_#140625]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#140625]">
          <MessageSquareText aria-hidden="true" className="h-4 w-4 text-[#7c3cff]" />
          {t("chat.messages")}
        </h3>
        <p className="text-xs font-bold text-[#5a3b66]">
          {t("chat.participantsOnly")}
        </p>
      </div>

      <div ref={listRef} className="mt-3 grid max-h-80 gap-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-[#7c3cff]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-[#140625] bg-white p-3 text-sm font-bold text-[#5a3b66]">
            {t("chat.noMessages")}
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId
            return (
              <article
                key={msg.id}
                className={`rounded-lg border-2 border-[#140625] p-3 shadow-[2px_2px_0_#140625] ${
                  isMine ? "bg-[#fff8ed]" : "bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase text-[#7c3cff]">
                    {isMine ? t("chat.you") : "Other"}
                  </p>
                  <time
                    dateTime={new Date(msg.timestamp * 1000).toISOString()}
                    className="text-[0.7rem] font-bold text-[#5a3b66]"
                  >
                    {formatTimestamp(msg.timestamp, locale)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-[#3c214b]">
                  {msg.text}
                </p>
              </article>
            )
          })
        )}
      </div>

      {loggedIn ? (
        <div className="mt-4 grid gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("chat.writeMessage")}
            className="w-full rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none focus:ring-2 focus:ring-[#38e7ff]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Send aria-hidden="true" className="h-4 w-4" />
            )}
            {t("chat.sendMessage")}
          </button>
        </div>
      ) : otherUserId ? (
        <p className="mt-4 text-xs font-bold text-[#5a3b66]">Connecting to chat...</p>
      ) : null}
    </section>
  )
}
