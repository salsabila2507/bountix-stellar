"use client"

import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react"
import { ImagePlus, MessageSquareText, Send, LoaderCircle } from "lucide-react"
import TencentCloudChat from "@tencentcloud/lite-chat"
import { useChat } from "@/lib/chat/chat-provider"
import { toTencentChatUserId } from "@/lib/chat/user-id"
import {
  createTranslator,
  DATE_LOCALE,
  type Locale,
} from "@/lib/i18n"

type ChatMessage = {
  id: string
  senderId: string
  timestamp: number
} & (
  | { kind: "text"; text: string }
  | { kind: "image"; imageUrl: string }
)

type ChatImageInfo = {
  url?: string
  imageUrl?: string
  width?: number
  height?: number
}

type ChatSdkMessage = {
  ID?: string
  conversationID?: string
  from?: string
  type?: string
  cloudCustomData?: string
  payload?: {
    text?: string
    imageInfoArray?: ChatImageInfo[]
  }
  timestamp?: number
}

type SendMessageResult = {
  data?: {
    message?: ChatSdkMessage
  }
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

function getImageUrl(message: ChatSdkMessage): string | null {
  const imageInfoArray = Array.isArray(message.payload?.imageInfoArray)
    ? message.payload.imageInfoArray
    : []
  const imageInfo = imageInfoArray.find((info) => info.url || info.imageUrl)
  return imageInfo?.url || imageInfo?.imageUrl || null
}

function toChatMessage(message: ChatSdkMessage): ChatMessage | null {
  const id = message.ID
  const senderId = message.from
  if (!id || !senderId) return null

  const timestamp = typeof message.timestamp === "number"
    ? message.timestamp
    : Math.floor(Date.now() / 1000)

  if (message.type === TencentCloudChat.TYPES.MSG_TEXT && typeof message.payload?.text === "string") {
    return {
      id,
      senderId,
      kind: "text",
      text: message.payload.text,
      timestamp,
    }
  }

  if (message.type === TencentCloudChat.TYPES.MSG_IMAGE) {
    const imageUrl = getImageUrl(message)
    if (!imageUrl) return null
    return {
      id,
      senderId,
      kind: "image",
      imageUrl,
      timestamp,
    }
  }

  return null
}

function isSupportedChatImage(file: File): boolean {
  const supportedTypes = new Set([
    "image/jpeg",
    "image/gif",
    "image/png",
    "image/bmp",
    "image/webp",
  ])
  const supportedExtensions = /\.(jpe?g|gif|png|bmp|webp)$/i
  return supportedTypes.has(file.type) || supportedExtensions.test(file.name)
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
  const { chat, isReady, error: chatError } = useChat()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sendError, setSendError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const tencentCurrentUserId = toTencentChatUserId(currentUserId)
  const tencentOtherUserId = otherUserId ? toTencentChatUserId(otherUserId) : null

  useEffect(() => {
    if (!chat || !isReady || !tencentOtherUserId) {
      queueMicrotask(() => setLoading(false))
      return
    }

    const chatClient = chat
    const conversationID = `C2C${tencentOtherUserId}`
    let cancelled = false

    async function load() {
      try {
        const res = await chatClient.getMessageList({ conversationID })
        if (cancelled) return

        const messageList = Array.isArray(res.data?.messageList) ? res.data.messageList : []
        const items: ChatMessage[] = (messageList as ChatSdkMessage[])
          .filter((m) => getMessageApplicationId(m) === applicationId)
          .map(toChatMessage)
          .filter((m): m is ChatMessage => m !== null)

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
        if (m.conversationID === conversationID && getMessageApplicationId(m) === applicationId) {
          const nextMessage = toChatMessage(m)
          if (!nextMessage) continue
          setMessages((prev) => {
            if (prev.some((p) => p.id === nextMessage.id)) return prev
            return [...prev, nextMessage]
          })
        }
      }
    }

    chatClient.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, onMessageReceived)

    return () => {
      cancelled = true
      chatClient.off(TencentCloudChat.EVENT.MESSAGE_RECEIVED, onMessageReceived)
    }
  }, [chat, isReady, tencentOtherUserId, applicationId])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const appendSentMessage = useCallback((result: SendMessageResult) => {
    const sentMessage = result.data?.message ? toChatMessage(result.data.message) : null
    if (!sentMessage) return
    setMessages((prev) => {
      if (prev.some((p) => p.id === sentMessage.id)) return prev
      return [...prev, sentMessage]
    })
  }, [])

  const notifyMessage = useCallback((messageText: string) => {
    if (!otherUserId) return
    fetch("/api/task-messages/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, applicationId, otherUserId, text: messageText }),
    }).catch(() => {})
  }, [applicationId, otherUserId, taskId])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending || !chat || !isReady || !otherUserId || !tencentOtherUserId) return

    setSending(true)
    setSendError(null)
    try {
      const message = chat.createTextMessage({
        to: tencentOtherUserId,
        conversationType: TencentCloudChat.TYPES.CONV_C2C,
        payload: { text: trimmed },
        cloudCustomData: JSON.stringify({ taskId, applicationId }),
      })
      const result = (await chat.sendMessage(message)) as SendMessageResult
      appendSentMessage(result)
      setText("")
      notifyMessage(trimmed)
    } catch (err) {
      console.error("[chat] send error:", err)
      setSendError(t("chat.sendFailed"))
    } finally {
      setSending(false)
    }
  }, [text, sending, chat, isReady, otherUserId, tencentOtherUserId, taskId, applicationId, appendSentMessage, notifyMessage, t])

  const handleImageChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || sending || !chat || !isReady || !otherUserId || !tencentOtherUserId) return

    if (!isSupportedChatImage(file)) {
      setSendError(t("chat.imageUnsupported"))
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setSendError(t("chat.imageTooLarge"))
      return
    }

    setSending(true)
    setSendError(null)
    try {
      const message = chat.createImageMessage({
        to: tencentOtherUserId,
        conversationType: TencentCloudChat.TYPES.CONV_C2C,
        payload: { file },
        cloudCustomData: JSON.stringify({ taskId, applicationId }),
      })
      const result = (await chat.sendMessage(message)) as SendMessageResult
      appendSentMessage(result)
      notifyMessage(t("chat.imageNotification"))
    } catch (err) {
      console.error("[chat] image send error:", err)
      setSendError(t("chat.sendFailed"))
    } finally {
      setSending(false)
    }
  }, [sending, chat, isReady, otherUserId, tencentOtherUserId, taskId, applicationId, appendSentMessage, notifyMessage, t])

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
            const isMine = msg.senderId === tencentCurrentUserId
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
                {msg.kind === "text" ? (
                  <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-[#3c214b]">
                    {msg.text}
                  </p>
                ) : (
                  <a
                    href={msg.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block overflow-hidden rounded-md border-2 border-[#140625] bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imageUrl}
                      alt={t("chat.imageAlt")}
                      className="max-h-72 w-full object-contain"
                    />
                  </a>
                )}
              </article>
            )
          })
        )}
      </div>

      {chatError ? (
        <p className="mt-4 text-xs font-bold text-[#ff4fb8]">{chatError}</p>
      ) : loggedIn ? (
        <div className="mt-4 grid gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
            className="sr-only"
            onChange={handleImageChange}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("chat.writeMessage")}
            className="w-full rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none focus:ring-2 focus:ring-[#38e7ff]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-4 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              {t("chat.attachImage")}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ffdd3d] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {sending ? (
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
              {t("chat.sendMessage")}
            </button>
          </div>
          {sendError ? <p className="text-xs font-bold text-[#ff4fb8]">{sendError}</p> : null}
        </div>
      ) : otherUserId ? (
        <p className="mt-4 text-xs font-bold text-[#5a3b66]">Connecting to Tencent Chat...</p>
      ) : null}
    </section>
  )
}
