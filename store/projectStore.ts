import { create } from "zustand"

export interface Project {
  id: string
  name: string
  description?: string | null
  color?: string | null
  position: number
  userId: string
  taskLists: TaskList[]
  createdAt: Date
  updatedAt: Date
}

export interface TaskList {
  id: string
  name: string
  description?: string | null
  color?: string | null
  position: number
  userId: string
  projectId?: string | null
  project?: Project | null
  tasks: Task[]
  createdAt: Date
  updatedAt: Date
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
  userId: string
  todos?: Todo[]
  attachments: Attachment[]
  createdAt: Date
  updatedAt: Date
}

export interface ProjectCustomStatus {
  id: string
  name: string
  color?: string | null
  userId: string
  position: number
  createdAt: Date
}

export interface Todo {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  priority: Priority
  tags: string[]
  position: number
  taskId?: string | null
  createdAt: Date
  updatedAt: Date
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETE"
export type TodoStatus = "WAIT" | "IN_PROGRESS" | "COMPLETE"

export interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface ProjectStore {
  projects: Project[]
  currentProjectId: string | null
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (projectId: string | null) => void
  getCurrentProject: () => Project | null
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      ),
    })),
  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      currentProjectId:
        state.currentProjectId === id ? null : state.currentProjectId,
    })),
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
  getCurrentProject: () => {
    const state = get()
    if (!state.currentProjectId) return null
    return state.projects.find((p) => p.id === state.currentProjectId) || null
  },
  setLoading: (loading) => set({ isLoading: loading }),
}))

