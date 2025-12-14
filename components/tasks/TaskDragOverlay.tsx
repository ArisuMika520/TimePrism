"use client"

import { motion } from "framer-motion"
import { Task } from "@/store/taskStore"
import { Card, CardContent } from "@/components/ui/card"
import { Circle, Radio, CheckCircle } from "lucide-react"

interface TaskDragOverlayProps {
  task: Task | null
}

export function TaskDragOverlay({ task }: TaskDragOverlayProps) {
  if (!task) return null

  const getStatusIcon = () => {
    switch (task.status) {
      case "TODO":
        return <Circle className="h-4 w-4" />
      case "IN_PROGRESS":
        return <Radio className="h-4 w-4" />
      case "COMPLETE":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (task.status) {
      case "TODO":
        return "#6b7280"
      case "IN_PROGRESS":
        return "#2563eb"
      case "COMPLETE":
        return "#10b981"
      default:
        return "#6b7280"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="fixed pointer-events-none z-50"
      style={{
        transform: "translate3d(0, 0, 0)",
      }}
    >
      <Card
        className="bg-background/95 backdrop-blur-sm shadow-2xl ring-2 ring-primary/20 border-2 border-primary/50"
        style={{ width: "320px" }}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div style={{ color: getStatusColor() }}>
              {getStatusIcon()}
            </div>
            <h4 className="font-normal text-sm flex-1 leading-relaxed">{task.title}</h4>
            {task.todos && task.todos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {task.todos.length} 子任务
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

