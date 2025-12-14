"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationList } from "@/components/messages/NotificationList"
import { MessageList } from "@/components/messages/MessageList"
import { ConversationView } from "@/components/messages/ConversationView"

interface MessagesPageClientProps {
  userId: string
}

export function MessagesPageClient({ userId }: MessagesPageClientProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">消息和通知</h1>
        <p className="text-muted-foreground mt-1">
          查看您的消息和通知
        </p>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">消息</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <MessageList
                currentUserId={userId}
                onSelectConversation={setSelectedConversationId}
                selectedConversationId={selectedConversationId || undefined}
              />
            </div>
            <div className="md:col-span-2">
              <ConversationView
                conversationId={selectedConversationId}
                currentUserId={userId}
                onMessageSent={() => {
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
