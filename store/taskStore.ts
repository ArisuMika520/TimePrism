import { create } from "zustand"

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETE"
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface ProjectCustomStatus {
  id: string
  name: string
  color?: string | null
  userId: string
  position: number
  createdAt: Date
}

export interface TaskList {
  id: string
  name: string
  description?: string | null
  color?: string | null
  position: number
  projectId?: string | null
  tasks: Task[]
}

export interface Task {
  id: string
  title: string
  description?: string | null
  priority: Priority
  status: TaskStatus
  customStatusId?: string | null
  customStatus?: ProjectCustomStatus | null
  dueDate?: Date | null
  tags: string[]
  position: number
  taskListId: string
  todos?: any[]
  attachments: Attachment[]
  createdAt: Date
  updatedAt: Date
}

export interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface TaskStore {
  taskLists: TaskList[]
  setTaskLists: (lists: TaskList[]) => void
  addTaskList: (list: TaskList) => void
  updateTaskList: (id: string, updates: Partial<TaskList>) => void
  deleteTaskList: (id: string) => void
  addTask: (taskListId: string, task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, newListId: string, newPosition: number) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  taskLists: [],
  isLoading: false,
  setTaskLists: (lists) => set({ taskLists: lists }),
  addTaskList: (list) =>
    set((state) => ({ taskLists: [...state.taskLists, list] })),
  updateTaskList: (id, updates) =>
    set((state) => ({
      taskLists: state.taskLists.map((list) =>
        list.id === id ? { ...list, ...updates } : list
      ),
    })),
  deleteTaskList: (id) =>
    set((state) => ({
      taskLists: state.taskLists.filter((list) => list.id !== id),
    })),
  addTask: (taskListId, task) =>
    set((state) => ({
      taskLists: state.taskLists.map((list) =>
        list.id === taskListId
          ? { ...list, tasks: [...list.tasks, task] }
          : list
      ),
    })),
  updateTask: (id, updates) =>
    set((state) => ({
      taskLists: state.taskLists.map((list) => ({
        ...list,
        tasks: list.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
      })),
    })),
  deleteTask: (id) =>
    set((state) => ({
      taskLists: state.taskLists.map((list) => ({
        ...list,
        tasks: list.tasks.filter((task) => task.id !== id),
      })),
    })),
  moveTask: (taskId, newListId, newPosition) =>
    set((state) => {
      let taskToMove: Task | null = null
      const updatedLists = state.taskLists.map((list) => {
        const taskIndex = list.tasks.findIndex((t) => t.id === taskId)
        if (taskIndex !== -1) {
          taskToMove = list.tasks[taskIndex]
          return {
            ...list,
            tasks: list.tasks.filter((t) => t.id !== taskId),
          }
        }
        return list
      })

      if (taskToMove) {
        return {
          taskLists: updatedLists.map((list) => {
            if (list.id === newListId) {
              const newTasks = [...list.tasks]
              newTasks.splice(newPosition, 0, {
                ...taskToMove!,
                taskListId: newListId,
                position: newPosition,
              })
              return { ...list, tasks: newTasks }
            }
            return list
          }),
        }
      }

      return { taskLists: updatedLists }
    }),
  setLoading: (loading) => set({ isLoading: loading }),
}))

