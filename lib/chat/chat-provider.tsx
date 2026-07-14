"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import TencentCloudChat from "@tencentcloud/lite-chat"
import { createClient } from "@/utils/supabase/client"

const SDKAPPID = Number(process.env.NEXT_PUBLIC_TENCENT_CHAT_SDK_APP_ID ?? "331419296728")

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
    const bootTimer = window.setTimeout(() => {
      if (!cancelled && !chatRef.current) {
        setError("Chat auth session timed out")
      }
    }, 10_000)

    async function init(userId: string) {
      try {
        setError(null)
        const res = await fetch("/api/chat/usersig")
        if (cancelled) return
        if (!res.ok) {
          setError("Chat auth failed")
          return
        }
        const { userSig } = (await res.json()) as { userSig?: string }
        if (cancelled) return
        if (!userSig) {
          setError("Chat signature missing")
          return
        }

        const chat = chatRef.current
        if (!chat) {
          setError("Chat SDK not initialized")
          return
        }
        await chat.login({ userID: userId, userSig })
      } catch (err) {
        console.error("[chat] login error:", err)
        if (!cancelled) setError(err instanceof Error ? err.message : "Chat login failed")
      }
    }

    function cleanup() {
      cancelled = true
      if (chatRef.current) {
        chatRef.current.destroy()
        chatRef.current = null
        setChat(null)
      }
      setIsReady(false)
      setError(null)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      window.clearTimeout(bootTimer)
      if (cancelled) return
      if (!user) {
        setError("Chat user session missing")
        return
      }

      if (!Number.isFinite(SDKAPPID) || SDKAPPID <= 0) {
        setError("Chat SDKAppID missing")
        return
      }

      const chat = TencentCloudChat.create({ SDKAppID: SDKAPPID })
      if (!chat) {
        setError("Chat SDK failed to initialize")
        return
      }

      chat.setLogLevel(1)
      chatRef.current = chat
      setChat(chat)

      const readyTimer = window.setTimeout(() => {
        if (!cancelled && !chat.isReady?.()) {
          setError("Chat login timed out. Check Tencent SDKAppID/UserSig config.")
        }
      }, 12_000)

      chat.on(TencentCloudChat.EVENT.SDK_READY, () => {
        window.clearTimeout(readyTimer)
        if (!cancelled) {
          setError(null)
          setIsReady(true)
        }
      })
      chat.on(TencentCloudChat.EVENT.SDK_NOT_READY, () => {
        if (!cancelled) setIsReady(false)
      })
      chat.on(TencentCloudChat.EVENT.KICKED_OUT, () => {
        window.clearTimeout(readyTimer)
        if (!cancelled) {
          setIsReady(false)
          setError("Chat session was kicked out. Refresh and try again.")
        }
      })
      chat.on(TencentCloudChat.EVENT.ERROR, (event: unknown) => {
        window.clearTimeout(readyTimer)
        console.error("[chat] SDK error:", event)
        if (!cancelled) setError("Chat SDK error")
      })

      init(user.id)
    }).catch((err) => {
      window.clearTimeout(bootTimer)
      console.error("[chat] auth session error:", err)
      if (!cancelled) setError("Chat auth session failed")
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === "SIGNED_OUT" || !session?.user) {
        cleanup()
      } else if (event === "SIGNED_IN" && chatRef.current) {
        init(session.user.id)
      }
    })

    return () => {
      window.clearTimeout(bootTimer)
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
