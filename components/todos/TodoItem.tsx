"use client"

import { Todo, TodoStatus } from "@/store/todoStore"
import { Button } from "@/components/ui/button"
import {
  Trash2,
  Circle,
  Radio,
  CheckCircle,
  Clock,
  CheckSquare,
  Square,
  Archive,
  Sun,
  Loader2,
} from "lucide-react"
import { useTodoStore } from "@/store/todoStore"
import { useState, useEffect } from "react"
import { TodoDetailPanel } from "./TodoDetailPanel"
import { StatusSelectPopover } from "./StatusSelectPopover"
import { PrioritySelectPopover } from "./PrioritySelectPopover"
import { cn } from "@/lib/utils"
import { undoManager } from "@/lib/undoManager"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useNotification } from "@/components/ui/notification"
import { useProjectStore } from "@/store/projectStore"
import { useTaskStore } from "@/store/taskStore"
import { FolderKanban, ExternalLink } from "lucide-react"
import {
  format,
  differenceInHours,
  differenceInDays,
  isToday,
  isTomorrow,
  addDays,
  isAfter,
  startOfDay,
  isSameDay,
} from "date-fns"
import { zhCN } from "date-fns/locale"
import { motion } from "framer-motion"

interface TodoItemProps {
  todo: Todo
  onUpdate: () => void
  customStatuses: Array<{ id: string; name: string; color?: string | null; position: number }>
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isSelected?: boolean
  onSelect?: (todoId: string, isMultiSelect: boolean, event?: React.MouseEvent) => void
  onArchive?: (todoId: string) => void
}

const statusConfig: Record<TodoStatus, { label: string; color: string }> = {
  WAIT: { label: "等待中", color: "#6b7280" },
  IN_PROGRESS: { label: "进行中", color: "#2563eb" },
  COMPLETE: { label: "已完成", color: "#10b981" },
}

