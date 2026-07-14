"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import TencentCloudChat from "@tencentcloud/lite-chat"
import { createClient } from "@/utils/supabase/client"

const SDKAPPID = 331419296728

type ChatSDK = ReturnType<typeof TencentCloudChat.create>

type ChatContextValue = {
  chat: ChatSDK | null
  isReady: boolean
}

const ChatContext = createContext<ChatContextValue>({
  chat: null,
  isReady: false,
})

export function useChat() {
  return useContext(ChatContext)
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatRef = useRef<ChatSDK | null>(null)
  const [chat, setChat] = useState<ChatSDK | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function init(userId: string) {
      try {
        const res = await fetch("/api/chat/usersig")
        if (!res.ok || cancelled) return
        const { userSig } = await res.json()
        if (cancelled) return

        const chat = chatRef.current!
        await chat.login({ userID: userId, userSig })
      } catch (err) {
        console.error("[chat] login error:", err)
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
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return

      const chat = TencentCloudChat.create({ SDKAppID: SDKAPPID })
      chat.setLogLevel(1)
      chatRef.current = chat
      setChat(chat)

      chat.on(TencentCloudChat.EVENT.SDK_READY, () => {
        if (!cancelled) setIsReady(true)
      })
      chat.on(TencentCloudChat.EVENT.SDK_NOT_READY, () => {
        if (!cancelled) setIsReady(false)
      })

      init(user.id)
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
      subscription.unsubscribe()
      cleanup()
    }
  }, [])

  return (
    <ChatContext.Provider value={{ chat, isReady }}>
      {children}
    </ChatContext.Provider>
  )
}
