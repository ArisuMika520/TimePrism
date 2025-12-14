"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useTaskStore, TaskList, Task } from "@/store/taskStore"
import { useProjectStore, ProjectCustomStatus } from "@/store/projectStore"
import { TaskListColumn } from "./TaskListColumn"
import { CustomStatusColumn } from "./CustomStatusColumn"
import { ProjectList } from "./ProjectList"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import { CreateTaskListDialog } from "./CreateTaskListDialog"
import { CreateTaskDialog } from "./CreateTaskDialog"
import { CreateProjectDialog } from "./CreateProjectDialog"
import { EditProjectDialog } from "./EditProjectDialog"
import { TaskDetailPanel } from "./TaskDetailPanel"
import { TaskDragOverlay } from "./TaskDragOverlay"
import { useToast } from "@/hooks/use-toast"

type ViewMode = "projects" | "board"

export function BoardView() {
  const { taskLists, setTaskLists, moveTask, isLoading, setLoading } = useTaskStore()
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProject,
    getCurrentProject,
    isLoading: isProjectsLoading,
    setLoading: setProjectsLoading,
  } = useProjectStore()
  const [viewMode, setViewMode] = useState<ViewMode>("projects")
  const [isCreateListOpen, setIsCreateListOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [customStatuses, setCustomStatuses] = useState<ProjectCustomStatus[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("获取项目列表失败:", error)
    } finally {
      setProjectsLoading(false)
    }
  }, [setProjects, setProjectsLoading])

  const fetchTaskLists = useCallback(async () => {
    if (!currentProjectId) return

    setLoading(true)
    try {
      const [taskListsResponse, customStatusesResponse] = await Promise.all([
        fetch(`/api/task-lists?projectId=${currentProjectId}`),
        fetch("/api/project-custom-statuses"),
      ])

      if (taskListsResponse.ok) {
        const data = await taskListsResponse.json()
        setTaskLists(data)
      }

      if (customStatusesResponse.ok) {
        const statuses = await customStatusesResponse.json()
        setCustomStatuses(statuses)
      }
    } catch (error) {
      console.error("获取任务列表失败:", error)
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, setTaskLists, setLoading])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (viewMode === "board" && currentProjectId) {
      fetchTaskLists()
    }
  }, [viewMode, currentProjectId, fetchTaskLists])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleProjectClick = (projectId: string) => {
    setCurrentProject(projectId)
    setViewMode("board")
  }

  const handleBackToProjects = () => {
    setCurrentProject(null)
    setViewMode("projects")
    setTaskLists([])
    // 刷新项目列表以同步任务完成率
    fetchProjects()
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const taskId = active.id as string
    const task = taskLists
      .flatMap((list) => list.tasks)
      .find((t) => t.id === taskId)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    if (overId.startsWith("custom-status-")) {
      const customStatusId = overId.replace("custom-status-", "")
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customStatusId: customStatusId || null,
          }),
        })
        fetchTaskLists() // 刷新数据
      } catch (error) {
        console.error("更新任务自定义状态失败:", error)
      }
      return
    }

    const sourceList = taskLists.find((list) =>
      list.tasks.some((task) => task.id === taskId)
    )

    let destList = taskLists.find((list) => list.id === overId)

    if (!destList) {
      const overTask = taskLists
        .flatMap((list) => list.tasks)
        .find((task) => task.id === overId)
      if (overTask) {
        destList = taskLists.find((list) => list.id === overTask.taskListId)
      }
    }

    if (!sourceList || !destList) return

    const sourceIndex = sourceList.tasks.findIndex((t) => t.id === taskId)

    let destIndex = destList.tasks.length
    if (destList.id !== overId) {
      const overTaskIndex = destList.tasks.findIndex((t) => t.id === overId)
      if (overTaskIndex >= 0) {
        destIndex = overTaskIndex
      }
    }

    const newPosition = destIndex

    const previousTaskLists = [...taskLists]
    moveTask(taskId, destList.id, newPosition)

    try {
      const response = await fetch("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          newListId: destList.id,
          newPosition,
        }),
      })

      if (!response.ok) {
        throw new Error("移动任务失败")
      }

      fetchTaskLists()
    } catch (error) {
      console.error("移动任务失败:", error)
      setTaskLists(previousTaskLists)
    }
  }

  const handleCreateTask = (listId: string) => {
    setSelectedListId(listId)
    setIsCreateTaskOpen(true)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsTaskDetailOpen(true)
  }

  const handleTaskUpdate = () => {
    fetchTaskLists()
    if (selectedTask) {
      const updatedTask = taskLists
        .flatMap((list) => list.tasks)
        .find((t) => t.id === selectedTask.id)
      if (updatedTask) {
        setSelectedTask(updatedTask)
      }
    }
  }

  const currentProject = getCurrentProject()

  if (viewMode === "projects") {
    if (isProjectsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      )
    }

    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">项目</h2>
          <Button onClick={() => setIsCreateProjectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </div>

        <ProjectList
          projects={projects}
          onProjectClick={handleProjectClick}
          onUpdate={fetchProjects}
        />

        <CreateProjectDialog
          open={isCreateProjectOpen}
          onOpenChange={setIsCreateProjectOpen}
          onSuccess={fetchProjects}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToProjects}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回项目列表
          </Button>
          <h2 className="text-2xl font-bold">
            {currentProject?.name || "任务看板"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditProjectOpen(true)}
          >
            编辑项目
          </Button>
          <Button onClick={() => setIsCreateListOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建列表
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <DragOverlay>
          {activeTask && <TaskDragOverlay task={activeTask} />}
        </DragOverlay>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {taskLists.map((list) => (
            <TaskListColumn
              key={list.id}
              list={list}
              onCreateTask={() => handleCreateTask(list.id)}
              onUpdate={fetchTaskLists}
              onTaskClick={handleTaskClick}
            />
          ))}
          {customStatuses.map((customStatus) => {
            const statusTasks = taskLists
              .flatMap((list) => list.tasks)
              .filter((task) => task.customStatusId === customStatus.id)
            return (
              <CustomStatusColumn
                key={`custom-${customStatus.id}`}
                customStatus={customStatus}
                tasks={statusTasks}
                onUpdate={fetchTaskLists}
                onTaskClick={handleTaskClick}
                onCreateTask={() => {
                  if (taskLists.length > 0) {
                    handleCreateTask(taskLists[0].id)
                  }
                }}
              />
            )
          })}
        </div>
      </DndContext>

      {taskLists.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          还没有任务列表，创建一个开始吧！
        </div>
      )}

      <CreateTaskListDialog
        open={isCreateListOpen}
        onOpenChange={setIsCreateListOpen}
        onSuccess={fetchTaskLists}
        projectId={currentProjectId}
      />

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        taskListId={selectedListId || ""}
        onSuccess={fetchTaskLists}
      />

      <EditProjectDialog
        open={isEditProjectOpen}
        onOpenChange={setIsEditProjectOpen}
        projectId={currentProjectId}
        onSuccess={fetchProjects}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        onUpdate={handleTaskUpdate}
      />
    </div>
  )
}