const toDateValue = (value?: Date | string | null) => {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

const UNDO_TOAST_SECONDS = 5
const UNDO_WINDOW_SECONDS = 30

export function TodoItem({ todo, onUpdate, customStatuses, dragHandleProps, isSelected = false, onSelect, onArchive }: TodoItemProps) {
  const { deleteTodo, updateStatus, updateTodo } = useTodoStore()
  const { projects, setCurrentProject } = useProjectStore()
  const { taskLists } = useTaskStore()
  const confirm = useConfirm()
  const { showSuccess, showError } = useNotification()
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [taskInfo, setTaskInfo] = useState<{ task: any; project: any } | null>(null)
  const [statusColor, setStatusColor] = useState<string>(() => {
    if (todo.customStatusId) {
      const customStatus = customStatuses.find((cs) => cs.id === todo.customStatusId)
      return customStatus?.color || "#6b7280"
    }
    return statusConfig[todo.status].color
  })
  const { toast } = useToast()
  const [isUpdatingToday, setIsUpdatingToday] = useState(false)
  const pinnedDate = toDateValue(todo.todayPinnedDate ?? null)
  const isTodayPinned = pinnedDate ? isSameDay(pinnedDate, new Date()) : false
  const dueDateValue = toDateValue(todo.dueDate ?? null)
  const isDueToday = dueDateValue ? isToday(dueDateValue) : false

  // 获取Task和Project信息
  useEffect(() => {
    if (todo.taskId) {
      // 在所有TaskList中查找Task
      const task = taskLists
        .flatMap((list) => list.tasks)
        .find((t) => t.id === todo.taskId)

      if (task) {
        // 查找Task所属的Project
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
  }, [todo.taskId, taskLists, projects])

  // 处理跳转到Task
  const handleViewTask = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (taskInfo?.project) {
      setCurrentProject(taskInfo.project.id)
    }
  }

  // 同步状态颜色
  useEffect(() => {
    const newColor = todo.customStatusId
      ? customStatuses.find((cs) => cs.id === todo.customStatusId)?.color || "#6b7280"
      : statusConfig[todo.status].color
    if (statusColor !== newColor) {
      setStatusColor(newColor)
    }
  }, [todo.status, todo.customStatusId, customStatuses, statusColor])

  const handleStatusChange = async (status: TodoStatus, customStatusId: string | null) => {
    const previousStatus = todo.status
    const previousCustomStatusId = todo.customStatusId || null
    const newColor = customStatusId
      ? customStatuses.find((cs) => cs.id === customStatusId)?.color || "#6b7280"
      : statusConfig[status].color

    setStatusColor(newColor)

    updateStatus(todo.id, status, customStatusId)

    // 创建撤销操作
    const actionId = `todo-${todo.id}-${Date.now()}`
    undoManager.addAction({
      id: actionId,
      todoId: todo.id,
      previousStatus,
      previousCustomStatusId,
      newStatus: status,
      newCustomStatusId: customStatusId,
      timestamp: Date.now(),
      undo: async () => {
        updateStatus(todo.id, previousStatus, previousCustomStatusId)
        // 调用API恢复
        try {
          await fetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: previousStatus,
              customStatusId: previousCustomStatusId,
            }),
          })
        } catch (error) {
          console.error("撤销更新失败:", error)
        }
      },
      redo: async () => {
        // 重做：应用新状态
        updateStatus(todo.id, status, customStatusId)
        try {
          await fetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, customStatusId }),
          })
        } catch (error) {
          console.error("重做更新失败:", error)
        }
      },
    })

    // 显示撤销Toast
    const statusLabels: Record<TodoStatus, string> = {
      WAIT: "等待中",
      IN_PROGRESS: "进行中",
      COMPLETE: "已完成",
    }
    const customStatusName = customStatuses.find((cs) => cs.id === customStatusId)?.name
    const statusName = customStatusName || statusLabels[status]

    let countdown = UNDO_TOAST_SECONDS
    const toastRef = toast({
      title: "状态已更改",
      description: `${todo.title} 已更新为 ${statusName}，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
      action: (
        <ToastAction
          altText="撤销"
          onClick={async () => {
            const success = await undoManager.undo(actionId)
            if (success) {
              toastRef.dismiss()
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

    // 倒计时更新
    const countdownInterval = setInterval(() => {
      countdown -= 1
      if (countdown > 0) {
        toastRef.update({
          id: toastRef.id,
          description: `${todo.title} 已更新为 ${statusName}，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
        })
      } else {
        clearInterval(countdownInterval)
        toastRef.dismiss() // 倒计时结束时自动关闭Toast
      }
    }, 1000)

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, customStatusId }),
      })

      if (!response.ok) {
        // API失败，回滚
        updateStatus(todo.id, previousStatus, previousCustomStatusId)
        clearInterval(countdownInterval)
        toastRef.dismiss()
        toast({
          title: "更新失败",
          description: "状态更新失败，已自动恢复",
          variant: "destructive",
        })
        showError("状态更新失败", "服务器处理失败，请稍后再试")
      } else {
        showSuccess("状态已更新", `${todo.title} 已更新为 ${statusName}`)
        // 成功，倒计时会自动处理关闭
      }
    } catch (error) {
      console.error("更新状态失败:", error)
      // 网络错误，回滚
      updateStatus(todo.id, previousStatus, previousCustomStatusId)
      clearInterval(countdownInterval)
      toastRef.dismiss()
      toast({
        title: "更新失败",
        description: "网络错误，已自动恢复",
        variant: "destructive",
      })
      showError("状态更新失败", "网络异常，请稍后再试")
    }
  }

  const handlePriorityChange = async (priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT") => {
    // 保存原优先级用于撤销
    const previousPriority = todo.priority

    // 乐观更新：立即更新UI
    updateTodo(todo.id, { priority })

    // 创建撤销操作
    const actionId = `todo-priority-${todo.id}-${Date.now()}`
    undoManager.addAction({
      id: actionId,
      todoId: todo.id,
      previousPriority,
      newPriority: priority,
      timestamp: Date.now(),
      undo: async () => {
        // 撤销：恢复原优先级
        updateTodo(todo.id, { priority: previousPriority })
        try {
          await fetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority: previousPriority }),
          })
        } catch (error) {
          console.error("撤销更新失败:", error)
        }
      },
      redo: async () => {
        // 重做：应用新优先级
        updateTodo(todo.id, { priority })
        try {
          await fetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority }),
          })
        } catch (error) {
          console.error("重做更新失败:", error)
        }
      },
    })

    // 显示撤销Toast
    const priorityLabels: Record<typeof priority, string> = {
      LOW: "低",
      MEDIUM: "中",
      HIGH: "高",
      URGENT: "紧急",
    }

    let countdown = UNDO_TOAST_SECONDS
    const toastRef = toast({
      title: "优先级已更改",
      description: `${todo.title} 优先级已更新为 ${priorityLabels[priority]}，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
      action: (
        <ToastAction
          altText="撤销"
          onClick={async () => {
            const success = await undoManager.undo(actionId)
            if (success) {
              toastRef.dismiss()
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

    // 倒计时更新
    const countdownInterval = setInterval(() => {
      countdown -= 1
      if (countdown > 0) {
        toastRef.update({
          id: toastRef.id,
          description: `${todo.title} 优先级已更新为 ${priorityLabels[priority]}，${countdown} 秒内可点击撤销（Ctrl/Cmd + Z 可在 ${UNDO_WINDOW_SECONDS} 秒内撤销）`,
        })
      } else {
        clearInterval(countdownInterval)
        toastRef.dismiss()
      }
    }, 1000)

    // 后台调用API
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      })

      if (response.ok) {
        // API成功，关闭撤销 toast，显示成功通知
        clearInterval(countdownInterval)
        toastRef.dismiss()
        showSuccess("优先级已更新", `${todo.title} 优先级已更新为 ${priorityLabels[priority]}`)
      } else {
        // API失败，回滚
        updateTodo(todo.id, { priority: previousPriority })
        clearInterval(countdownInterval)
        toastRef.dismiss()
        toast({
          title: "更新失败",
          description: "优先级更新失败，已恢复原值",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("更新优先级失败:", error)
      // 网络错误，回滚
      updateTodo(todo.id, { priority: previousPriority })
      clearInterval(countdownInterval)
      toastRef.dismiss()
      toast({
        title: "更新失败",
        description: "网络错误，已恢复原值",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm.confirm({
      title: "删除待办事项",
      message: "确定要删除这个待办事项吗？",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        deleteTodo(todo.id)
        onUpdate()
        showSuccess("删除成功", "待办事项已删除")
      } else {
        const data = await response.json()
        throw new Error(data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
      const errorMessage = error instanceof Error ? error.message : "删除失败，请稍后重试"
      showError("删除失败", errorMessage)
    }
  }

  const confirmArchiveIfNeeded = async () => {
    if (todo.status === "COMPLETE") {
      return true
    }
    return await confirm.confirm({
      title: "归档未完成的待办",
      message: "该待办尚未完成，立即归档会被记录到未完成归档箱。如非特殊需求，建议等待自动归档。是否继续？",
      variant: "default",
      confirmText: "继续归档",
      cancelText: "取消",
    })
  }

  const handleQuickArchive = async (event: React.MouseEvent) => {
    event.stopPropagation()
    const allowed = await confirmArchiveIfNeeded()
    if (!allowed) return

    try {
      const response = await fetch("/api/todos/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoIds: [todo.id] }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "归档失败")
      }

      deleteTodo(todo.id)
      onArchive?.(todo.id)
      showSuccess("已归档", `${todo.title} 已移动到归档`)
    } catch (error) {
      console.error("归档失败:", error)
      showError(
        "归档失败",
        error instanceof Error ? error.message : "归档失败，请稍后重试"
      )
    }
  }

  const handleToggleToday = async (event: React.MouseEvent) => {
    event.stopPropagation()
    if (isUpdatingToday) return

    const shouldPinToday = !isTodayPinned
    const todayStart = startOfDay(new Date())
    const updates: Partial<Todo> = {}
    const payload: Record<string, string | null> = {}

    if (shouldPinToday) {
      updates.todayPinnedDate = todayStart
      payload.todayPinnedDate = todayStart.toISOString()

      if (!dueDateValue) {
        const defaultDueDate = startOfDay(addDays(todayStart, 1))
        updates.dueDate = defaultDueDate
        payload.dueDate = defaultDueDate.toISOString()
      }
    } else {
      updates.todayPinnedDate = null
      payload.todayPinnedDate = null
    }

    setIsUpdatingToday(true)
    updateTodo(todo.id, updates)

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
        shouldPinToday ? `${todo.title} 已加入今日任务` : `${todo.title} 已从今日任务移出`
      )
    } catch (error) {
      console.error("更新今日任务失败:", error)
      updateTodo(todo.id, {
        todayPinnedDate: pinnedDate,
        dueDate: dueDateValue,
      })
      showError("更新失败", "今日任务状态更新失败，请稍后重试")
    } finally {
      setIsUpdatingToday(false)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.checkbox-container')) {
      return
    }
    
    if (
      (e.target as HTMLElement).closest('.drag-handle') ||
      (e.target as HTMLElement).closest('.status-select') ||
      (e.target as HTMLElement).closest('.priority-select') ||
      (e.target as HTMLElement).closest('.delete-button')
    ) {
      return
    }

    if (e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      if (onSelect) {
        onSelect(todo.id, true, e)
      }
      return
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      if (onSelect) {
        onSelect(todo.id, true, e)
      }
      return
    }

    if (isSelected) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    setIsDetailOpen(true)
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(todo.id, false, e)
    }
  }

  return (
    <>
      <motion.div
        className={cn(
          "relative flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer group border border-transparent select-none",
          todo.status === "COMPLETE" && "opacity-60",
          isSelected && "bg-primary/10 border-primary/50 ring-2 ring-primary/20 shadow-md"
        )}
        onClick={handleClick}
        onMouseDown={(e) => {
          if (e.shiftKey) {
            e.preventDefault()
          }
          if ((e.target as HTMLElement).closest('.checkbox-container')) {
            e.stopPropagation()
          }
        }}
        whileHover={{ scale: 1.01, x: 2 }}
        whileTap={{ scale: 0.99 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 多选复选框 */}
        {onSelect && (
          <motion.div
            className="checkbox-container flex-shrink-0 cursor-pointer p-0.5 rounded-lg hover:bg-accent transition-all duration-200 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleCheckboxClick(e)
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{ pointerEvents: 'auto' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              initial={false}
              animate={{
                scale: isSelected ? [1, 1.2, 1] : 1,
                rotate: isSelected ? [0, 10, -10, 0] : 0,
              }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" />
              ) : (
                <Square className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-muted-foreground" />
              )}
            </motion.div>
          </motion.div>
        )}

        {/* 拖拽手柄 */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="drag-handle relative z-20 flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 hover:bg-accent rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 flex items-center justify-center touch-none select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-0.5 h-4 sm:h-5 bg-muted-foreground/30 rounded" />
          </div>
        )}
        {/* 状态选择圆圈按钮 */}
        <StatusSelectPopover
          currentStatus={todo.status}
          customStatusId={todo.customStatusId || null}
          customStatuses={customStatuses}
          onStatusChange={handleStatusChange}
        >
          <motion.button
            onClick={(e) => e.stopPropagation()}
            className="status-select relative z-20 flex-shrink-0 p-0.5 rounded-full hover:bg-accent transition-all duration-200 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div
              style={{
                color: statusColor,
                transition: "color 0.4s ease-in-out",
              }}
              className="flex items-center justify-center"
            >
              {(() => {
                // 根据状态显示对应的图标
                if (todo.customStatusId) {
                  return <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                }
                switch (todo.status) {
                  case "WAIT":
                    return <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  case "IN_PROGRESS":
                    return <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  case "COMPLETE":
                    return <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  default:
                    return <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                }
              })()}
            </div>
          </motion.button>
        </StatusSelectPopover>

        {/* Todo 标题 */}
        <div className="relative z-20 flex-1 min-w-0 flex flex-col justify-center">
          <h4
            className={cn(
              "font-medium text-[12px] sm:text-sm leading-tight truncate",
              todo.status === "COMPLETE" && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </h4>
          {taskInfo && (
            <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 hidden sm:flex">
              <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs text-muted-foreground">
                <FolderKanban className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                {taskInfo.project && (
                  <span className="truncate max-w-[60px] sm:max-w-[100px]">{taskInfo.project.name}</span>
                )}
                {taskInfo.task && (
                  <>
                    <span>/</span>
                    <span className="truncate max-w-[60px] sm:max-w-[100px]">{taskInfo.task.title}</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-3.5 w-3.5 sm:h-5 sm:w-5 p-0 flex items-center justify-center"
                onClick={handleViewTask}
              >
                <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* 优先级和截止日期 */}
        <div className="relative z-20 flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* 优先级徽章 */}
          <div className="priority-select flex items-center" onClick={(e) => e.stopPropagation()}>
            <PrioritySelectPopover
              currentPriority={todo.priority}
              onPriorityChange={(priority) => handlePriorityChange(priority)}
            >
              <motion.button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-200 focus:outline-none cursor-pointer leading-none",
                  todo.priority === "LOW" && "text-green-600 dark:text-green-500",
                  todo.priority === "MEDIUM" && "text-blue-600 dark:text-blue-500",
                  todo.priority === "HIGH" && "text-orange-600 dark:text-orange-500",
                  todo.priority === "URGENT" && "text-red-600 dark:text-red-500"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {todo.priority === "LOW" && "低"}
                {todo.priority === "MEDIUM" && "中"}
                {todo.priority === "HIGH" && "高"}
                {todo.priority === "URGENT" && "急"}
              </motion.button>
            </PrioritySelectPopover>
          </div>

          {/* 截止日期 */}
          {dueDateValue && (
            <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs text-muted-foreground">
              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>
                {(() => {
                  const dueDate = dueDateValue
                  const now = new Date()
                  const hours = differenceInHours(dueDate, now)
                  const days = differenceInDays(dueDate, now)

                  if (isToday(dueDate)) {
                    if (hours > 0) {
                      return `${hours}小时后`
                    } else if (hours === 0) {
                      return "即将到期"
                    } else {
                      return "已过期"
                    }
                  } else if (isTomorrow(dueDate)) {
                    return "明天"
                  } else if (isAfter(dueDate, addDays(now, 1)) && isAfter(dueDate, addDays(now, 2))) {
                    if (days === 2) {
                      return "后天"
                    } else if (days <= 7) {
                      return `${days}天后`
                    } else {
                      return format(dueDate, "M月d日", { locale: zhCN })
                    }
                  } else {
                    return format(dueDate, "M月d日", { locale: zhCN })
                  }
                })()}
              </span>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-transparent transition-transform duration-200 hover:scale-110 focus-visible:ring-amber-500 focus-visible:ring-offset-1 flex items-center justify-center p-0",
              isTodayPinned
                ? "text-amber-600"
                : "text-muted-foreground hover:text-amber-600"
            )}
            onClick={handleToggleToday}
            disabled={isUpdatingToday}
            title={isTodayPinned ? "移出今日" : "加入今日"}
            aria-label={isTodayPinned ? "移出今日" : "加入今日"}
          >
            {isUpdatingToday ? (
              <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
            ) : (
              <Sun className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            )}
          </Button>
        </div>

        {/* 快速归档 */}
        <motion.div
          className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleQuickArchive}
            className="h-5 w-5 sm:h-7 sm:w-7 rounded-lg text-emerald-600"
            title="快速归档"
            aria-label="快速归档"
          >
            <Archive className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
          </Button>
        </motion.div>

        {/* 删除按钮 */}
        <motion.div
          className="delete-button opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
              className="h-5 w-5 sm:h-7 sm:w-7 rounded-lg"
              title="删除待办"
              aria-label="删除待办"
          >
            <Trash2 className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
          </Button>
        </motion.div>
      </motion.div>

      <TodoDetailPanel
        todo={todo}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={() => {
          // 只在详情面板更新时才刷新列表
          onUpdate()
        }}
      />
    </>
  )
}

