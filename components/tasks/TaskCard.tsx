"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task } from "@/store/taskStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect } from "react"
import { EditTaskDialog } from "./EditTaskDialog"
import { TaskTodoList } from "./TaskTodoList"
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useConfirm } from "@/components/ui/confirm-dialog"

interface TaskCardProps {
  task: Task
  index: number
  onUpdate: () => void
  onTaskClick?: (task: Task) => void
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  MEDIUM: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

// 状态颜色配置
const statusColors = {
  TODO: { bg: "#6b7280", text: "#ffffff" }, // gray-500，对应WAIT
  IN_PROGRESS: { bg: "#2563eb", text: "#ffffff" }, // blue-600，对应IN_PROGRESS
  COMPLETE: { bg: "#10b981", text: "#ffffff" }, // emerald-500，对应COMPLETE
}

export function TaskCard({ task, index, onUpdate, onTaskClick }: TaskCardProps) {
  const confirm = useConfirm()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const scale = useMotionValue(1)
  const springScale = useSpring(scale, {
    stiffness: 300,
    damping: 30,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    scale: springScale,
  }

  useEffect(() => {
    if (isDragging) {
      scale.set(1.05)
    } else {
      scale.set(1)
    }
  }, [isDragging, scale])

  const customListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('.task-action-buttons')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      if (listeners?.onPointerDown) {
        return listeners.onPointerDown(e as any)
      }
    },
    onMouseDown: (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('.task-action-buttons')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      if (listeners?.onMouseDown) {
        return listeners.onMouseDown(e as any)
      }
    },
  }

  const handleDelete = async () => {
    const confirmed = await confirm.confirm({
      title: "删除任务",
      message: "确定要删除这个任务吗？",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })
    if (!confirmed) return

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      })
      onUpdate()
    } catch (error) {
      console.error("删除失败:", error)
    }
  }

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...customListeners}
        className={`cursor-move group ${
          isDragging ? "shadow-lg opacity-50 z-50" : ""
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) {
            return
          }
          onTaskClick?.(task)
        }}
      >
        <Card className="bg-card border-border hover:bg-accent/50 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-normal text-sm flex-1 leading-relaxed">{task.title}</h4>
            <div className="task-action-buttons flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditOpen(true)
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {task.todos && task.todos.length > 0 && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    展开 ({task.todos.length})
                  </>
                )}
              </Button>
              <AnimatePresence>
                {isExpanded && task.todos && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2"
                  >
                    <TaskTodoList
                      taskId={task.id}
                      todos={task.todos}
                      onUpdate={onUpdate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>

      <EditTaskDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        onSuccess={onUpdate}
      />
    </>
  )
}

