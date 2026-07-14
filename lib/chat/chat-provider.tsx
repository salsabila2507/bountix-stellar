"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import TencentCloudChat from "@tencentcloud/lite-chat"
import { createClient } from "@/utils/supabase/client"

type ChatSDK = ReturnType<typeof TencentCloudChat.create>

type ChatContextValue = {
  chat: ChatSDK | null
  isReady: boolean
  error: string | null
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChat() {
  const context = useContext(ChatContext)
  return context ?? {
    chat: null,
    isReady: false,
    error: "Chat provider is not mounted",
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatRef = useRef<ChatSDK | null>(null)
  const [chat, setChat] = useState<ChatSDK | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let readyTimer: number | null = null

    function clearReadyTimer() {
      if (readyTimer !== null) {
        window.clearTimeout(readyTimer)
        readyTimer = null
      }
    }

    function createChatClient(sdkAppId: number) {
      if (chatRef.current) return chatRef.current

      if (!Number.isInteger(sdkAppId) || sdkAppId <= 0) {
        setError("Chat SDKAppID missing")
        return null
      }

      const nextChat = TencentCloudChat.create({ SDKAppID: sdkAppId })
      if (!nextChat) {
        setError("Chat SDK failed to initialize")
        return null
      }

      nextChat.setLogLevel(1)
      chatRef.current = nextChat
      setChat(nextChat)

      nextChat.on(TencentCloudChat.EVENT.SDK_READY, () => {
        clearReadyTimer()
        if (!cancelled) {
          setError(null)
          setIsReady(true)
        }
      })
      nextChat.on(TencentCloudChat.EVENT.SDK_NOT_READY, () => {
        if (!cancelled) setIsReady(false)
      })
      nextChat.on(TencentCloudChat.EVENT.KICKED_OUT, () => {
        clearReadyTimer()
        if (!cancelled) {
          setIsReady(false)
          setError("Chat session was kicked out. Refresh and try again.")
        }
      })
      nextChat.on(TencentCloudChat.EVENT.ERROR, (event: unknown) => {
        clearReadyTimer()
        console.error("[chat] SDK error:", event)
        if (!cancelled) setError("Chat SDK error")
      })

      return nextChat
    }

    async function bootstrap() {
      try {
        setError(null)
        const res = await fetch("/api/chat/usersig", { cache: "no-store" })
        if (cancelled) return
        if (res.status === 401) {
          setError("Chat user session missing")
          return
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          setError(body?.error ? `Chat auth failed: ${body.error}` : "Chat auth failed")
          return
        }

        const { sdkAppId, userSig, userId } = (await res.json()) as {
          sdkAppId?: number
          userSig?: string
          userId?: string
        }
        if (cancelled) return
        if (!userId || !userSig) {
          setError("Chat signature missing")
          return
        }

        const nextChat = createChatClient(Number(sdkAppId))
        if (!nextChat) return

        clearReadyTimer()
        readyTimer = window.setTimeout(() => {
          if (!cancelled && !nextChat.isReady?.()) {
            setError("Chat login timed out. Check Tencent SDKAppID/UserSig config.")
          }
        }, 12_000)

        await nextChat.login({ userID: userId, userSig })
      } catch (err) {
        console.error("[chat] bootstrap error:", err)
        if (!cancelled) setError(err instanceof Error ? err.message : "Chat login failed")
      }
    }

    function cleanup() {
      cancelled = true
      clearReadyTimer()
      if (chatRef.current) {
        chatRef.current.destroy()
        chatRef.current = null
        setChat(null)
      }
      setIsReady(false)
      setError(null)
    }

    void bootstrap()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === "SIGNED_OUT" || !session?.user) {
        cleanup()
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void bootstrap()
      }
    })

    return () => {
      subscription.unsubscribe()
      cleanup()
    }
  }, [])
  return (
    <ChatContext.Provider value={{ chat, isReady, error }}>
      {children}
    </ChatContext.Provider>
  )
}
