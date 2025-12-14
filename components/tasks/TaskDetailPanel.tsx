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
import { Task, TaskStatus, Priority, Attachment, useTaskStore } from "@/store/taskStore"
import { ProjectCustomStatus } from "@/store/projectStore"
import {
  X,
  Plus,
  Trash2,
  Clock,
  Flag,
  Calendar,
  MoreVertical,
  Check,
  FileText,
  Loader2,
  Circle,
  Radio,
  CheckCircle,
} from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { undoManager } from "@/lib/undoManager"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useNotification } from "@/components/ui/notification"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { usePrompt } from "@/components/ui/prompt-dialog"
import { cn } from "@/lib/utils"
import { TaskTodoList } from "./TaskTodoList"

interface TaskDetailPanelProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
  readOnly?: boolean
}

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  TODO: { label: "待办", color: "#6b7280", icon: <Circle className="h-3 w-3" /> },
  IN_PROGRESS: { label: "进行中", color: "#2563eb", icon: <Radio className="h-3 w-3" /> },
  COMPLETE: { label: "已完成", color: "#10b981", icon: <CheckCircle className="h-3 w-3" /> },
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: "低", color: "#10b981" },
  MEDIUM: { label: "中", color: "#2563eb" },
  HIGH: { label: "高", color: "#f97316" },
  URGENT: { label: "紧急", color: "#ef4444" },
}

