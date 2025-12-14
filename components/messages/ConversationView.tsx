"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  recipient: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  read: boolean
  createdAt: string
}

interface Conversation {
  id: string
  participants: Array<{
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }>
  messages: Message[]
}

interface ConversationViewProps {
  conversationId: string | null
  currentUserId: string
  onMessageSent?: () => void
}

export function ConversationView({
  conversationId,
  currentUserId,
  onMessageSent,
}: ConversationViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      fetchConversation()
      // 每5秒刷新一次消息
      const interval = setInterval(fetchConversation, 5000)
      return () => clearInterval(interval)
    } else {
      setConversation(null)
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchConversation = async () => {
    if (!conversationId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setConversation(data)
        // 标记消息为已读
        const unreadMessages = data.messages.filter(
          (m: Message) => !m.read && m.recipient.id === currentUserId
        )
        for (const msg of unreadMessages) {
          await fetch(`/api/messages/${msg.id}`, { method: "PATCH" })
        }
      }
    } catch (error) {
      console.error("获取对话错误:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !conversationId || sending) return

    setSending(true)
    try {
      const otherUser = conversation?.participants.find(
        (p) => p.user.id !== currentUserId
      )?.user

      if (!otherUser) return

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: otherUser.id,
          content: message.trim(),
          conversationId,
        }),
      })

      if (response.ok) {
        setMessage("")
        await fetchConversation()
        onMessageSent?.()
      }
    } catch (error) {
      console.error("发送消息错误:", error)
    } finally {
      setSending(false)
    }
  }

  const getOtherUser = () => {
    return conversation?.participants.find((p) => p.user.id !== currentUserId)?.user
  }

  if (!conversationId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">选择一个对话开始聊天</p>
        </CardContent>
      </Card>
    )
  }

  if (loading && !conversation) {
    return <div className="text-center py-8">加载中...</div>
  }

  const otherUser = getOtherUser()

  return (
    <Card className="flex flex-col h-[600px]">
      {otherUser && (
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser.image || undefined} alt={otherUser.name || ""} />
              <AvatarFallback>
                {otherUser.name?.[0] || otherUser.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{otherUser.name || otherUser.email}</span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation?.messages.map((msg) => {
            const isOwn = msg.sender.id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.sender.image || undefined} alt={msg.sender.name || ""} />
                  <AvatarFallback>
                    {msg.sender.name?.[0] || msg.sender.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(msg.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "发送中..." : "发送"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

