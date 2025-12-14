"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Todo, TodoStatus, Priority, UserCustomStatus, Attachment, useTodoStore } from "@/store/todoStore"
import {
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Paperclip,
  Image as ImageIcon,
  Circle,
  Radio,
  CheckCircle,
  Clock,
  Flag,
  Calendar,
  MoreVertical,
  Check,
  FileText,
  User,
  Sun,
  Loader2,
} from "lucide-react"
import { format, addDays, startOfDay, isSameDay } from "date-fns"
import { zhCN } from "date-fns/locale"
import { undoManager } from "@/lib/undoManager"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { StatusSelectPopover } from "./StatusSelectPopover"
import { PrioritySelectPopover } from "./PrioritySelectPopover"
import { useNotification } from "@/components/ui/notification"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { usePrompt } from "@/components/ui/prompt-dialog"
import { cn } from "@/lib/utils"
import { useProjectStore } from "@/store/projectStore"
import { useTaskStore } from "@/store/taskStore"
import { FolderKanban, ExternalLink } from "lucide-react"

interface TodoDetailPanelProps {
  todo: Todo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
  readOnly?: boolean
}

const statusConfig: Record<TodoStatus, { label: string; color: string; icon: React.ReactNode }> = {
  WAIT: { label: "等待中", color: "#6b7280", icon: <Circle className="h-3 w-3" /> },
  IN_PROGRESS: { label: "进行中", color: "#2563eb", icon: <Radio className="h-3 w-3" /> },
  COMPLETE: { label: "已完成", color: "#10b981", icon: <CheckCircle className="h-3 w-3" /> },
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: "低", color: "#10b981" },
  MEDIUM: { label: "中", color: "#2563eb" },
  HIGH: { label: "高", color: "#f97316" },
  URGENT: { label: "紧急", color: "#ef4444" },
}