export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  onUpdate,
  readOnly = false,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>("TODO")
  const [customStatusId, setCustomStatusId] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority>("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [customStatuses, setCustomStatuses] = useState<ProjectCustomStatus[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [initialValues, setInitialValues] = useState<{
    title: string
    description: string
    status: TaskStatus
    customStatusId: string | null
    priority: Priority
    dueDate: string
    tags: string[]
  } | null>(null)
  const { updateTask } = useTaskStore()
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
    if (task && open) {
      fetchTaskDetails(task.id)
    }
  }, [task?.id, open])

  const fetchTaskDetails = async (taskId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const fullTask = await response.json()
        const initial = {
          title: fullTask.title,
          description: fullTask.description || "",
          status: fullTask.status,
          customStatusId: fullTask.customStatusId || null,
          priority: fullTask.priority,
          dueDate: fullTask.dueDate
            ? format(new Date(fullTask.dueDate), "yyyy-MM-dd'T'HH:mm")
            : "",
          tags: fullTask.tags || [],
        }
        setInitialValues(initial)
        setTitle(initial.title)
        setDescription(initial.description)
        setStatus(initial.status)
        setCustomStatusId(initial.customStatusId)
        setPriority(initial.priority)
        setDueDate(initial.dueDate)
        setTags(initial.tags)
        setAttachments(fullTask.attachments || [])
        setHasChanges(false)
        if (fullTask.todos) {
          updateTask(taskId, { todos: fullTask.todos })
        }
      }
    } catch (error) {
      if (task) {
        const initial = {
          title: task.title,
          description: task.description || "",
          status: task.status,
          customStatusId: task.customStatusId || null,
          priority: task.priority,
          dueDate: task.dueDate
            ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm")
            : "",
          tags: task.tags || [],
        }
        setInitialValues(initial)
        setTitle(initial.title)
        setDescription(initial.description)
        setStatus(initial.status)
        setCustomStatusId(initial.customStatusId)
        setPriority(initial.priority)
        setDueDate(initial.dueDate)
        setTags(initial.tags)
        setAttachments(task.attachments || [])
        setHasChanges(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!task || !initialValues) {
      setHasChanges(false)
      return
    }

    const current = {
      title,
      description: description || "",
      status,
      customStatusId: customStatusId || null,
      priority,
      dueDate,
      tags,
    }

    const changed =
      current.title !== initialValues.title ||
      current.description !== initialValues.description ||
      current.status !== initialValues.status ||
      current.customStatusId !== initialValues.customStatusId ||
      current.priority !== initialValues.priority ||
      current.dueDate !== initialValues.dueDate ||
      JSON.stringify(current.tags) !== JSON.stringify(initialValues.tags)

    setHasChanges(changed)
    hasChangesRef.current = changed
  }, [title, description, status, customStatusId, priority, dueDate, tags, task, initialValues])

  useEffect(() => {
    if (!open && hasChangesRef.current && task && !isClosingRef.current) {
      isClosingRef.current = true
      handleSaveInternal(true)
    }
  }, [open, task])

  const fetchCustomStatuses = async () => {
    try {
      const response = await fetch("/api/project-custom-statuses")
      if (response.ok) {
        const data = await response.json()
        setCustomStatuses(data)
      }
    } catch (error) {
      console.error("获取自定义状态失败:", error)
    }
  }

  const handleSaveInternal = useCallback(async (isAutoSave = false) => {
    if (!task || !initialValues) return

    const previousTask = { ...task }

    const updates = {
      title,
      description: description || null,
      status,
      customStatusId: customStatusId || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags,
    }

    updateTask(task.id, updates)

    const actionId = `task-detail-${task.id}-${Date.now()}`
    undoManager.addAction({
      id: actionId,
      todoId: task.id,
      previousStatus: previousTask.status,
      previousCustomStatusId: previousTask.customStatusId || null,
      newStatus: status,
      newCustomStatusId: customStatusId || null,
      timestamp: Date.now(),
      undo: async () => {
        updateTask(task.id, {
          title: previousTask.title,
          description: previousTask.description,
          status: previousTask.status,
          customStatusId: previousTask.customStatusId,
          priority: previousTask.priority,
          dueDate: previousTask.dueDate,
          tags: previousTask.tags,
        })
        try {
          await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: previousTask.title,
              description: previousTask.description,
              status: previousTask.status,
              customStatusId: previousTask.customStatusId,
              priority: previousTask.priority,
              dueDate: previousTask.dueDate ? new Date(previousTask.dueDate).toISOString() : null,
              tags: previousTask.tags,
            }),
          })
        } catch (error) {
          console.error("撤销更新失败:", error)
        }
      },
      redo: async () => {
        updateTask(task.id, updates)
        try {
          await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...updates,
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
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          customStatusId: customStatusId || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          tags,
        }),
      })

      if (response.ok) {
        setInitialValues({
          title,
          description: description || "",
          status,
          customStatusId: customStatusId || null,
          priority,
          dueDate,
          tags,
        })
        setHasChanges(false)

        const UNDO_TOAST_SECONDS = 5
        const UNDO_WINDOW_SECONDS = 30
        let countdown = UNDO_TOAST_SECONDS
        const toastRef = toast({
          title: "已保存",
          description: `${task.title} 已更新，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
          action: (
            <ToastAction
              altText="撤销"
              onClick={async () => {
                const success = await undoManager.undo(actionId)
                if (success) {
                  toastRef.dismiss()
                  if (previousTask) {
                    setTitle(previousTask.title)
                    setDescription(previousTask.description || "")
                    setStatus(previousTask.status)
                    setCustomStatusId(previousTask.customStatusId || null)
                    setPriority(previousTask.priority)
                    setDueDate(
                      previousTask.dueDate
                        ? format(new Date(previousTask.dueDate), "yyyy-MM-dd'T'HH:mm")
                        : ""
                    )
                    setTags(previousTask.tags || [])
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
        })

        const countdownInterval = setInterval(() => {
          countdown -= 1
          if (countdown <= 0) {
            clearInterval(countdownInterval)
            toastRef.dismiss()
          }
        }, 1000)

        if (!isAutoSave) {
          showSuccess("已保存", `${task.title} 已更新`)
        }
        onUpdate()
      } else {
        const error = await response.json()
        showError("保存失败", error.error || "保存失败")
        // 回滚
        updateTask(task.id, {
          title: previousTask.title,
          description: previousTask.description,
          status: previousTask.status,
          customStatusId: previousTask.customStatusId,
          priority: previousTask.priority,
          dueDate: previousTask.dueDate,
          tags: previousTask.tags,
        })
      }
    } catch (error) {
      console.error("保存失败:", error)
      showError("保存失败", "保存失败，请稍后重试")
      // 回滚
      updateTask(task.id, {
        title: previousTask.title,
        description: previousTask.description,
        status: previousTask.status,
        customStatusId: previousTask.customStatusId,
        priority: previousTask.priority,
        dueDate: previousTask.dueDate,
        tags: previousTask.tags,
      })
    } finally {
      setIsSaving(false)
    }
  }, [task, title, description, status, customStatusId, priority, dueDate, tags, initialValues, updateTask, toast, showSuccess, showError, onUpdate])

  const handleDelete = async () => {
    if (!task) return

    const confirmed = await confirm.confirm({
      title: "删除任务",
      message: "确定要删除这个任务吗？所有子任务也将被删除。",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        showSuccess("删除成功", `${task.title} 已删除`)
        onOpenChange(false)
        onUpdate()
      } else {
        const data = await response.json()
        showError("删除失败", data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
      showError("删除失败", "删除失败，请稍后重试")
    } finally {
      setIsLoading(false)
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

  const handleStatusChange = (newStatus: TaskStatus, newCustomStatusId: string | null) => {
    setStatus(newStatus)
    setCustomStatusId(newCustomStatusId)
  }

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority)
  }

  const handleAddTag = async () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return
    setTags([...tags, newTag.trim()])
    setNewTag("")
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  if (!task) return null

  const statusInfo = getStatusInfo()
  const priorityInfo = priorityConfig[priority]
  const isReadOnly = Boolean(readOnly)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 border-card-border">
        <VisuallyHidden>
          <SheetTitle>{title || "任务详情"}</SheetTitle>
        </VisuallyHidden>
        <div className="h-full flex flex-col bg-background">
          {/* 顶部标题区域 */}
          <div className="px-6 pt-6 pb-4 border-b border-card-border space-y-2">
            {isReadOnly ? (
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
              </div>
            ) : (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入任务标题"
                className="text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-2 bg-transparent"
                autoComplete="off"
              />
            )}
          </div>

          {/* 属性区域：状态、优先级、截止日期 */}
          <div className="px-6 py-4 border-b border-card-border">
            <div className="flex items-center gap-6 flex-wrap">
              {/* 状态 */}
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
                  <TaskStatusSelectPopover
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
                  </TaskStatusSelectPopover>
                )}
              </div>

              {/* 优先级 */}
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
                  <TaskPrioritySelectPopover
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
                  </TaskPrioritySelectPopover>
                )}
              </div>

              {/* 截止日期 */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">截止日期</span>
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
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* 描述 */}
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

            {/* 标签 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">标签</span>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      placeholder="输入标签，按 Enter 添加"
                      className="h-8 w-32 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <div
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      {tag}
                      {!isReadOnly && (
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 子任务（Todo）列表 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">子任务</span>
              </div>
              <TaskTodoList
                taskId={task.id}
                todos={task.todos || []}
                onUpdate={onUpdate}
              />
            </div>
          </div>

          {/* 底部操作栏 */}
          {!isReadOnly && (
            <div className="px-6 py-4 border-t border-card-border flex items-center justify-between">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除任务
              </Button>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-xs text-muted-foreground">
                    {isSaving ? "保存中..." : "未保存的更改"}
                  </span>
                )}
                <Button
                  onClick={() => {
                    isClosingRef.current = true
                    onOpenChange(false)
                  }}
                  variant="outline"
                >
                  关闭
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Task状态选择Popover组件
function TaskStatusSelectPopover({
  currentStatus,
  customStatusId,
  customStatuses,
  onStatusChange,
  children,
}: {
  currentStatus: TaskStatus
  customStatusId: string | null
  customStatuses: ProjectCustomStatus[]
  onStatusChange: (status: TaskStatus, customStatusId: string | null) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const handleStatusSelect = (status: TaskStatus, customId: string | null = null) => {
    onStatusChange(status, customId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">基础状态</div>
          {Object.entries(statusConfig).map(([status, config]) => (
            <button
              key={status}
              onClick={() => handleStatusSelect(status as TaskStatus, null)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                currentStatus === status && !customStatusId && "bg-accent"
              )}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.label}
              {currentStatus === status && !customStatusId && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </button>
          ))}
          {customStatuses.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                自定义状态
              </div>
              {customStatuses.map((customStatus) => (
                <button
                  key={customStatus.id}
                  onClick={() => handleStatusSelect(currentStatus, customStatus.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                    customStatusId === customStatus.id && "bg-accent"
                  )}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: customStatus.color || "#6b7280" }}
                  />
                  {customStatus.name}
                  {customStatusId === customStatus.id && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Task优先级选择Popover组件
function TaskPrioritySelectPopover({
  currentPriority,
  onPriorityChange,
  children,
}: {
  currentPriority: Priority
  onPriorityChange: (priority: Priority) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const handlePrioritySelect = (priority: Priority) => {
    onPriorityChange(priority)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {Object.entries(priorityConfig).map(([priority, config]) => (
            <button
              key={priority}
              onClick={() => handlePrioritySelect(priority as Priority)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                currentPriority === priority && "bg-accent"
              )}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.label}
              {currentPriority === priority && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

