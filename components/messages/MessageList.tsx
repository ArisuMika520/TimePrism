"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface Conversation {
  id: string
  lastMessageAt: string | null
  participants: Array<{
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }>
  messages: Array<{
    id: string
    content: string
    sender: {
      id: string
      name: string | null
    }
    createdAt: string
  }>
}

interface MessageListProps {
  currentUserId: string
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
}

export function MessageList({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
}: MessageListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
    // 每30秒刷新一次
    const interval = setInterval(fetchConversations, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/messages")
      if (response.ok) {
        const data = await response.json()
        setConversations(data || [])
      }
    } catch (error) {
      console.error("获取对话列表错误:", error)
    } finally {
      setLoading(false)
    }
  }

  const getOtherUser = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.user.id !== currentUserId)?.user
  }

  const getLastMessage = (conversation: Conversation) => {
    return conversation.messages[0]
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">暂无对话</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const otherUser = getOtherUser(conversation)
        const lastMessage = getLastMessage(conversation)
        const isSelected = selectedConversationId === conversation.id

        if (!otherUser) return null

        return (
          <Card
            key={conversation.id}
            hoverable
            className={`cursor-pointer transition-all ${
              isSelected ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser.image || undefined} alt={otherUser.name || ""} />
                  <AvatarFallback>
                    {otherUser.name?.[0] || otherUser.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate">{otherUser.name || otherUser.email}</h4>
                    {conversation.lastMessageAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMessage.sender.id === currentUserId ? "你: " : ""}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}



