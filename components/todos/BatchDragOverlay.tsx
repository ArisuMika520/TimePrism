"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { motion, AnimatePresence } from "framer-motion"
import { Todo } from "@/store/todoStore"
import { cn } from "@/lib/utils"
import { Circle, Radio, CheckCircle, Clock } from "lucide-react"
import { format, differenceInHours, differenceInDays, isToday, isTomorrow, addDays, isAfter } from "date-fns"
import { zhCN } from "date-fns/locale"

interface BatchDragOverlayProps {
  todos: Todo[]
  activeId: string | null
  selectedIds?: Set<string>
}

const statusConfig: Record<string, { label: string; color: string }> = {
  WAIT: { label: "等待中", color: "#6b7280" },
  IN_PROGRESS: { label: "进行中", color: "#2563eb" },
  COMPLETE: { label: "已完成", color: "#10b981" },
}

const priorityColors: Record<string, string> = {
  LOW: "border-green-500 text-green-600 dark:text-green-400",
  MEDIUM: "border-blue-500 text-blue-600 dark:text-blue-400",
  HIGH: "border-orange-500 text-orange-600 dark:text-orange-400",
  URGENT: "border-red-500 text-red-600 dark:text-red-400",
}

const priorityLabels: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
}

function TodoPreview({ todo, index, total }: { todo: Todo; index: number; total: number }) {
  const statusColor = todo.customStatusId
    ? "#6b7280"
    : statusConfig[todo.status]?.color || "#6b7280"

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        rotate: index % 2 === 0 ? -1 : 1,
      }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg border-2 border-primary/50 bg-background/95 backdrop-blur-sm shadow-2xl",
        "ring-2 ring-primary/20",
        todo.status === "COMPLETE" && "opacity-60"
      )}
      style={{
        zIndex: total - index,
        transform: `translateY(${index * 4}px) translateX(${index % 2 === 0 ? -2 : 2}px) rotate(${index % 2 === 0 ? -1 : 1}deg)`,
      }}
    >
      <div
        className="flex-shrink-0"
        style={{ color: statusColor }}
      >
        {(() => {
          if (todo.customStatusId) {
            return <Radio className="h-4 w-4" />
          }
          switch (todo.status) {
            case "WAIT":
              return <Circle className="h-4 w-4" />
            case "IN_PROGRESS":
              return <Radio className="h-4 w-4" />
            case "COMPLETE":
              return <CheckCircle className="h-4 w-4" />
            default:
              return <Circle className="h-4 w-4" />
          }
        })()}
      </div>

      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            "font-medium text-sm truncate",
            todo.status === "COMPLETE" && "line-through text-muted-foreground"
          )}
        >
          {todo.title}
        </h4>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            priorityColors[todo.priority] || priorityColors.MEDIUM
          )}
        >
          {priorityLabels[todo.priority] || "中"}
        </div>

        {todo.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {(() => {
                const dueDate = new Date(todo.dueDate)
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
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 400 }}
        className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05 + 0.15 }}
          className="w-2 h-2 bg-white rounded-full"
        />
      </motion.div>
    </motion.div>
  )
}

export function BatchDragOverlay({ todos, activeId, selectedIds }: BatchDragOverlayProps) {
  if (!activeId || todos.length === 0) return null

  const activeTodo = todos.find((t) => t.id === activeId)
  if (!activeTodo) return null

  const selectedTodos = selectedIds && selectedIds.has(activeId)
    ? todos.filter((t) => selectedIds.has(t.id))
    : [activeTodo]

  if (selectedTodos.length === 1) {
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
        <TodoPreview todo={activeTodo} index={0} total={1} />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        rotate: [0, -2, 2, 0],
      }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        rotate: {
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse",
        },
      }}
      className="fixed pointer-events-none z-50"
      style={{
        transform: "translate3d(0, 0, 0)",
      }}
    >
      <div className="relative" style={{ width: "400px" }}>
        <AnimatePresence>
          {selectedTodos.map((todo, index) => (
            <motion.div
              key={todo.id}
              initial={{ 
                opacity: 0, 
                y: -20 - index * 10, 
                scale: 0.8,
                rotate: index % 2 === 0 ? -5 : 5,
                x: index % 2 === 0 ? -10 : 10,
              }}
              animate={{ 
                opacity: 1, 
                y: index * 6, 
                scale: 1 - index * 0.03,
                rotate: index % 2 === 0 ? -1 : 1,
                x: index % 2 === 0 ? -2 : 2,
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                y: -20,
                rotate: index % 2 === 0 ? -5 : 5,
              }}
              transition={{
                delay: index * 0.08,
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
              className="absolute w-full"
              style={{
                zIndex: selectedTodos.length - index,
              }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 10px 25px rgba(0, 0, 0, 0.2)",
                    "0 15px 35px rgba(0, 0, 0, 0.3)",
                    "0 10px 25px rgba(0, 0, 0, 0.2)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <TodoPreview todo={todo} index={index} total={selectedTodos.length} />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
          
        {selectedTodos.length > 1 && (
          <motion.div
            initial={{ scale: 0, rotate: -180, y: -20 }}
            animate={{ 
              scale: [1, 1.1, 1], // 合并 scale 属性，使用动画数组
              rotate: 0, 
              y: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              delay: selectedTodos.length * 0.08,
              scale: {
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse",
              },
            }}
            className="absolute -top-3 -right-3 z-[100] bg-primary text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold shadow-2xl ring-4 ring-primary/20"
          >
            {selectedTodos.length}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