export function TodoDetailPanel({
  todo,
  open,
  onOpenChange,
  onUpdate,
  readOnly = false,
}: TodoDetailPanelProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TodoStatus>("WAIT")
  const [customStatusId, setCustomStatusId] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority>("MEDIUM")
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [links, setLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState("")
  const [customStatuses, setCustomStatuses] = useState<UserCustomStatus[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTodayUpdating, setIsTodayUpdating] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { projects, setCurrentProject } = useProjectStore()
  const { taskLists } = useTaskStore()
  const [taskInfo, setTaskInfo] = useState<{ task: any; project: any } | null>(null)
  const [initialValues, setInitialValues] = useState<{
    title: string
    description: string
    status: TodoStatus
    customStatusId: string | null
    priority: Priority
    startDate: string
    dueDate: string
    links: string[]
  } | null>(null)
  const { updateTodo } = useTodoStore()
  const { toast } = useToast()
  const { showError, showSuccess } = useNotification()
  const confirm = useConfirm()
  const prompt = usePrompt()
  const hasChangesRef = useRef(false)
  const isClosingRef = useRef(false)

  useEffect(() => {
    if (open) {
      fetchCustomStatuses()
      isClosingRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (todo?.taskId) {
      const task = taskLists
        .flatMap((list) => list.tasks)
        .find((t) => t.id === todo.taskId)

      if (task) {
        const taskList = taskLists.find((list) => list.id === task.taskListId)
        const project = taskList?.projectId
          ? projects.find((p) => p.id === taskList.projectId)
          : null

        setTaskInfo({ task, project })
      } else {
        setTaskInfo(null)
      }
    } else {
      setTaskInfo(null)
    }
  }, [todo?.taskId, taskLists, projects])

  useEffect(() => {
    if (todo) {
      const initial = {
        title: todo.title,
        description: todo.description || "",
        status: todo.status,
        customStatusId: todo.customStatusId || null,
        priority: todo.priority,
        startDate: todo.startDate
          ? format(new Date(todo.startDate), "yyyy-MM-dd'T'HH:mm")
          : "",
        dueDate: todo.dueDate
          ? format(new Date(todo.dueDate), "yyyy-MM-dd'T'HH:mm")
          : "",
        links: todo.links || [],
      }
      setInitialValues(initial)
      setTitle(initial.title)
      setDescription(initial.description)
      setStatus(initial.status)
      setCustomStatusId(initial.customStatusId)
      setPriority(initial.priority)
      setStartDate(initial.startDate)
      setDueDate(initial.dueDate)
      setLinks(initial.links)
      setAttachments(todo.attachments || [])
      setHasChanges(false)
    }
  }, [todo])

  useEffect(() => {
    if (!todo || !initialValues) {
      setHasChanges(false)
      return
    }

    const current = {
      title,
      description: description || "",
      status,
      customStatusId: customStatusId || null,
      priority,
      startDate,
      dueDate,
      links,
    }

    const changed =
      current.title !== initialValues.title ||
      current.description !== initialValues.description ||
      current.status !== initialValues.status ||
      current.customStatusId !== initialValues.customStatusId ||
      current.priority !== initialValues.priority ||
      current.startDate !== initialValues.startDate ||
      current.dueDate !== initialValues.dueDate ||
      JSON.stringify(current.links) !== JSON.stringify(initialValues.links)

    setHasChanges(changed)
    hasChangesRef.current = changed
  }, [title, description, status, customStatusId, priority, startDate, dueDate, links, todo, initialValues])

  useEffect(() => {
    if (!open && hasChangesRef.current && todo && !isClosingRef.current) {
      isClosingRef.current = true
      handleSaveInternal(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, todo])

  const fetchCustomStatuses = async () => {
    try {
      const response = await fetch("/api/custom-statuses")
      if (response.ok) {
        const data = await response.json()
        setCustomStatuses(data)
      }
    } catch (error) {
    }
  }

  const handleSaveInternal = useCallback(async (isAutoSave = false) => {
    if (!todo || !initialValues) return

    const previousTodo = { ...todo }

    const updates = {
      title,
      description: description || null,
      status,
      customStatusId: customStatusId || null,
      priority,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      links,
    }

    updateTodo(todo.id, {
      ...updates,
      startDate: updates.startDate,
      dueDate: updates.dueDate,
    })

    const actionId = `todo-detail-${todo.id}-${Date.now()}`
    undoManager.addAction({
      id: actionId,
      todoId: todo.id,
      previousStatus: previousTodo.status,
      previousCustomStatusId: previousTodo.customStatusId || null,
      newStatus: status,
      newCustomStatusId: customStatusId || null,
      timestamp: Date.now(),
      undo: async () => {
        updateTodo(todo.id, {
          title: previousTodo.title,
          description: previousTodo.description,
          status: previousTodo.status,
          customStatusId: previousTodo.customStatusId,
          priority: previousTodo.priority,
          startDate: previousTodo.startDate,
          dueDate: previousTodo.dueDate,
          links: previousTodo.links,
        })
        try {
          await fetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: previousTodo.title,
              description: previousTodo.description,
              status: previousTodo.status,
              customStatusId: previousTodo.customStatusId,
              priority: previousTodo.priority,
              startDate: previousTodo.startDate ? new Date(previousTodo.startDate).toISOString() : null,
              dueDate: previousTodo.dueDate ? new Date(previousTodo.dueDate).toISOString() : null,
              links: previousTodo.links,
            }),
          })
        } catch (error) {
          console.error("撤销更新失败:", error)
        }
      },
      redo: async () => {
        updateTodo(todo.id, updates)
        try {
          await fetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...updates,
              startDate: updates.startDate ? updates.startDate.toISOString() : null,
              dueDate: updates.dueDate ? updates.dueDate.toISOString() : null,
            }),
          })
        } catch (error) {
          console.error("重做更新失败:", error)
        }
      },
    })

    setIsSaving(true)
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          customStatusId: customStatusId || null,
          priority,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          links,
        }),
      })

      if (response.ok) {
        setInitialValues({
          title,
          description: description || "",
          status,
          customStatusId: customStatusId || null,
          priority,
          startDate,
          dueDate,
          links,
        })
        setHasChanges(false)

        const UNDO_TOAST_SECONDS = 5
        const UNDO_WINDOW_SECONDS = 30
        let countdown = UNDO_TOAST_SECONDS
        const toastRef = toast({
          title: "已保存",
          description: `${todo.title} 已更新，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
          action: (
            <ToastAction
              altText="撤销"
              onClick={async () => {
                const success = await undoManager.undo(actionId)
                if (success) {
                  toastRef.dismiss()
                  if (previousTodo) {
                    setTitle(previousTodo.title)
                    setDescription(previousTodo.description || "")
                    setStatus(previousTodo.status)
                    setCustomStatusId(previousTodo.customStatusId || null)
                    setPriority(previousTodo.priority)
                    setStartDate(
                      previousTodo.startDate
                        ? format(new Date(previousTodo.startDate), "yyyy-MM-dd'T'HH:mm")
                        : ""
                    )
                    setDueDate(
                      previousTodo.dueDate
                        ? format(new Date(previousTodo.dueDate), "yyyy-MM-dd'T'HH:mm")
                        : ""
                    )
                    setLinks(previousTodo.links || [])
                  }
                } else {
                  toast({
                    title: "撤销失败",
                    variant: "destructive",
                  })
                }
              }}
            >
              撤销
            </ToastAction>
          ),
          duration: UNDO_TOAST_SECONDS * 1000,
        })

        const countdownInterval = setInterval(() => {
          countdown -= 1
          if (countdown <= 0) {
            clearInterval(countdownInterval)
            toastRef.dismiss()
          } else {
            toastRef.update({
              description: `${todo.title} 已更新，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
            })
          }
        }, 1000)

        // 显示成功通知
        showSuccess("保存成功", `${todo.title} 已更新`)

        if (!isAutoSave) {
          onOpenChange(false)
        }
        onUpdate()
      } else {
        updateTodo(todo.id, {
          title: previousTodo.title,
          description: previousTodo.description,
          status: previousTodo.status,
          customStatusId: previousTodo.customStatusId,
          priority: previousTodo.priority,
          startDate: previousTodo.startDate,
          dueDate: previousTodo.dueDate,
          links: previousTodo.links,
        })
        const data = await response.json()
        showError("保存失败", data.error || "保存失败")
      }
    } catch (error) {
      console.error("保存失败:", error)
      updateTodo(todo.id, {
        title: previousTodo.title,
        description: previousTodo.description,
        status: previousTodo.status,
        customStatusId: previousTodo.customStatusId,
        priority: previousTodo.priority,
        startDate: previousTodo.startDate,
        dueDate: previousTodo.dueDate,
        links: previousTodo.links,
      })
      showError("保存失败", "保存失败，请稍后重试")
    } finally {
      setIsSaving(false)
    }
  }, [
    todo,
    title,
    description,
    status,
    customStatusId,
    priority,
    startDate,
    dueDate,
    links,
    initialValues,
    updateTodo,
    toast,
    onUpdate,
    onOpenChange,
    showError,
    showSuccess,
  ])

  const handleAddLink = () => {
    if (newLink.trim() && !links.includes(newLink.trim())) {
      try {
        new URL(newLink.trim())
        setLinks([...links, newLink.trim()])
        setNewLink("")
      } catch {
        showError("无效的 URL", "请输入有效的 URL")
      }
    }
  }

  const handleRemoveLink = (linkToRemove: string) => {
    setLinks(links.filter((link) => link !== linkToRemove))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!todo || !e.target.files?.[0]) return

    const file = e.target.files[0]
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/todos/${todo.id}/attachments`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setAttachments([...attachments, data])
        showSuccess("上传成功", "附件已上传")
        onUpdate()
      } else {
        const data = await response.json()
        showError("上传失败", data.error || "上传失败")
      }
    } catch (error) {
      console.error("上传失败:", error)
      showError("上传失败", "上传失败，请稍后重试")
    } finally {
      setIsLoading(false)
      e.target.value = ""
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!todo) return

    const confirmed = await confirm.confirm({
      title: "删除附件",
      message: "确定要删除这个附件吗？",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })
    if (!confirmed) return

    try {
      const response = await fetch(
        `/api/todos/${todo.id}/attachments?attachmentId=${attachmentId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        setAttachments(attachments.filter((att) => att.id !== attachmentId))
        showSuccess("删除成功", "附件已删除")
        onUpdate()
      } else {
        const data = await response.json()
        showError("删除失败", data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
      showError("删除失败", "删除失败，请稍后重试")
    }
  }

  const getStatusInfo = () => {
    if (customStatusId) {
      const customStatus = customStatuses.find((s) => s.id === customStatusId)
      return {
        label: customStatus?.name || "自定义状态",
        color: customStatus?.color || "#6b7280",
        icon: <Radio className="h-3 w-3" />,
      }
    }
    return statusConfig[status]
  }

  const handleStatusChange = (newStatus: TodoStatus, newCustomStatusId: string | null) => {
    setStatus(newStatus)
    setCustomStatusId(newCustomStatusId)
  }

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority)
  }

  const handleToggleTodayTask = async () => {
    if (!todo) return

    const todayStart = startOfDay(new Date())
    const tomorrowStart = startOfDay(addDays(todayStart, 1))
    const previousPinnedDate = todo.todayPinnedDate ? new Date(todo.todayPinnedDate) : null
    const previousDueDate = todo.dueDate ? new Date(todo.dueDate) : null
    const isCurrentlyToday = previousPinnedDate ? isSameDay(previousPinnedDate, todayStart) : false
    const shouldPinToday = !isCurrentlyToday
    const shouldAssignDefaultDueDate = shouldPinToday && !dueDate && !previousDueDate

    const optimisticDueDate = shouldAssignDefaultDueDate ? tomorrowStart : previousDueDate

    setIsTodayUpdating(true)
    updateTodo(todo.id, {
      todayPinnedDate: shouldPinToday ? todayStart : null,
      dueDate: optimisticDueDate ?? null,
    })

    if (shouldAssignDefaultDueDate) {
      setDueDate(format(tomorrowStart, "yyyy-MM-dd'T'HH:mm"))
    }

    const payload: Record<string, string | null> = {
      todayPinnedDate: shouldPinToday ? todayStart.toISOString() : null,
    }
    if (shouldAssignDefaultDueDate) {
      payload.dueDate = tomorrowStart.toISOString()
    }

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("更新今日任务失败")
      }

      showSuccess(
        shouldPinToday ? "已加入今日" : "已移出今日",
        shouldPinToday ? `${todo.title} 已加入今日任务` : `${todo.title} 已移出今日任务`
      )
    } catch (error) {
      console.error("更新今日任务失败:", error)
      updateTodo(todo.id, {
        todayPinnedDate: previousPinnedDate,
        dueDate: previousDueDate,
      })
      if (shouldAssignDefaultDueDate) {
        setDueDate("")
      }
      showError("更新失败", "今日任务状态更新失败，请稍后重试")
    } finally {
      setIsTodayUpdating(false)
    }
  }

  if (!todo) return null

  const statusInfo = getStatusInfo()
  const priorityInfo = priorityConfig[priority]
  const isReadOnly = Boolean(readOnly)
  const isTodayPinned = todo.todayPinnedDate
    ? isSameDay(new Date(todo.todayPinnedDate), new Date())
    : false

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 border-card-border">
        <VisuallyHidden>
          <SheetTitle>{title || "待办事项详情"}</SheetTitle>
        </VisuallyHidden>
        <div className="h-full flex flex-col bg-background">
          <div className="px-6 pt-6 pb-4 border-b border-card-border space-y-2">
            {isReadOnly && todo.archivedAt && (
              <p className="text-xs text-muted-foreground">
                归档时间：{format(todo.archivedAt, "yyyy/MM/dd HH:mm", { locale: zhCN })}
              </p>
            )}
            {isReadOnly ? (
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {todo.archivedReason || "无归档备注"}
                </p>
              </div>
            ) : (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入待办事项标题"
                className="text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-2 bg-transparent"
                autoComplete="off"
              />
            )}
          </div>

          <div className="px-6 py-4 border-b border-card-border">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">状态</span>
                {isReadOnly ? (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.icon}
                    {statusInfo.label}
                  </div>
                ) : (
                  <StatusSelectPopover
                    currentStatus={status}
                    customStatusId={customStatusId}
                    customStatuses={customStatuses}
                    onStatusChange={handleStatusChange}
                  >
                    <button
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-all duration-200 hover:scale-105"
                      )}
                      style={{
                        backgroundColor: statusInfo.color,
                      }}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </button>
                  </StatusSelectPopover>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">优先级</span>
                {isReadOnly ? (
                  <div
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: priorityInfo.color }}
                  >
                    {priorityInfo.label}
                  </div>
                ) : (
                  <PrioritySelectPopover
                    currentPriority={priority}
                    onPriorityChange={handlePriorityChange}
                  >
                    <button
                      className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:scale-105"
                      )}
                      style={{
                        backgroundColor: priorityInfo.color,
                      }}
                    >
                      {priorityInfo.label}
                    </button>
                  </PrioritySelectPopover>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">结束日期</span>
                {isReadOnly ? (
                  <span className="text-sm font-medium">
                    {dueDate
                      ? format(new Date(dueDate), "yyyy/MM/dd HH:mm", { locale: zhCN })
                      : "未设置"}
                  </span>
                ) : (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-sm font-medium hover:underline">
                          {dueDate
                            ? format(new Date(dueDate), "MM/dd/yyyy", { locale: zhCN })
                            : "未设置"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Input
                          type="datetime-local"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="border-none"
                          autoComplete="off"
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="end">
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              const tomorrow = new Date()
                              tomorrow.setDate(tomorrow.getDate() + 1)
                              setDueDate(format(tomorrow, "yyyy-MM-dd'T'HH:mm"))
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md"
                          >
                            明天
                          </button>
                          <button
                            onClick={() => {
                              const nextWeek = new Date()
                              nextWeek.setDate(nextWeek.getDate() + 7)
                              setDueDate(format(nextWeek, "yyyy-MM-dd'T'HH:mm"))
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md"
                          >
                            一周后
                          </button>
                          <button
                            onClick={() => setDueDate("")}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md text-destructive"
                          >
                            清除日期
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>

              {taskInfo && (
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">所属项目</span>
                  <div className="flex items-center gap-2">
                    {taskInfo.project && (
                      <span className="text-sm font-medium">{taskInfo.project.name}</span>
                    )}
                    {taskInfo.task && (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-sm font-medium">{taskInfo.task.title}</span>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (taskInfo.project) {
                          setCurrentProject(taskInfo.project.id)
                          onOpenChange(false)
                        }
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      查看
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">今日任务</span>
                {isReadOnly ? (
                  <span className="text-sm font-medium">
                    {isTodayPinned ? "已加入" : "未加入"}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={isTodayPinned ? "secondary" : "outline"}
                    onClick={handleToggleTodayTask}
                    disabled={isTodayUpdating}
                    className={cn(
                      "rounded-lg",
                      isTodayPinned
                        ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                        : "text-muted-foreground hover:text-amber-700"
                    )}
                  >
                    {isTodayUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isTodayPinned ? (
                      "移出今日"
                    ) : (
                      "加入今日"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">描述（备忘）</span>
              </div>
              {isReadOnly ? (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground whitespace-pre-line">
                  {description?.trim() ? description : "暂无描述"}
                </div>
              ) : (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="添加描述..."
                  rows={6}
                  className="resize-none"
                />
              )}
            </div>

            {startDate && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">开始日期</span>
                </div>
                {isReadOnly ? (
                  <p className="text-sm font-medium">
                    {format(new Date(startDate), "yyyy/MM/dd HH:mm", { locale: zhCN })}
                  </p>
                ) : (
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    autoComplete="off"
                  />
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">附加链接</span>
                </div>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const url = await prompt.prompt({
                        title: "添加链接",
                        message: "请输入链接 URL",
                        type: "url",
                        placeholder: "https://example.com",
                        confirmText: "添加",
                        cancelText: "取消",
                      })
                      if (url && !links.includes(url)) {
                        setLinks([...links, url])
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加链接
                  </Button>
                )}
              </div>
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate"
                        >
                          {link}
                        </a>
                      </div>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLink(link)}
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">附件</span>
                </div>
                {!isReadOnly && (
                  <label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      asChild
                      disabled={isLoading}
                    >
                      <span>
                        <Plus className="h-4 w-4 mr-1" />
                        {isLoading ? "上传中..." : "添加附件"}
                      </span>
                    </Button>
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-background rounded">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.size 
                              ? `${(attachment.size / 1024).toFixed(1)} KB`
                              : '未知大小'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          查看
                        </a>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
