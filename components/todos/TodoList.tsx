"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useTodoStore } from "@/store/todoStore"
import { SortableTodoItem } from "./SortableTodoItem"
import { StatusDropTarget } from "./StatusDropTarget"
import { Button } from "@/components/ui/button"
import { Plus, Circle, Radio, CheckCircle, CheckSquare, Square, Filter, X, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { InlineTodoCreator } from "./InlineTodoCreator"
import { CreateCustomStatusDialog } from "./CreateCustomStatusDialog"
import { EditCustomStatusDialog } from "./EditCustomStatusDialog"
import { SortableStatusGroup } from "./SortableStatusGroup"
import { BatchActionBar } from "./BatchActionBar"
import { BatchDragOverlay } from "./BatchDragOverlay"
import { ArchivePanel } from "./ArchivePanel"
import { TodoCommandPalette } from "./TodoCommandPalette"
import { TodoStatus, UserCustomStatus, Priority, Todo } from "@/store/todoStore"
import { cn } from "@/lib/utils"
import { useNotification } from "@/components/ui/notification"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { undoManager } from "@/lib/undoManager"
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
  useDndMonitor,
  useDroppable,
  CollisionDetection,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { startOfDay, endOfDay, isWithinInterval, isSameDay, isBefore, addDays } from "date-fns"

const getDateValue = (value?: Date | string | null) => {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

const normalizeTodoDates = (todo: any): Todo => ({
  ...todo,
  createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
  updatedAt: todo.updatedAt ? new Date(todo.updatedAt) : new Date(),
  startDate: todo.startDate ? new Date(todo.startDate) : null,
  dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
  todayPinnedDate: todo.todayPinnedDate ? new Date(todo.todayPinnedDate) : null,
})

const sortTodosByPosition = (list: Todo[]) => {
  return [...list].sort((a, b) => {
    const posDiff = (a.position ?? 0) - (b.position ?? 0)
    if (posDiff !== 0) {
      return posDiff
    }
    const aTime =
      a.createdAt instanceof Date
        ? a.createdAt.getTime()
        : new Date(a.createdAt).getTime()
    const bTime =
      b.createdAt instanceof Date
        ? b.createdAt.getTime()
        : new Date(b.createdAt).getTime()
    return aTime - bTime
  })
}

const ARCHIVE_CANCELLED_ERROR = "USER_CANCELLED_ARCHIVE"

type TodoFilters = {
  statuses: TodoStatus[]
  customStatusIds: string[]
  priorities: Priority[]
  dueFrom: string
  dueTo: string
  tags: string[]
}

type SavedTodoViewRecord = {
  id: string
  name: string
  filters: any
  sort?: Record<string, unknown> | null
}

const createDefaultFilters = (): TodoFilters => ({
  statuses: [],
  customStatusIds: [],
  priorities: [],
  dueFrom: "",
  dueTo: "",
  tags: [],
})

const baseStatusOptions: { value: TodoStatus; label: string }[] = [
  { value: "IN_PROGRESS", label: "进行中" },
  { value: "WAIT", label: "等待中" },
  { value: "COMPLETE", label: "已完成" },
]

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "URGENT", label: "紧急" },
  { value: "HIGH", label: "高" },
  { value: "MEDIUM", label: "中" },
  { value: "LOW", label: "低" },
]

// 优先级颜色配置
const priorityColorConfig: Record<Priority, string> = {
  LOW: "#10b981",
  MEDIUM: "#2563eb",
  HIGH: "#f97316",
  URGENT: "#ef4444",
}

