"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { TaskList, Task } from "@/store/taskStore"
import { TaskCard } from "./TaskCard"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, Circle, Loader2, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditTaskListDialog } from "./EditTaskListDialog"
import { useState } from "react"

interface TaskListColumnProps {
  list: TaskList
  onCreateTask: () => void
  onUpdate: () => void
  onTaskClick?: (task: Task) => void
}

export function TaskListColumn({ list, onCreateTask, onUpdate, onTaskClick }: TaskListColumnProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
  })

  const taskIds = list.tasks.map((task) => task.id)

  // 根据列表名称确定状态图标和颜色
  const getStatusConfig = (name: string) => {
    const upperName = name.toUpperCase()
    if (upperName.includes("TODO") || upperName.includes("待办")) {
      return {
        icon: Circle,
        color: "#6b7280", // gray-500
        iconColor: "#6b7280",
      }
    } else if (upperName.includes("IN PROGRESS") || upperName.includes("进行中")) {
      return {
        icon: Loader2,
        color: "#2563eb", // blue-600
        iconColor: "#2563eb",
        animated: true,
      }
    } else if (upperName.includes("COMPLETE") || upperName.includes("完成")) {
      return {
        icon: CheckCircle,
        color: "#10b981", // emerald-500
        iconColor: "#10b981",
      }
    }
    return {
      icon: Circle,
      color: list.color || "#6b7280",
      iconColor: list.color || "#6b7280",
    }
  }

  const statusConfig = getStatusConfig(list.name)
  const StatusIcon = statusConfig.icon
  const columnColor = list.color || statusConfig.color
  const isAnimated = (statusConfig as any).animated || false

  return (
    <Card className="w-80 flex-shrink-0 h-fit bg-card border-border">
      <CardHeader
        className="pb-3 px-4 pt-4"
        style={{
          backgroundColor: `${statusConfig.color}15`,
          borderBottom: `1px solid hsl(var(--border))`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StatusIcon
              className={`h-4 w-4 ${isAnimated ? "animate-spin" : ""}`}
              style={{ color: statusConfig.iconColor }}
            />
            <CardTitle className="text-base font-medium">{list.name}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {list.tasks.length}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                编辑列表
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={`p-3 space-y-2 transition-colors ${
              isOver ? "bg-accent/50" : ""
            }`}
          >
            {list.tasks.length === 0 ? (
              <>
                <div className="text-center py-8 text-sm text-muted-foreground">
                  没有任务
                </div>
                <div className="px-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm font-normal hover:bg-accent/50"
                    style={{
                      color: statusConfig.color,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${statusConfig.color}20`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                    onClick={onCreateTask}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </>
            ) : (
              <>
                {list.tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onUpdate={onUpdate}
                    onTaskClick={onTaskClick}
                  />
                ))}
                <div className="px-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm font-normal hover:bg-accent/50"
                    style={{
                      color: statusConfig.color,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${statusConfig.color}20`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                    onClick={onCreateTask}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </>
            )}
          </div>
        </SortableContext>
      </CardContent>

      <EditTaskListDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        taskListId={list.id}
        onSuccess={onUpdate}
      />
    </Card>
  )
}

