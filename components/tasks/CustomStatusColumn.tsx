"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Task } from "@/store/taskStore"
import { ProjectCustomStatus } from "@/store/projectStore"
import { TaskCard } from "./TaskCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Circle } from "lucide-react"

interface CustomStatusColumnProps {
  customStatus: ProjectCustomStatus
  tasks: Task[]
  onUpdate: () => void
  onCreateTask?: () => void
  onTaskClick?: (task: Task) => void
}

export function CustomStatusColumn({
  customStatus,
  tasks,
  onUpdate,
  onCreateTask,
  onTaskClick,
}: CustomStatusColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `custom-status-${customStatus.id}`,
  })

  const taskIds = tasks.map((task) => task.id)
  const columnColor = customStatus.color || "#6b7280"

  return (
    <Card className="w-80 flex-shrink-0 h-fit bg-card border-border">
      <CardHeader
        className="pb-3 px-4 pt-4"
        style={{
          backgroundColor: `${columnColor}15`,
          borderBottom: `1px solid hsl(var(--border))`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <Circle
            className="h-4 w-4"
            style={{ color: columnColor }}
          />
          <CardTitle className="text-base font-medium">{customStatus.name}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {tasks.length}
          </span>
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
            {tasks.length === 0 ? (
              <>
                <div className="text-center py-8 text-sm text-muted-foreground">
                  没有任务
                </div>
                {/* Add Task按钮 - 没有任务时紧贴在上面 */}
                {onCreateTask && (
                  <div className="px-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal hover:bg-accent/50"
                      style={{
                        color: columnColor,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${columnColor}20`
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
                )}
              </>
            ) : (
              <>
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onUpdate={onUpdate}
                    onTaskClick={onTaskClick}
                  />
                ))}
                {/* Add Task按钮 - 在任务列表后面 */}
                {onCreateTask && (
                  <div className="px-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal hover:bg-accent/50"
                      style={{
                        color: columnColor,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${columnColor}20`
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
                )}
              </>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  )
}

