import { create } from "zustand"

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type TodoStatus = "WAIT" | "IN_PROGRESS" | "COMPLETE"
export type ArchiveBucket = "FINISHED" | "UNFINISHED"

export interface ArchiveFilters {
  bucket: ArchiveBucket | "ALL"
  dateFrom?: Date | null
  dateTo?: Date | null
  query?: string
}

export interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  createdAt: Date
}

export interface UserCustomStatus {
  id: string
  name: string
  color?: string | null
  position: number
}

export interface Todo {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  customStatusId?: string | null
  customStatus?: UserCustomStatus | null
  priority: Priority
  category?: string | null
  tags: string[]
  startDate?: Date | null
  dueDate?: Date | null
  todayPinnedDate?: Date | null
  links: string[]
  taskId?: string | null
  task?: any | null
  position: number
  attachments?: Attachment[]
  archivedAt?: Date | null
  archivedBucket?: ArchiveBucket | null
  archivedReason?: string | null
  archivedBySystem?: boolean
  createdAt: Date
  updatedAt: Date
}

interface TodoStore {
  todos: Todo[]
  archivedTodos: Todo[]
  archivePagination: {
    page: number
    pageSize: number
    total: number
  }
  archiveFilters: ArchiveFilters
  setTodos: (todos: Todo[] | ((prevTodos: Todo[]) => Todo[])) => void
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  updateStatus: (id: string, status: TodoStatus, customStatusId?: string | null) => void
  isLoading: boolean
  isArchiveLoading: boolean
  setLoading: (loading: boolean) => void
  setArchiveFilters: (filters: Partial<ArchiveFilters>) => void
  fetchArchivedTodos: (options?: { page?: number; filters?: Partial<ArchiveFilters> }) => Promise<void>
}

const parseTodoDates = (todo: any): Todo => ({
  ...todo,
  createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
  updatedAt: todo.updatedAt ? new Date(todo.updatedAt) : new Date(),
  startDate: todo.startDate ? new Date(todo.startDate) : null,
  dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
  todayPinnedDate: todo.todayPinnedDate ? new Date(todo.todayPinnedDate) : null,
  archivedAt: todo.archivedAt ? new Date(todo.archivedAt) : null,
  position: typeof todo.position === "number" ? todo.position : 0,
})

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  archivedTodos: [],
  archivePagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },
  archiveFilters: {
    bucket: "ALL",
    dateFrom: null,
    dateTo: null,
    query: "",
  },
  isLoading: false,
  isArchiveLoading: false,
  setTodos: (todosOrUpdater) => {
    if (typeof todosOrUpdater === 'function') {
      set((state) => ({ todos: todosOrUpdater(state.todos) }))
    } else {
      set({ todos: todosOrUpdater })
    }
  },
  addTodo: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
  updateTodo: (id, updates) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      ),
    })),
  deleteTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),
  updateStatus: (id, status, customStatusId) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id
          ? { ...todo, status, customStatusId: customStatusId ?? null }
          : todo
      ),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setArchiveFilters: (filters) =>
    set((state) => ({
      archiveFilters: {
        ...state.archiveFilters,
        ...filters,
      },
    })),
  fetchArchivedTodos: async (options) => {
    const state = get()
    const page = options?.page ?? state.archivePagination.page
    const mergedFilters = {
      ...state.archiveFilters,
      ...(options?.filters ?? {}),
    }

    set({ isArchiveLoading: true })

    try {
      const params = new URLSearchParams({
        archived: "true",
        page: page.toString(),
        pageSize: state.archivePagination.pageSize.toString(),
      })

      if (mergedFilters.bucket !== "ALL") {
        params.set("bucket", mergedFilters.bucket)
      }
      if (mergedFilters.query) {
        params.set("q", mergedFilters.query)
      }
      if (mergedFilters.dateFrom) {
        params.set("dateFrom", mergedFilters.dateFrom.toISOString())
      }
      if (mergedFilters.dateTo) {
        params.set("dateTo", mergedFilters.dateTo.toISOString())
      }

      const response = await fetch(`/api/todos?${params.toString()}`)

      if (!response.ok) {
        throw new Error("归档数据获取失败")
      }

      const payload = await response.json()
      const parsedTodos = Array.isArray(payload?.data)
        ? payload.data.map(parseTodoDates)
        : []

      set({
        archivedTodos: parsedTodos,
        archivePagination: {
          page,
          pageSize: state.archivePagination.pageSize,
          total: payload?.pagination?.total ?? parsedTodos.length,
        },
        archiveFilters: mergedFilters,
      })
    } catch (error) {
      // 获取失败
    } finally {
      set({ isArchiveLoading: false })
    }
  },
}))