export function TodoList() {
  const { todos: todosFromStore, setTodos, isLoading, setLoading } = useTodoStore()
  // 确保 todos 始终是数组
  const todos = useMemo(
    () => (Array.isArray(todosFromStore) ? todosFromStore : []),
    [todosFromStore]
  )
  const { showError, showSuccess, showWarning } = useNotification()
  const confirm = useConfirm()
  const { toast } = useToast()
  const [customStatuses, setCustomStatuses] = useState<UserCustomStatus[]>([])
  const [creatingStatus, setCreatingStatus] = useState<{
    status: TodoStatus
    customStatusId: string | null
  } | null>(null)
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<UserCustomStatus | null>(null)
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false)
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<string>>(new Set())
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"today" | "current" | "archive">("current")
  const [lastCreateContext, setLastCreateContext] = useState<{
    status: TodoStatus
    customStatusId: string | null
  } | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const lastPinnedCleanupDayRef = useRef<string | null>(null)
  const [filters, setFilters] = useState<TodoFilters>(() => createDefaultFilters())
  const [tagInput, setTagInput] = useState("")
  const filtersRef = useRef(filters)
  const [savedViews, setSavedViews] = useState<SavedTodoViewRecord[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [isSaveViewDialogOpen, setIsSaveViewDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [isSavingView, setIsSavingView] = useState(false)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const todayTodos = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(todayStart)

    return todos.filter((todo) => {
      const dueDate = getDateValue(todo.dueDate ?? null)
      const pinnedDate = getDateValue(todo.todayPinnedDate ?? null)

      const dueToday = dueDate ? isWithinInterval(dueDate, { start: todayStart, end: todayEnd }) : false
      const pinnedToday = pinnedDate ? isSameDay(pinnedDate, todayStart) : false

      return dueToday || pinnedToday
    })
  }, [todos])

  const displayedTodos = viewMode === "today" ? todayTodos : todos

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // 移动 5px 才触发拖拽
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 碰撞检测
  const collisionDetection: CollisionDetection = (args) => {
    const collisions = closestCenter(args)
    
    const activeId = args.active.id as string
    const draggedTodo = todos.find((t) => t.id === activeId)
    
    if (draggedTodo) {
      // 检查状态栏碰撞
      const statusBarCollisions = collisions.filter(
        (collision) => {
          const id = collision.id.toString()
          if (id.startsWith("status-") || id.startsWith("custom-")) {
            const parsed = parseStatusId(id)
            return parsed.status !== draggedTodo.status || 
                   parsed.customStatusId !== (draggedTodo.customStatusId || null)
          }
          return false
        }
      )
      
      // 过滤相同状态的碰撞
      const todoCollisions = collisions.filter(
        (collision) => {
          const id = collision.id.toString()
          if (id.startsWith("status-") || id.startsWith("custom-")) {
            const parsed = parseStatusId(id)
            return parsed.status !== draggedTodo.status || 
                   parsed.customStatusId !== (draggedTodo.customStatusId || null)
          }
          return true
        }
      )
      
      if (todoCollisions.length > 0) {
        return todoCollisions
      }
      if (statusBarCollisions.length > 0) {
        return statusBarCollisions
      }
      return collisions
    }
    
    return collisions
  }

  // 清空选择函数
  const handleClearSelection = useCallback(() => {
    setSelectedTodoIds(new Set())
  }, [])

  const handleUndoHotkey = useCallback(async () => {
    const result = await undoManager.undoLatest()
    if (result.success) {
      showSuccess("已撤销操作", "最近一次修改已撤销")
    } else {
      showWarning("无可撤销操作", "请在 30 秒内撤销或执行新的更改")
    }
  }, [showSuccess, showWarning])

  useEffect(() => {
    const todayStart = startOfDay(new Date())
    const todayKey = todayStart.toISOString()

    if (lastPinnedCleanupDayRef.current === todayKey) {
      return
    }

    const expiredIds = todos
      .filter((todo) => {
        const pinnedDate = getDateValue(todo.todayPinnedDate ?? null)
        if (!pinnedDate) return false
        return isBefore(pinnedDate, todayStart)
      })
      .map((todo) => todo.id)

    if (expiredIds.length === 0) {
      lastPinnedCleanupDayRef.current = todayKey
      return
    }

    lastPinnedCleanupDayRef.current = todayKey

    const cleanupPinnedTodos = async () => {
      try {
        const response = await fetch("/api/todos/batch", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            todoIds: expiredIds,
            updates: {
              todayPinnedDate: null,
            },
          }),
        })

        if (!response.ok) {
          throw new Error("清理今日任务失败")
        }

        setTodos((prevTodos) => {
          const safePrev = Array.isArray(prevTodos) ? prevTodos : []
          return safePrev.map((todo) =>
            expiredIds.includes(todo.id) ? { ...todo, todayPinnedDate: null } : todo
          )
        })
      } catch (error) {
        // 清理失败
      }
    }

    cleanupPinnedTodos()
  }, [todos, setTodos])

  // Ctrl/Cmd + K 快速创建
  const focusOrCreateInlineCreator = useCallback(() => {
    if (creatingStatus) return

    if (lastCreateContext) {
      setCreatingStatus({
        status: lastCreateContext.status,
        customStatusId: lastCreateContext.customStatusId,
      })
      return
    }

    setCreatingStatus({
      status: "WAIT",
      customStatusId: null,
    })
  }, [creatingStatus, lastCreateContext])

  // 全局键盘快捷键
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return true
      if (target.isContentEditable) return true
      return false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === "archive") return

      if (isEditableTarget(e.target)) return

      // Esc：清空多选
      if (e.key === "Escape") {
        if (isCommandPaletteOpen) {
          e.preventDefault()
          setIsCommandPaletteOpen(false)
          return
        }
        if (selectedTodoIds.size > 0) {
          e.preventDefault()
          handleClearSelection()
        }
        return
      }

      const isMeta = e.metaKey || e.ctrlKey

      if (isMeta && e.key.toLowerCase() === "z") {
        e.preventDefault()
        handleUndoHotkey()
        return
      }

      // Ctrl/Cmd + K：快速新增待办
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault()
        focusOrCreateInlineCreator()
        return
      }

      // Ctrl/Cmd + /：命令面板
      if (isMeta && e.key === "/") {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    viewMode,
    selectedTodoIds.size,
    handleClearSelection,
    focusOrCreateInlineCreator,
    isCommandPaletteOpen,
    handleUndoHotkey,
  ])

  const buildTodoQueryParams = () => {
    const params = new URLSearchParams()
    const currentFilters = filtersRef.current

    if (currentFilters.statuses.length > 0) {
      params.set("statuses", currentFilters.statuses.join(","))
    }

    if (currentFilters.customStatusIds.length > 0) {
      params.set("customStatusIds", currentFilters.customStatusIds.join(","))
    }

    if (currentFilters.priorities.length > 0) {
      params.set("priorities", currentFilters.priorities.join(","))
    }

    if (currentFilters.dueFrom) {
      params.set("dueFrom", currentFilters.dueFrom)
    }

    if (currentFilters.dueTo) {
      params.set("dueTo", currentFilters.dueTo)
    }

    if (currentFilters.tags.length > 0) {
      params.set("tags", currentFilters.tags.join(","))
    }

    return params
  }

  const normalizeViewFilters = (rawFilters: any): TodoFilters => {
    const nextFilters = createDefaultFilters()

    if (Array.isArray(rawFilters?.statuses)) {
      nextFilters.statuses = rawFilters.statuses.filter((status: any) =>
        ["WAIT", "IN_PROGRESS", "COMPLETE"].includes(status)
      )
    }

    if (Array.isArray(rawFilters?.customStatusIds)) {
      nextFilters.customStatusIds = rawFilters.customStatusIds.filter(
        (id: any) => typeof id === "string"
      )
    }

    if (Array.isArray(rawFilters?.priorities)) {
      nextFilters.priorities = rawFilters.priorities.filter((priority: any) =>
        ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)
      )
    }

    if (typeof rawFilters?.dueFrom === "string") {
      nextFilters.dueFrom = rawFilters.dueFrom
    }

    if (typeof rawFilters?.dueTo === "string") {
      nextFilters.dueTo = rawFilters.dueTo
    }

    if (Array.isArray(rawFilters?.tags)) {
      nextFilters.tags = rawFilters.tags.filter((tag: any) => typeof tag === "string")
    }

    return nextFilters
  }

  const fetchTodos = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildTodoQueryParams()
      const queryString = params.toString()
      const url = queryString ? `/api/todos?${params.toString()}` : "/api/todos"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const normalized = Array.isArray(data) ? data.map(normalizeTodoDates) : []
        setTodos(normalized)
      }
    } catch (error) {
      console.error("获取待办事项失败:", error)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setTodos])

  const fetchCustomStatuses = useCallback(async () => {
    try {
      const response = await fetch("/api/custom-statuses")
      if (response.ok) {
        const data = await response.json()
        setCustomStatuses(data)
      }
    } catch (error) {
      console.error("获取自定义状态失败:", error)
    }
  }, [])

  const fetchSavedViews = useCallback(async () => {
    try {
      const response = await fetch("/api/todo-views")
      if (response.ok) {
        const data = await response.json()
        setSavedViews(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("获取保存视图失败:", error)
    }
  }, [])

  const handleSelectView = useCallback(
    (viewId: string | null) => {
      if (viewId === selectedViewId) {
        return
      }

      if (!viewId) {
        setSelectedViewId(null)
        setFilters(createDefaultFilters())
        setTagInput("")
        showSuccess("视图已应用", "已恢复默认视图")
        return
      }

      const targetView = savedViews.find((view) => view.id === viewId)
      if (!targetView) {
        showWarning("视图不存在", "请选择其他视图")
        return
      }

      setSelectedViewId(viewId)
      const normalized = normalizeViewFilters(targetView.filters)
      setFilters(normalized)
      setTagInput("")
      showSuccess("视图已应用", `已切换至 ${targetView.name}`)
    },
    [savedViews, selectedViewId, showSuccess, showWarning]
  )

  const handleSaveView = useCallback(async () => {
    const trimmedName = newViewName.trim()
    if (!trimmedName) {
      showWarning("请输入视图名称", "视图名称不能为空")
      return
    }
    setIsSavingView(true)
    try {
      const response = await fetch("/api/todo-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          filters,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "保存视图失败")
      }

      const created = await response.json()
      showSuccess("视图已保存", `${trimmedName} 已保存`)
      setIsSaveViewDialogOpen(false)
      setNewViewName("")
      setSelectedViewId(created.id)
      await fetchSavedViews()
    } catch (error) {
      console.error("保存视图失败:", error)
      showError("保存视图失败", error instanceof Error ? error.message : "请稍后再试")
    } finally {
      setIsSavingView(false)
    }
  }, [filters, fetchSavedViews, newViewName, showError, showSuccess, showWarning])

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      const targetView = savedViews.find((view) => view.id === viewId)
      if (!targetView) {
        showWarning("视图不存在", "请选择其他视图")
        return
      }

      const confirmed = await confirm.confirm({
        title: "删除视图",
        message: `确定要删除视图“${targetView.name}”吗？`,
        variant: "destructive",
        confirmText: "删除",
        cancelText: "取消",
      })
      if (!confirmed) return

      try {
        const response = await fetch(`/api/todo-views/${viewId}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "删除视图失败")
        }
        showSuccess("视图已删除", `${targetView.name} 已删除`)
        if (selectedViewId === viewId) {
          setSelectedViewId(null)
          setFilters(createDefaultFilters())
          setTagInput("")
        }
        await fetchSavedViews()
      } catch (error) {
        console.error("删除视图失败:", error)
        showError("删除视图失败", error instanceof Error ? error.message : "请稍后再试")
      }
    },
    [savedViews, confirm, showSuccess, showError, showWarning, selectedViewId, fetchSavedViews]
  )

  const toggleStatusFilter = useCallback((status: TodoStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }, [])

  const toggleCustomStatusFilter = useCallback((customStatusId: string) => {
    setFilters((prev) => ({
      ...prev,
      customStatusIds: prev.customStatusIds.includes(customStatusId)
        ? prev.customStatusIds.filter((id) => id !== customStatusId)
        : [...prev.customStatusIds, customStatusId],
    }))
  }, [])

  const togglePriorityFilter = useCallback((priority: Priority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }))
  }, [])

  const handleDueDateChange = useCallback((key: "dueFrom" | "dueTo", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleTagAdd = useCallback(() => {
    const value = tagInput.trim()
    if (!value) return
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(value) ? prev.tags : [...prev.tags, value],
    }))
    setTagInput("")
  }, [tagInput])

  const handleTagRemove = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }, [])

  const handleTagInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault()
        handleTagAdd()
      }
    },
    [handleTagAdd]
  )

  const handleResetFilters = useCallback(() => {
    setFilters(createDefaultFilters())
    setTagInput("")
    setSelectedViewId(null)
  }, [])

  const activeFilterCount =
    filters.statuses.length +
    filters.customStatusIds.length +
    filters.priorities.length +
    (filters.dueFrom ? 1 : 0) +
    (filters.dueTo ? 1 : 0) +
    filters.tags.length
  const hasActiveFilters = activeFilterCount > 0
  const selectedViewName = selectedViewId
    ? savedViews.find((view) => view.id === selectedViewId)?.name ?? null
    : null

  useEffect(() => {
    fetchCustomStatuses()
  }, [fetchCustomStatuses])

  useEffect(() => {
    fetchSavedViews()
  }, [fetchSavedViews])

  useEffect(() => {
    fetchTodos()
  }, [filters, fetchTodos])

  const updateTodosForStatusOrder = useCallback(
    (status: TodoStatus, customStatusId: string | null, orderedIds: string[]) => {
      if (orderedIds.length === 0) return

      setTodos((prevTodos) => {
        const safePrev = Array.isArray(prevTodos) ? prevTodos : []
        const todoMap = new Map(safePrev.map((todo) => [todo.id, todo]))
        const reordered = orderedIds
          .map((id, index) => {
            const todo = todoMap.get(id)
            if (!todo) return null
            return { ...todo, position: index }
          })
          .filter((todo): todo is Todo => Boolean(todo))

        const otherTodos = safePrev.filter((todo) => {
          if (customStatusId) {
            return todo.customStatusId !== customStatusId
          }
          return !(todo.status === status && !todo.customStatusId)
        })

        return [...otherTodos, ...reordered]
      })
    },
    [setTodos]
  )

  const persistTodoOrder = async (
    status: TodoStatus,
    customStatusId: string | null,
    orderedIds: string[],
    previousOrderedIds: string[]
  ) => {
    if (orderedIds.length === 0) return

    try {
      const response = await fetch("/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          customStatusId,
          todoIds: orderedIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const errorMessage = data?.error || "排序保存失败"
        if (response.status === 400 || response.status === 403 || response.status === 422) {
          showWarning("排序未保存", errorMessage)
        } else {
          showError("排序保存失败", errorMessage)
        }
        updateTodosForStatusOrder(status, customStatusId, previousOrderedIds)
        return
      }

      showSuccess("排序成功", "新的顺序已保存")

      if (previousOrderedIds.length > 0) {
        let countdown = 3
        let countdownTimer: ReturnType<typeof setInterval> | null = null
        let toastRef: ReturnType<typeof toast> | null = null

        const handleUndo = async () => {
          if (countdownTimer) {
            clearInterval(countdownTimer)
          }
          toastRef?.dismiss()
          updateTodosForStatusOrder(status, customStatusId, previousOrderedIds)
          try {
            const undoResponse = await fetch("/api/todos/reorder", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status,
                customStatusId,
                todoIds: previousOrderedIds,
              }),
            })
            if (!undoResponse.ok) {
              const data = await undoResponse.json().catch(() => null)
              const errorMessage = data?.error || "撤销失败，请稍后重试"
              showError("撤销排序失败", errorMessage)
              // 恢复为最新顺序
              updateTodosForStatusOrder(status, customStatusId, orderedIds)
            } else {
              showSuccess("已撤销排序", "顺序已恢复")
            }
          } catch (error) {
            console.error("撤销排序失败:", error)
            showError("撤销排序失败", "网络异常，请稍后重试")
            updateTodosForStatusOrder(status, customStatusId, orderedIds)
          }
        }

        toastRef = toast({
          title: "排序已更新",
          description: `已保存新的排序，${countdown} 秒内可撤销`,
          duration: 3000,
          action: (
            <ToastAction altText="撤销排序" onClick={handleUndo}>
              撤销
            </ToastAction>
          ),
        })

        countdownTimer = setInterval(() => {
          countdown -= 1
          if (countdown > 0) {
            toastRef?.update({
              id: toastRef.id,
              description: `已保存新的排序，${countdown} 秒内可撤销`,
            })
          } else {
            if (countdownTimer) {
              clearInterval(countdownTimer)
            }
            toastRef?.dismiss()
          }
        }, 1000)
      }
    } catch (error) {
      console.error("保存待办排序失败:", error)
      updateTodosForStatusOrder(status, customStatusId, previousOrderedIds)
      showError("排序保存失败", "网络异常，请稍后再试")
    }
  }

  // 获取状态ID（基础状态或自定义状态）
  const getStatusId = (status: TodoStatus, customStatusId?: string | null): string => {
    if (customStatusId) return `custom-${customStatusId}`
    return `status-${status}`
  }

  // 从状态ID解析状态
  const parseStatusId = (statusId: string): { status: TodoStatus; customStatusId: string | null } => {
    if (statusId.startsWith("custom-")) {
      return { status: "WAIT", customStatusId: statusId.replace("custom-", "") }
    }
    const status = statusId.replace("status-", "") as TodoStatus
    return { status, customStatusId: null }
  }

  const filterTodosByStatus = (
    status: TodoStatus,
    customStatusId?: string | null,
    sourceTodos: Todo[] = todos
  ): Todo[] => {
    return sourceTodos.filter((todo) => {
      if (customStatusId) {
        return todo.customStatusId === customStatusId
      }
      return todo.status === status && !todo.customStatusId
    })
  }

  const getTodosForStatus = (
    status: TodoStatus,
    customStatusId?: string | null,
    sourceTodos: Todo[] = todos
  ): Todo[] => {
    return sortTodosByPosition(filterTodosByStatus(status, customStatusId, sourceTodos))
  }

  const getNextPositionForStatus = (status: TodoStatus, customStatusId?: string | null): number => {
    const statusTodos = getTodosForStatus(status, customStatusId)
    if (statusTodos.length === 0) return 0
    const maxPosition = Math.max(...statusTodos.map((todo) => todo.position ?? 0))
    return maxPosition + 1
  }

  const handleTodoDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const draggedTodoId = active.id as string
    const draggedTodo = todos.find((t) => t.id === draggedTodoId)
    if (!draggedTodo) return

    // 检查是否拖到了状态组
    const overId = over.id as string
    let targetStatus: TodoStatus = draggedTodo.status
    let targetCustomStatusId: string | null = draggedTodo.customStatusId || null

    // 检查是否有选中的 todo（批量拖拽）
    const selectedIds = Array.from(selectedTodoIds)
    const isBatchDrag = selectedIds.length > 0 && selectedIds.includes(draggedTodoId)

    // 如果拖到了状态组标题
    if (overId.startsWith("status-") || overId.startsWith("custom-")) {
      // 如果是批量拖拽，且目标状态与当前状态相同，忽略状态栏（优先进行排序）
      const parsed = parseStatusId(overId)
      const targetStatusFromBar = parsed.status
      const targetCustomStatusIdFromBar = parsed.customStatusId
      
      // 如果是批量拖拽到相同状态栏，不处理（避免误触发状态改变）
      // 但如果是拖到不同状态栏，允许状态改变
      if (isBatchDrag && 
          targetStatusFromBar === draggedTodo.status &&
          targetCustomStatusIdFromBar === (draggedTodo.customStatusId || null)) {
        // 批量拖拽到相同状态栏，不处理（避免误触发状态改变）
        return
      }
      // 如果是批量拖拽到不同状态栏，允许状态改变（继续执行后续逻辑）
      
      targetStatus = targetStatusFromBar
      targetCustomStatusId = targetCustomStatusIdFromBar
    } else {
      // 拖到了另一个Todo，获取该Todo的状态
      const targetTodo = todos.find((t) => t.id === overId)
      if (targetTodo) {
        targetStatus = targetTodo.status
        targetCustomStatusId = targetTodo.customStatusId || null
      } else {
        // 如果找不到目标Todo，可能是拖到了其他位置，不处理
        return
      }
    }

    // 如果状态没有改变，只进行排序（同状态内排序）
    if (
      targetStatus === draggedTodo.status &&
      targetCustomStatusId === (draggedTodo.customStatusId || null)
    ) {
      const sameStatusTodos = getTodosForStatus(targetStatus, targetCustomStatusId)
      const previousOrderIds = sameStatusTodos.map((t) => t.id)

      const oldIndex = sameStatusTodos.findIndex((t) => t.id === draggedTodoId)
      const newIndex = sameStatusTodos.findIndex((t) => t.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        let reorderedList: Todo[] | null = null

        if (isBatchDrag) {
          // 批量排序：将所有选中的 todo 一起移动到新位置
          const selectedTodosInStatus = sameStatusTodos.filter((t) =>
            selectedIds.includes(t.id)
          )
          const nonSelectedTodos = sameStatusTodos.filter(
            (t) => !selectedIds.includes(t.id)
          )
          const targetTodo = sameStatusTodos[newIndex]
          const isTargetSelected = selectedIds.includes(targetTodo.id)
          let insertIndex = 0

          if (!isTargetSelected) {
            const targetIndexInNonSelected = nonSelectedTodos.findIndex(
              (t) => t.id === targetTodo.id
            )
            if (targetIndexInNonSelected !== -1) {
              insertIndex =
                newIndex < oldIndex
                  ? targetIndexInNonSelected
                  : targetIndexInNonSelected + 1
            } else {
              insertIndex = Math.min(newIndex, nonSelectedTodos.length)
            }
          } else {
            const nonSelectedBeforeTarget = sameStatusTodos
              .slice(0, newIndex)
              .filter((t) => !selectedIds.includes(t.id)).length
            insertIndex =
              newIndex < oldIndex
                ? nonSelectedBeforeTarget
                : nonSelectedBeforeTarget + 1
          }

          const reordered = [...nonSelectedTodos]
          reordered.splice(
            Math.max(0, Math.min(insertIndex, reordered.length)),
            0,
            ...selectedTodosInStatus
          )
          reorderedList = reordered
        } else {
          reorderedList = arrayMove(sameStatusTodos, oldIndex, newIndex)
        }

        if (reorderedList) {
          const newOrderIds = reorderedList.map((todo) => todo.id)
          updateTodosForStatusOrder(targetStatus, targetCustomStatusId, newOrderIds)
          persistTodoOrder(
            targetStatus,
            targetCustomStatusId,
            newOrderIds,
            previousOrderIds
          )
        }
      }
      return
    }

    // 状态改变，更新Todo
    // 使用之前定义的 selectedIds 和 isBatchDrag
    const todosToUpdate = isBatchDrag
      ? selectedIds // 如果被拖拽的 todo 在选中列表中，批量更新所有选中的
      : [draggedTodoId] // 否则只更新被拖拽的

    try {
      // 如果有多个 todo 需要更新，使用批量更新 API
      if (todosToUpdate.length > 1) {
        const response = await fetch("/api/todos/batch", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            todoIds: todosToUpdate,
            updates: {
              status: targetStatus,
              customStatusId: targetCustomStatusId,
            },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // 更新本地状态
          const updatedTodosMap = new Map<string, Todo>(
            data.todos.map((todo: Todo) => [todo.id, todo])
          )
          setTodos(
            todos.map((todo) => updatedTodosMap.get(todo.id) || todo)
          )
          // 清空选择
          handleClearSelection()
          showSuccess("批量更新成功", `已更新 ${todosToUpdate.length} 个待办事项的状态`)
        } else {
          fetchTodos() // 失败时刷新
          showError("批量更新失败", "状态更新失败，请稍后重试")
        }
      } else {
        // 单个 todo 更新
        const response = await fetch(`/api/todos/${draggedTodoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            customStatusId: targetCustomStatusId,
          }),
        })

        if (response.ok) {
          // 乐观更新
          setTodos(
            todos.map((todo) =>
              todo.id === draggedTodoId
                ? { ...todo, status: targetStatus, customStatusId: targetCustomStatusId }
                : todo
            )
          )
        } else {
          fetchTodos() // 失败时刷新
        }
      }
    } catch (error) {
      console.error("更新Todo状态失败:", error)
      fetchTodos()
      if (todosToUpdate.length > 1) {
        showError("批量更新失败", "网络错误，请稍后重试")
      }
    }
  }

  const handleStatusDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = customStatuses.findIndex((cs) => cs.id === active.id)
    const newIndex = customStatuses.findIndex((cs) => cs.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // 更新本地状态
    const newStatuses = arrayMove(customStatuses, oldIndex, newIndex)
    setCustomStatuses(newStatuses)

    // 更新 position 并调用 API
    const statusIds = newStatuses.map((cs) => cs.id)
    try {
      const response = await fetch("/api/custom-statuses/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusIds }),
      })

      if (response.ok) {
        const updatedStatuses = await response.json()
        setCustomStatuses(updatedStatuses)
      } else {
        // 如果失败，恢复原状态
        fetchCustomStatuses()
      }
    } catch (error) {
      console.error("更新排序失败:", error)
      // 恢复原状态
      fetchCustomStatuses()
    }
  }

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  // 统一的拖拽处理函数，根据拖拽类型分发到不同的处理器
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event
    
    // 清空拖拽状态
    setActiveDragId(null)
    
    // 检查是否是自定义状态组的拖拽（通过检查 active.id 是否在 customStatuses 中）
    const isCustomStatusDrag = customStatuses.some((cs) => cs.id === active.id)
    
    if (isCustomStatusDrag) {
      // 处理自定义状态组的排序
      await handleStatusDragEnd(event)
    } else {
      // 处理 Todo 的拖拽
      await handleTodoDragEnd(event)
    }
  }

  const handleCreateTodo = async (title: string, status: TodoStatus, customStatusId?: string | null) => {
    // 生成临时 ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()
    const nextPosition = getNextPositionForStatus(status, customStatusId || null)
    
    // 创建临时 todo（乐观更新）
    // 获取对应的 customStatus 对象（如果存在）
    const customStatus = customStatusId 
      ? customStatuses.find((cs) => cs.id === customStatusId) || null
      : null
    
    const tempTodo: Todo = {
      id: tempId,
      title,
      status,
      customStatusId: customStatusId || null,
      customStatus: customStatus,
      priority: "MEDIUM",
      tags: [],
      links: [],
      attachments: [],
      position: nextPosition,
      todayPinnedDate: null,
      createdAt: now,
      updatedAt: now,
      description: null,
      category: null,
      startDate: null,
      dueDate: null,
    }
    
    // 立即添加到前端（使用函数式更新确保使用最新状态）
    // 使用 useCallback 确保函数引用稳定，避免闭包问题
    setTodos((prevTodos) => {
      const safePrevTodos = Array.isArray(prevTodos) ? prevTodos : []
      // 检查是否已存在相同的临时 todo（防止重复添加）
      if (safePrevTodos.some((todo) => todo.id === tempId)) {
        return safePrevTodos
      }
      return [...safePrevTodos, tempTodo]
    })
    // 延迟关闭创建状态，确保临时 todo 已经渲染
    requestAnimationFrame(() => {
      setCreatingStatus(null)
    })
    
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          customStatusId: customStatusId || null,
          priority: "MEDIUM",
          tags: [],
          links: [],
        }),
      })

      if (response.ok) {
        const newTodo = await response.json()
        // 转换日期格式（API 返回的是字符串，需要转换为 Date 对象）
        const formattedTodo: Todo = {
          ...newTodo,
          createdAt: newTodo.createdAt ? new Date(newTodo.createdAt) : new Date(),
          updatedAt: newTodo.updatedAt ? new Date(newTodo.updatedAt) : new Date(),
          startDate: newTodo.startDate ? new Date(newTodo.startDate) : null,
          dueDate: newTodo.dueDate ? new Date(newTodo.dueDate) : null,
          todayPinnedDate: newTodo.todayPinnedDate ? new Date(newTodo.todayPinnedDate) : null,
          position: typeof newTodo.position === "number" ? newTodo.position : nextPosition,
        }
        // 用服务器返回的真实 todo 替换临时 todo（使用函数式更新）
        setTodos((prevTodos) => {
          const safePrevTodos = Array.isArray(prevTodos) ? prevTodos : []
          // 查找临时 todo 的索引
          const tempIndex = safePrevTodos.findIndex((todo) => todo.id === tempId)
          if (tempIndex !== -1) {
            // 替换临时 todo，保持位置不变
            const newTodos = [...safePrevTodos]
            newTodos[tempIndex] = formattedTodo
            return newTodos
          } else {
            // 如果没有找到临时 todo，检查是否已存在相同 ID 的 todo（防止重复）
            const existingIndex = safePrevTodos.findIndex((todo) => todo.id === formattedTodo.id)
            if (existingIndex !== -1) {
              // 如果已存在，更新它
              const newTodos = [...safePrevTodos]
              newTodos[existingIndex] = formattedTodo
              return newTodos
            } else {
              // 如果不存在，直接添加到末尾
              return [...safePrevTodos, formattedTodo]
            }
          }
        })
        showSuccess("创建成功", "待办事项已创建")
        // 记录最近一次创建上下文，供 Ctrl/Cmd + K 复用
        setLastCreateContext({
          status,
          customStatusId: customStatusId || null,
        })
      } else {
        // 失败时回滚：移除临时 todo（使用函数式更新）
        setTodos((prevTodos) => (Array.isArray(prevTodos) ? prevTodos : []).filter((todo) => todo.id !== tempId))
        const data = await response.json()
        showError("创建失败", data.error || "创建失败")
      }
    } catch (error) {
      // 失败时回滚：移除临时 todo（使用函数式更新）
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== tempId))
      console.error("创建失败:", error)
      showError("创建失败", "创建失败，请稍后重试")
    }
  }

  const handleEditStatus = (status: UserCustomStatus) => {
    setEditingStatus(status)
    setIsEditStatusOpen(true)
  }

  const handleDeleteStatus = async (status: UserCustomStatus) => {
    const confirmed = await confirm.confirm({
      title: "删除自定义状态",
      message: `确定要删除状态"${status.name}"吗？如果该状态下有待办事项，将无法删除。`,
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/custom-statuses/${status.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        showSuccess("删除成功", "自定义状态已删除")
        fetchCustomStatuses()
        fetchTodos() // 刷新待办事项列表
      } else {
        const data = await response.json()
        showError("删除失败", data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
      showError("删除失败", "删除失败，请稍后重试")
    }
  }

  // 多选相关函数（支持 Ctrl/Cmd + Click 与 Shift + Click 区间选择）
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  // 按照当前 UI 展示顺序获取所有可见 todo 的 id（状态组 + 自定义状态组）
  const getAllVisibleTodoIds = () => {
    const ids: string[] = []
    const source = displayedTodos
    // 状态组顺序：进行中 -> 等待中 -> 已完成（与渲染顺序保持一致）
    getTodosForStatus("IN_PROGRESS", undefined, source).forEach((t) => ids.push(t.id))
    getTodosForStatus("WAIT", null, source).forEach((t) => ids.push(t.id))
    getTodosForStatus("COMPLETE", undefined, source).forEach((t) => ids.push(t.id))
    // 自定义状态组（根据 position 排序），每个组内部按 position 排序
    const sortedCustom = [...customStatuses].sort((a, b) => a.position - b.position)
    sortedCustom.forEach((cs) => {
      getTodosForStatus("WAIT", cs.id, source).forEach((t) => ids.push(t.id))
    })
    return ids
  }

  const handleTodoSelect = (todoId: string, isMultiSelect: boolean, event?: MouseEvent | React.MouseEvent) => {
    const allVisibleIds = getAllVisibleTodoIds()

    setSelectedTodoIds((prev) => {
      const newSet = new Set(prev)

      const isShift = !!(event && "shiftKey" in event && event.shiftKey)

      if (isShift && lastSelectedId && allVisibleIds.length > 0) {
        const startIndex = allVisibleIds.indexOf(lastSelectedId)
        const endIndex = allVisibleIds.indexOf(todoId)
        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
          for (let i = from; i <= to; i++) {
            const id = allVisibleIds[i]
            if (id) newSet.add(id)
          }
          return newSet
        }
      }

      // 点击复选框：简单的 toggle 操作，不影响其他选中项
      if (newSet.has(todoId)) {
        newSet.delete(todoId)
      } else {
        newSet.add(todoId)
      }

      return newSet
    })

    setLastSelectedId(todoId)
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    const targetIds = displayedTodos.map((todo) => todo.id)
    if (targetIds.length === 0) {
      setSelectedTodoIds(new Set())
      return
    }

    const isAllSelected = targetIds.every((id) => selectedTodoIds.has(id))
    if (isAllSelected) {
      const next = new Set(selectedTodoIds)
      targetIds.forEach((id) => next.delete(id))
      setSelectedTodoIds(next)
    } else {
      const next = new Set(selectedTodoIds)
      targetIds.forEach((id) => next.add(id))
      setSelectedTodoIds(next)
    }
  }

  const handleTodoArchivedCleanup = useCallback((todoId: string) => {
    setSelectedTodoIds((prev) => {
      if (!prev.has(todoId)) {
        return prev
      }
      const next = new Set(prev)
      next.delete(todoId)
      return next
    })
  }, [])

  // 批量更新
  const handleBatchUpdate = async (updates: {
    status?: TodoStatus
    customStatusId?: string | null
    priority?: Priority
    tags?: string[]
    todayPinnedDate?: string | null
    dueDate?: string | null
  }) => {
    if (selectedTodoIds.size === 0) return

    const todoIds = Array.from(selectedTodoIds)
    
    try {
      const response = await fetch("/api/todos/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todoIds,
          updates,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // 更新本地状态
        const updatedTodosMap = new Map<string, Todo>(
          data.todos.map((todo: Todo) => [todo.id, todo])
        )
        setTodos(
          todos.map((todo) => updatedTodosMap.get(todo.id) || todo)
        )
        // 清空选择
        handleClearSelection()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "批量更新失败")
      }
    } catch (error) {
      console.error("批量更新失败:", error)
      throw error
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedTodoIds.size === 0) return

    const todoIds = Array.from(selectedTodoIds)
    const count = todoIds.length
    
    try {
      const response = await fetch("/api/todos/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoIds }),
      })

      if (response.ok) {
        // 从本地状态中删除
        setTodos(todos.filter((todo) => !selectedTodoIds.has(todo.id)))
        // 清空选择
        handleClearSelection()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "批量删除失败")
      }
    } catch (error) {
      console.error("批量删除失败:", error)
      const errorMessage = error instanceof Error ? error.message : "批量删除失败，请稍后重试"
      showError("批量删除失败", errorMessage)
      throw error
    }
  }

  // 批量归档
  const handleBatchArchive = async () => {
    if (selectedTodoIds.size === 0) return

    const todoIds = Array.from(selectedTodoIds)
    const selectedItems = todos.filter((todo) => selectedTodoIds.has(todo.id))
    if (selectedItems.length === 0) {
      throw new Error(ARCHIVE_CANCELLED_ERROR)
    }
    const hasIncomplete = selectedItems.some((todo) => todo.status !== "COMPLETE")
    if (hasIncomplete) {
      const proceed = await confirm.confirm({
        title: "发现未完成的待办",
        message:
          "选择的项目中存在未完成项目，未完成的待办归档会记录到未完成归档箱。如非特殊需求建议使用自动归档，是否继续归档？",
        variant: "default",
        confirmText: "继续归档",
        cancelText: "取消",
      })
      if (!proceed) {
        throw new Error(ARCHIVE_CANCELLED_ERROR)
      }
    }
    
    try {
      const response = await fetch("/api/todos/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoIds }),
      })

      if (response.ok) {
        // 从当前列表移除已归档项目
        setTodos((prevTodos) => {
          const safePrev = Array.isArray(prevTodos) ? prevTodos : []
          return safePrev.filter((todo) => !selectedTodoIds.has(todo.id))
        })
        return
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "批量归档失败")
      }
    } catch (error) {
      console.error("批量归档失败:", error)
      throw error instanceof Error ? error : new Error("批量归档失败")
    }
  }

  const handleBatchAddToToday = useCallback(async () => {
    if (selectedTodoIds.size === 0) return

    const selectedList = todos.filter((todo) => selectedTodoIds.has(todo.id))
    if (selectedList.length === 0) return

    const todayStart = startOfDay(new Date())
    const tomorrowStart = startOfDay(addDays(todayStart, 1))
    const idsWithDueDate = selectedList.filter((todo) => todo.dueDate).map((todo) => todo.id)
    const idsWithoutDueDate = selectedList.filter((todo) => !todo.dueDate).map((todo) => todo.id)
    const updatedTodos: Todo[] = []

    const sendBatchRequest = async (ids: string[], includeDueDate: boolean) => {
      if (ids.length === 0) return
      const payload: any = {
        todoIds: ids,
        updates: {
          todayPinnedDate: todayStart.toISOString(),
        },
      }
      if (includeDueDate) {
        payload.updates.dueDate = tomorrowStart.toISOString()
      }

      const response = await fetch("/api/todos/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "批量加入今日失败")
      }

      const data = await response.json()
      if (Array.isArray(data?.todos)) {
        updatedTodos.push(...data.todos.map(normalizeTodoDates))
      } else {
        // 如果接口未返回详细信息，手动合成
        ids.forEach((id) => {
          const target = todos.find((todo) => todo.id === id)
          if (target) {
            updatedTodos.push({
              ...target,
              todayPinnedDate: todayStart,
              dueDate: includeDueDate
                ? tomorrowStart
                : target.dueDate
                  ? new Date(target.dueDate)
                  : null,
            })
          }
        })
      }
    }

    await sendBatchRequest(idsWithDueDate, false)
    await sendBatchRequest(idsWithoutDueDate, true)

    if (updatedTodos.length > 0) {
      setTodos((prev) => {
        const safePrev = Array.isArray(prev) ? prev : []
        const updatedMap = new Map(safePrev.map((todo) => [todo.id, todo]))
        updatedTodos.forEach((todo) => {
          updatedMap.set(todo.id, todo)
        })
        return Array.from(updatedMap.values())
      })
    }

    handleClearSelection()
  }, [selectedTodoIds, todos, setTodos, handleClearSelection])

  const waitTodos = getTodosForStatus("WAIT", null, displayedTodos)
  const inProgressTodos = getTodosForStatus("IN_PROGRESS", undefined, displayedTodos)
  const completeTodos = getTodosForStatus("COMPLETE", undefined, displayedTodos)
  
  // 按自定义状态分组（即使为空也显示）
  const sortedCustomStatuses = [...customStatuses].sort((a, b) => a.position - b.position)
  const customStatusGroups = sortedCustomStatuses
    .map((cs) => ({
      status: cs,
      todos: getTodosForStatus("WAIT", cs.id, displayedTodos),
    }))
    // 即使为空也显示，方便创建对应状态的 Todo

  const statusConfig: Record<TodoStatus, { label: string; color: string }> = {
    WAIT: { label: "等待中", color: "#6b7280" }, // gray-500 - 灰色
    IN_PROGRESS: { label: "进行中", color: "#2563eb" }, // blue-600 - 更深的蓝色
    COMPLETE: { label: "已完成", color: "#10b981" }, // emerald-500 - 鲜艳的绿色
  }

  const getStatusIcon = (status: TodoStatus) => {
    switch (status) {
      case "WAIT":
        return <Circle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
      case "IN_PROGRESS":
        return <Radio className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
      case "COMPLETE":
        return <CheckCircle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
      default:
        return <Radio className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
    }
  }

  const renderStatusGroup = (
    status: TodoStatus,
    label: string,
    color: string,
    statusTodos: typeof todos,
    customStatusId?: string | null
  ) => {
    const isCreating =
      creatingStatus?.status === status &&
      (creatingStatus?.customStatusId ?? null) === (customStatusId ?? null)
    // 即使为空也显示，方便创建对应状态的 Todo
    const statusId = getStatusId(status, customStatusId)
    const todoIds = statusTodos.map((t) => t.id)

    return (
      <div key={`${status}-${customStatusId || ""}`} className="space-y-0.5 sm:space-y-1">
        <StatusDropTarget id={statusId}>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              className={cn(
                "h-5 sm:h-9 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium text-white !opacity-100 flex items-center justify-center min-w-[70px]",
                !color.startsWith("#") && color
              )}
              style={
                color.startsWith("#")
                  ? { 
                      backgroundColor: color,
                      color: "#ffffff",
                    }
                  : undefined
              }
              disabled
            >
              <span className="flex items-center justify-center">
                {getStatusIcon(status)}
              </span>
              <span className="ml-0.5 sm:ml-1.5">{label}</span>
              <span className="ml-1 sm:ml-2 opacity-75 text-[10px] sm:text-sm">{statusTodos.length}</span>
            </Button>
          </div>
        </StatusDropTarget>

        <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5 ml-2 sm:ml-6">
            {statusTodos.map((todo) => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                onUpdate={() => {
                }}
                customStatuses={customStatuses}
                isSelected={selectedTodoIds.has(todo.id)}
                onSelect={handleTodoSelect}
                onArchive={handleTodoArchivedCleanup}
              />
            ))}

            {isCreating ? (
              <InlineTodoCreator
                defaultStatus={status}
                defaultCustomStatusId={customStatusId}
                onSave={(title) => handleCreateTodo(title, status, customStatusId)}
                onCancel={() => setCreatingStatus(null)}
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground text-[10px] sm:text-sm h-6 sm:h-8"
                onClick={() => setCreatingStatus({ status, customStatusId: customStatusId ?? null })}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                添加待办
              </Button>
            )}
          </div>
        </SortableContext>
      </div>
    )
  }

  const selectedDisplayedCount = displayedTodos.reduce(
    (count, todo) => (selectedTodoIds.has(todo.id) ? count + 1 : count),
    0
  )
  const allSelected =
    displayedTodos.length > 0 && selectedDisplayedCount === displayedTodos.length
  const someSelected =
    selectedDisplayedCount > 0 && selectedDisplayedCount < displayedTodos.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">待办事项</h2>
          {displayedTodos.length > 0 && viewMode !== "archive" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="rounded-lg"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 mr-2" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                {allSelected ? "取消全选" : "全选"}
              </Button>
              {someSelected && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-muted-foreground"
                >
                  已选择 {selectedDisplayedCount} / {displayedTodos.length}
                </motion.span>
              )}
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border bg-muted/50 p-1">
            {(
              [
                { mode: "today", label: "今日任务" },
                { mode: "current", label: "当前任务" },
                { mode: "archive", label: "归档" },
              ] as const
            ).map(({ mode, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setViewMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateStatusOpen(true)}
            className="rounded-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加状态
          </Button>
        </div>
      </div>

      {viewMode !== "archive" && (
        <div className="relative rounded-2xl border border-card-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-lg text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      状态
                      {(filters.statuses.length + filters.customStatusIds.length) > 0 && (
                        <Badge variant="secondary" className="ml-1 sm:ml-2 text-[8px] sm:text-xs px-1 sm:px-2 py-0">
                          {filters.statuses.length + filters.customStatusIds.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60">
                    <DropdownMenuLabel>基础状态</DropdownMenuLabel>
                    {baseStatusOptions.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={filters.statuses.includes(option.value)}
                        onCheckedChange={() => toggleStatusFilter(option.value)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: statusConfig[option.value].color }}
                        />
                        <span>{option.label}</span>
                      </DropdownMenuCheckboxItem>
                    ))}
                    {customStatuses.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>自定义状态</DropdownMenuLabel>
                        {customStatuses.map((status) => (
                          <DropdownMenuCheckboxItem
                            key={status.id}
                            checked={filters.customStatusIds.includes(status.id)}
                            onCheckedChange={() => toggleCustomStatusFilter(status.id)}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: status.color || "#6b7280" }}
                            />
                            <span>{status.name}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-lg text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
                      优先级
                      {filters.priorities.length > 0 && (
                        <Badge variant="secondary" className="ml-1 sm:ml-2 text-[8px] sm:text-xs px-1 sm:px-2 py-0">
                          {filters.priorities.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-44">
                    {priorityOptions.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={filters.priorities.includes(option.value)}
                        onCheckedChange={() => togglePriorityFilter(option.value)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: priorityColorConfig[option.value] }}
                        />
                        <span>{option.label}</span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3"
                onClick={() => setIsFilterExpanded((prev) => !prev)}
              >
                高级筛选
                <motion.span
                  animate={{ rotate: isFilterExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="inline-block"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </Button>
            </motion.div>
          </div>

          <AnimatePresence initial={false}>
            {isFilterExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-2"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button variant="outline" size="sm" className="rounded-lg">
                        {selectedViewName ? `视图：${selectedViewName}` : "视图：默认"}
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    <DropdownMenuLabel>我的视图</DropdownMenuLabel>
                    {savedViews.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-muted-foreground">暂无保存视图</div>
                    ) : (
                      savedViews.map((view) => (
                        <DropdownMenuItem
                          key={view.id}
                          className="flex items-center justify-between gap-2"
                          onClick={() => handleSelectView(view.id)}
                        >
                          <span className="truncate">{view.name}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              handleDeleteView(view.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </DropdownMenuItem>
                      ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleSelectView(null)}>
                      恢复默认视图
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setIsSaveViewDialogOpen(true)}
                  >
                    保存当前视图
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={handleResetFilters}
                  >
                    清除筛选
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isFilterExpanded && (
              <motion.div
                key="advanced-filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">截止时间</span>
                  <Input
                    type="date"
                    value={filters.dueFrom}
                    onChange={(e) => handleDueDateChange("dueFrom", e.target.value)}
                    className="h-9 w-40"
                  />
                  <span className="text-xs text-muted-foreground">至</span>
                  <Input
                    type="date"
                    value={filters.dueTo}
                    onChange={(e) => handleDueDateChange("dueTo", e.target.value)}
                    className="h-9 w-40"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="输入标签后回车添加"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      className="h-7 sm:h-9 max-w-sm text-[11px] sm:text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={handleTagAdd} className="rounded-lg text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
                      添加标签
                    </Button>
                  </div>
                  {filters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-0.5 sm:gap-1 py-0.5 sm:py-1 px-1.5 sm:px-2 text-[9px] sm:text-xs"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleTagRemove(tag)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  {hasActiveFilters ? (
                    <span>当前已应用 {activeFilterCount} 项筛选</span>
                  ) : (
                    <span>未应用筛选，显示全部任务</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {viewMode === "archive" ? (
        <ArchivePanel />
      ) : isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <DragOverlay>
            {activeDragId && (
              <BatchDragOverlay
                todos={todos}
                activeId={activeDragId}
                selectedIds={selectedTodoIds}
              />
            )}
          </DragOverlay>
          <div className="space-y-6">
            {renderStatusGroup("IN_PROGRESS", statusConfig.IN_PROGRESS.label, statusConfig.IN_PROGRESS.color, inProgressTodos)}
            {renderStatusGroup("WAIT", statusConfig.WAIT.label, statusConfig.WAIT.color, waitTodos)}
            {renderStatusGroup("COMPLETE", statusConfig.COMPLETE.label, statusConfig.COMPLETE.color, completeTodos)}
            {customStatusGroups.length > 0 && (
              <SortableContext
                items={customStatusGroups.map((g) => g.status.id)}
                strategy={verticalListSortingStrategy}
              >
                {customStatusGroups.map((group) => (
                  <SortableStatusGroup
                    key={group.status.id}
                    id={group.status.id}
                    status="custom"
                    label={group.status.name}
                    color={group.status.color || "#6b7280"}
                    count={group.todos.length}
                    icon={<Radio className="h-3 w-3 mr-1.5" />}
                    onEdit={() => handleEditStatus(group.status)}
                    onDelete={() => handleDeleteStatus(group.status)}
                  >
                    <SortableContext
                      items={group.todos.map((todo) => todo.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1 ml-8">
                        {group.todos.map((todo) => (
                          <SortableTodoItem
                            key={todo.id}
                            todo={todo}
                            onUpdate={() => {
                              // 乐观更新后不需要立即刷新
                            }}
                            customStatuses={customStatuses}
                            isSelected={selectedTodoIds.has(todo.id)}
                            onSelect={handleTodoSelect}
                            onArchive={handleTodoArchivedCleanup}
                          />
                        ))}
                        {creatingStatus?.status === "WAIT" && creatingStatus?.customStatusId === group.status.id ? (
                          <InlineTodoCreator
                            defaultStatus="WAIT"
                            defaultCustomStatusId={group.status.id}
                            onSave={(title) => handleCreateTodo(title, "WAIT", group.status.id)}
                            onCancel={() => setCreatingStatus(null)}
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground hover:text-foreground"
                            onClick={() => setCreatingStatus({ status: "WAIT", customStatusId: group.status.id })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            添加待办
                          </Button>
                        )}
                      </div>
                    </SortableContext>
                  </SortableStatusGroup>
                ))}
              </SortableContext>
            )}
            {displayedTodos.length === 0 && !creatingStatus && customStatusGroups.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {viewMode === "today"
                  ? "今日暂无任务，添加或从全部任务中挑选一个吧。"
                  : "还没有待办事项，点击上方按钮创建一个开始吧！"}
              </div>
            )}
          </div>
        </DndContext>
      )}

      {viewMode !== "archive" && (
        <TodoCommandPalette
          open={isCommandPaletteOpen}
          onOpenChange={setIsCommandPaletteOpen}
          todos={todos}
          commands={[
            {
              id: "create-todo",
              label: "创建待办",
              description: "在最近使用的状态列中打开内联创建",
              onExecute: () => focusOrCreateInlineCreator(),
            },
            {
              id: "switch-archive",
              label: "切换到归档视图",
              description: "查看历史归档记录与统计",
              onExecute: () => setViewMode("archive"),
            },
            {
              id: "open-archive-settings",
              label: "打开归档设置",
              description: "配置自动归档与清理策略",
              onExecute: () => {
                window.location.href = "/dashboard/archive-settings"
              },
            },
          ]}
          onSelectTodo={(todo) => {
            const wrapper = document.getElementById(`todo-${todo.id}`)
            if (!wrapper) return

            wrapper.scrollIntoView({ behavior: "smooth", block: "center" })

            window.setTimeout(() => {
              const card = wrapper.querySelector<HTMLElement>(".cursor-pointer")
              const target = card ?? wrapper
              const highlightClasses = [
                "ring-2",
                "ring-primary",
                "ring-offset-2",
                "ring-offset-background",
                "shadow-lg",
                "transition-all",
                "duration-300",
              ]

              target.classList.add(...highlightClasses)

              // 触发一次点击，复用现有 TodoItem 打开详情面板的逻辑
              card?.click()

              // 一段时间后移除高亮效果
              window.setTimeout(() => {
                target.classList.remove(...highlightClasses)
              }, 1200)
            }, 350)
          }}
        />
      )}

      <Dialog
        open={isSaveViewDialogOpen}
        onOpenChange={(open) => {
          setIsSaveViewDialogOpen(open)
          if (!open) {
            setNewViewName("")
            setIsSavingView(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存当前筛选为视图</DialogTitle>
            <DialogDescription>为当前筛选条件命名，方便下次快速引用。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="输入视图名称"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              disabled={isSavingView}
            />
            <p className="text-xs text-muted-foreground">
              将保存当前的状态、优先级、日期范围和标签筛选条件。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveViewDialogOpen(false)}
              disabled={isSavingView}
            >
              取消
            </Button>
            <Button onClick={handleSaveView} disabled={isSavingView}>
              {isSavingView ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateCustomStatusDialog
        open={isCreateStatusOpen}
        onOpenChange={setIsCreateStatusOpen}
        onSuccess={() => {
          fetchCustomStatuses()
        }}
      />

      <EditCustomStatusDialog
        open={isEditStatusOpen}
        onOpenChange={setIsEditStatusOpen}
        status={editingStatus}
        onSuccess={() => {
          fetchCustomStatuses()
          fetchTodos() // 刷新待办事项列表以更新状态颜色
        }}
      />

      {viewMode !== "archive" && (
        <BatchActionBar
          selectedIds={Array.from(selectedTodoIds)}
          onClearSelection={handleClearSelection}
          onBatchUpdate={handleBatchUpdate}
          onBatchDelete={handleBatchDelete}
          onBatchArchive={handleBatchArchive}
          customStatuses={customStatuses}
          onBatchAddToToday={handleBatchAddToToday}
        />
      )}
    </div>
  )
}


