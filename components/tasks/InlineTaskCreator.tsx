"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { TaskStatus } from "@/store/taskStore"
import { Circle, Radio, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineTaskCreatorProps {
  defaultStatus: TaskStatus
  defaultCustomStatusId?: string | null
  taskListId: string
  onSave: (title: string, taskListId: string) => Promise<void>
  onCancel?: () => void
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle className="h-4 w-4" />,
  IN_PROGRESS: <Radio className="h-4 w-4" />,
  COMPLETE: <CheckCircle className="h-4 w-4" />,
}

const statusColors: Record<TaskStatus, string> = {
  TODO: "#6b7280",
  IN_PROGRESS: "#2563eb",
  COMPLETE: "#10b981",
}

export function InlineTaskCreator({
  defaultStatus,
  defaultCustomStatusId,
  taskListId,
  onSave,
  onCancel,
}: InlineTaskCreatorProps) {
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
      await onSave(title.trim(), taskListId)
      setTitle("")
    } catch (error) {
      console.error("保存失败:", error)
    } finally {
      setIsSaving(false)
    }
  }, [title, isSaving, onSave, taskListId, onCancel])

  useEffect(() => {
    // 自动聚焦输入框
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // 点击外部区域保存
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleSave()
      }
    }

    // 延迟添加事件监听，避免立即触发
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
      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
    >
      <div
        className="flex-shrink-0"
        style={{ color: statusColors[defaultStatus] }}
      >
        {statusIcons[defaultStatus]}
      </div>
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入任务名称，按 Enter 保存"
        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        disabled={isSaving}
      />
    </div>
  )
}

