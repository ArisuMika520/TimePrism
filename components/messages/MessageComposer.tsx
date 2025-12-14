"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface MessageComposerProps {
  onSend: (content: string) => Promise<void>
  disabled?: boolean
}

export function MessageComposer({ onSend, disabled }: MessageComposerProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending || disabled) return

    setSending(true)
    try {
      await onSend(message.trim())
      setMessage("")
    } catch (error) {
      console.error("发送消息错误:", error)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="输入消息..."
        disabled={sending || disabled}
      />
      <Button type="submit" disabled={!message.trim() || sending || disabled}>
        <Send className="h-4 w-4 mr-2" />
        {sending ? "发送中..." : "发送"}
      </Button>
    </form>
  )
}




