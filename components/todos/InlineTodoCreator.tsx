"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { TodoStatus } from "@/store/todoStore"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineTodoCreatorProps {
  defaultStatus: TodoStatus
  defaultCustomStatusId?: string | null
  onSave: (title: string) => Promise<void>
  onCancel?: () => void
}

export function InlineTodoCreator({
  defaultStatus,
  defaultCustomStatusId,
  onSave,
  onCancel,
}: InlineTodoCreatorProps) {
  const [title, setTitle] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSave = useCallback(async () => {
    if (!title.trim() || isSaving) {
      if (onCancel) onCancel()
      return
    }

    setIsSaving(true)
    try {
      await onSave(title.trim())
      setTitle("")
    } catch (error) {
      console.error("保存失败:", error)
    } finally {
      setIsSaving(false)
    }
  }, [title, isSaving, onSave, onCancel])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleSave()
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [title, handleSave])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      if (onCancel) onCancel()
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-md hover:bg-muted/50 transition-colors"
    >
      <Circle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入待办事项名称，按 Enter 保存"
        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-[11px] sm:text-sm h-6 sm:h-9"
        disabled={isSaving}
      />
    </div>
  )
}

