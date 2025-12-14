"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, addDays } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Archive,
  CheckCircle,
  History,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTodoStore, Todo, ArchiveBucket, Priority, TodoStatus } from "@/store/todoStore"
import { TodoDetailPanel } from "./TodoDetailPanel"
import { useNotification } from "@/components/ui/notification"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface DayGroup {
  key: string
  date: Date
  todos: Todo[]
}

interface ArchiveLogDay {
  date: string
  finished: number
  unfinished: number
  entries: Array<{
    id: string
    bucket: ArchiveBucket
    reason: string | null
    autoArchived: boolean
    archivedAt: string
    snapshot?: {
      title?: string
    }
  }>
}

const bucketLabels: Record<ArchiveBucket, string> = {
  FINISHED: "Finished",
  UNFINISHED: "Unfinished",
}

const priorityDisplay: Record<Priority, { label: string; color: string }> = {
  LOW: { label: "低", color: "#10b981" },
  MEDIUM: { label: "中", color: "#2563eb" },
  HIGH: { label: "高", color: "#f97316" },
  URGENT: { label: "紧急", color: "#ef4444" },
}

const statusLabels: Record<TodoStatus, string> = {
  WAIT: "等待中",
  IN_PROGRESS: "进行中",
  COMPLETE: "已完成",
}

export function ArchivePanel() {
  const archivedTodos = useTodoStore((state) => state.archivedTodos)
  const archiveFilters = useTodoStore((state) => state.archiveFilters)
  const archivePagination = useTodoStore((state) => state.archivePagination)
  const isArchiveLoading = useTodoStore((state) => state.isArchiveLoading)
  const setArchiveFilters = useTodoStore((state) => state.setArchiveFilters)
  const fetchArchivedTodos = useTodoStore((state) => state.fetchArchivedTodos)
  const { showSuccess, showError, showInfo } = useNotification()

  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false)
  const [selectedBucketView, setSelectedBucketView] = useState<{
    date: Date
    bucket: ArchiveBucket
    todos: Todo[]
  } | null>(null)
  const [logDays, setLogDays] = useState<ArchiveLogDay[]>([])
  const [isLogLoading, setIsLogLoading] = useState(false)

  useEffect(() => {
    fetchArchivedTodos({ page: 1 })
  }, [fetchArchivedTodos])

  const groupedByDay = useMemo<DayGroup[]>(() => {
    const groups: Record<string, DayGroup> = {}

    archivedTodos.forEach((todo) => {
      const dateSource = todo.archivedAt || todo.updatedAt || new Date()
      const key = format(dateSource, "yyyy-MM-dd")

      if (!groups[key]) {
        groups[key] = {
          key,
          date: new Date(key), // 使用统一的日期对象
          todos: [],
        }
      }
      groups[key].todos.push(todo)
    })

    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [archivedTodos])

  const overview = useMemo(() => {
    const finished = archivedTodos.filter((todo) => todo.archivedBucket === "FINISHED")
    const unfinished = archivedTodos.filter((todo) => todo.archivedBucket === "UNFINISHED")

    const latestFinished = finished[0]?.archivedAt
    const urgentUnfinished = unfinished.find((todo) => todo.dueDate)

    return {
      finishedCount: finished.length,
      unfinishedCount: unfinished.length,
      totalCount: archivedTodos.length,
      latestFinishedLabel: latestFinished
        ? format(latestFinished, "MM月dd日 HH:mm", { locale: zhCN })
        : "暂无记录",
      urgentUnfinishedReason: urgentUnfinished?.archivedReason ?? "暂无逾期说明",
      urgentUnfinished: urgentUnfinished,
    }
  }, [archivedTodos])

  const handleBucketSwitch = async (bucket: ArchiveBucket | "ALL") => {
    setArchiveFilters({ bucket })
    await fetchArchivedTodos({ page: 1, filters: { bucket } })
  }

  const handleQueryChange = async (value: string) => {
    setArchiveFilters({ query: value })
    await fetchArchivedTodos({ page: 1, filters: { query: value } })
  }

  const handleDateChange = async (type: "dateFrom" | "dateTo", value: string) => {
    const nextDate = value ? new Date(value) : null
    setArchiveFilters({ [type]: nextDate })
    await fetchArchivedTodos({ page: 1, filters: { [type]: nextDate } })
  }

  const openTodoDetail = (todo: Todo) => {
    setSelectedTodo(todo)
    setIsDetailOpen(true)
  }

  const handleRestore = async (todoIds: string[]) => {
    try {
      const response = await fetch("/api/todos/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNARCHIVE",
          todoIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "取消归档失败")
      }

      showSuccess("已恢复", `已恢复 ${todoIds.length} 个任务`)
      await fetchArchivedTodos({ page: 1 })
    } catch (error) {
      console.error(error)
      showError("操作失败", error instanceof Error ? error.message : "请稍后重试")
    }
  }

  const handleQuickDelay = async () => {
    const target = archivedTodos
      .filter((todo) => todo.archivedBucket === "UNFINISHED")
      .sort((a, b) => {
        const aDate = a.dueDate?.getTime() ?? 0
        const bDate = b.dueDate?.getTime() ?? 0
        return aDate - bDate
      })[0]

    if (!target || !target.dueDate) {
      showInfo("暂无可延期任务", "没有找到可自动延期的未完成任务")
      return
    }

    try {
      const newDueDate = addDays(target.dueDate, 1)
      const response = await fetch(`/api/todos/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: newDueDate.toISOString(),
          archivedAt: null,
          archivedBucket: null,
          archivedReason: null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "延期失败")
      }

      showSuccess("已延期", `${target.title} 已顺延至 ${format(newDueDate, "MM月dd日")}`)
      await fetchArchivedTodos({ page: 1 })
    } catch (error) {
      console.error(error)
      showError("延期失败", error instanceof Error ? error.message : "请稍后重试")
    }
  }

  const handleDelayTodo = async (todo: Todo, days = 1) => {
    if (!todo.dueDate) {
      showInfo("无法延期", "该任务没有截止时间")
      return
    }
    try {
      const newDueDate = addDays(todo.dueDate, days)
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: newDueDate.toISOString(),
          archivedAt: null,
          archivedBucket: null,
          archivedReason: null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "延期失败")
      }

      showSuccess("已延期", `${todo.title} 已顺延至 ${format(newDueDate, "MM月dd日")}`)
      await fetchArchivedTodos({ page: 1 })
    } catch (error) {
      console.error(error)
      showError("延期失败", error instanceof Error ? error.message : "请稍后重试")
    }
  }

  useEffect(() => {
    if (!isLogDrawerOpen) return
    const loadLogs = async () => {
      setIsLogLoading(true)
      try {
        const response = await fetch("/api/todo-archive-logs?days=14")
        if (!response.ok) {
          throw new Error("归档日志获取失败")
        }
        const data = await response.json()
        setLogDays(data?.days ?? [])
      } catch (error) {
        console.error(error)
        showError("加载日志失败", error instanceof Error ? error.message : "请稍后重试")
      } finally {
        setIsLogLoading(false)
      }
    }
    loadLogs()
  }, [isLogDrawerOpen, showError])

  const loadNextPage = async () => {
    const nextPage = archivePagination.page + 1
    await fetchArchivedTodos({ page: nextPage })
  }

const renderOverviewCard = (
  key: string,
  {
    title,
    value,
    description,
    backgroundClass,
    textClass,
    bucket,
    actionText,
    onAction,
    icon,
    iconColorClass,
  }: {
    title: string
    value: string
    description: string
    backgroundClass: string
    textClass?: string
    bucket: ArchiveBucket | "ALL"
    actionText: string
    onAction?: () => void
    icon: ReactNode
    iconColorClass?: string
  }
) => (
    <motion.div
      key={key}
      layout
      whileHover={{ y: -4 }}
      className={cn(
      "rounded-2xl border p-6 shadow-sm transition-all cursor-pointer",
      backgroundClass,
      textClass
      )}
      onClick={() => handleBucketSwitch(bucket)}
    >
    <div className="flex items-center justify-between">
        <div>
        <p className="text-sm text-slate-900/80 dark:text-slate-100/70">{title}</p>
          <p className="text-3xl font-semibold mt-2">{value}</p>
        </div>
      <div
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center shadow-inner",
          "bg-white/80 text-slate-900 dark:bg-white/10 dark:text-white",
          iconColorClass
        )}
      >
        <span className="h-6 w-6">{icon}</span>
        </div>
      </div>
    <p className="mt-4 text-sm text-slate-900/70 dark:text-slate-100/70">{description}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 px-2"
        onClick={(event) => {
          event.stopPropagation()
          if (onAction) {
            onAction()
          } else {
            handleBucketSwitch(bucket)
          }
        }}
      >
        {actionText}
        <ArrowUpRight className="h-4 w-4 ml-1" />
      </Button>
    </motion.div>
  )

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border p-1 bg-muted/50 shadow-inner">
            {(["ALL", "FINISHED", "UNFINISHED"] as const).map((bucket) => (
              <Button
                key={bucket}
                variant={archiveFilters.bucket === bucket ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-full px-4 text-sm",
                  archiveFilters.bucket === bucket && "shadow-sm"
                )}
                onClick={() => handleBucketSwitch(bucket)}
              >
                {bucket === "ALL" ? "全部" : bucketLabels[bucket]}
              </Button>
            ))}
          </div>
          <Input
            placeholder="搜索归档任务..."
            className="w-56"
            value={archiveFilters.query ?? ""}
            onChange={(event) => handleQueryChange(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={
                archiveFilters.dateFrom
                  ? format(archiveFilters.dateFrom, "yyyy-MM-dd")
                  : ""
              }
              onChange={(event) => handleDateChange("dateFrom", event.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground text-sm">至</span>
            <Input
              type="date"
              value={
                archiveFilters.dateTo ? format(archiveFilters.dateTo, "yyyy-MM-dd") : ""
              }
              onChange={(event) => handleDateChange("dateTo", event.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchArchivedTodos({ page: 1 })}>
              刷新
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLogDrawerOpen(true)}
              className="gap-1"
            >
              <History className="h-4 w-4" />
              归档日志
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href="/dashboard/archive-settings" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                归档设置
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {renderOverviewCard("finished", {
            title: "Finished 已完成",
            value: `${overview.finishedCount} 条`,
            description: `最近完成时间：${overview.latestFinishedLabel}`,
            backgroundClass: "bg-emerald-500/20 border-emerald-600/30",
            textClass: "text-emerald-950 dark:text-emerald-50",
            bucket: "FINISHED",
            actionText: "查看完成记录",
            icon: <CheckCircle className="h-6 w-6" />,
            iconColorClass: "text-emerald-800 dark:text-emerald-200",
          })}
          {renderOverviewCard("unfinished", {
            title: "Unfinished 未完成",
            value: `${overview.unfinishedCount} 条`,
            description: overview.urgentUnfinishedReason,
            backgroundClass: "bg-amber-400/30 border-amber-500/40",
            textClass: "text-amber-900 dark:text-amber-50",
            bucket: "UNFINISHED",
            actionText: "快速延期",
            onAction: handleQuickDelay,
            icon: <AlertTriangle className="h-6 w-6" />,
            iconColorClass: "text-amber-800 dark:text-amber-100",
          })}
          {renderOverviewCard("all", {
            title: "全部归档",
            value: `${overview.totalCount} 条`,
            description: "包含全部 Finished / Unfinished 记录",
            backgroundClass: "bg-blue-500/20 border-blue-500/30",
            textClass: "text-blue-950 dark:text-blue-50",
            bucket: "ALL",
            actionText: "打开归档列表",
            icon: <Archive className="h-6 w-6" />,
            iconColorClass: "text-blue-800 dark:text-blue-100",
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              按日期查看
            </h3>
            <p className="text-sm text-muted-foreground">每日归档快照，支持快速处理</p>
          </div>
          {isArchiveLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              加载中
            </div>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {groupedByDay.length === 0 && !isArchiveLoading && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-xl border border-dashed p-10 text-center text-muted-foreground"
            >
              还没有归档数据，完成或逾期的任务会自动出现在这里。
            </motion.div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {groupedByDay.map((group, index) => {
              const finishedCount = group.todos.filter(
                (todo) => todo.archivedBucket === "FINISHED"
              ).length
              const unfinishedCount = group.todos.length - finishedCount
              const finishedTodos = group.todos.filter((todo) => todo.archivedBucket === "FINISHED")
              const unfinishedTodos = group.todos.filter((todo) => todo.archivedBucket !== "FINISHED")

              return (
                <motion.div
                  key={`archive-day-${group.key}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="rounded-2xl border p-4 shadow-sm bg-card space-y-4"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {format(group.date, "yyyy 年 MM 月 dd 日 EEEE", { locale: zhCN })}
                      </p>
                      <p className="text-lg font-semibold">共 {group.todos.length} 条记录</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Finished {finishedCount}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Unfinished {unfinishedCount}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border p-4 bg-muted/30 cursor-pointer hover:border-emerald-400/60 transition-colors"
                      onClick={() =>
                        setSelectedBucketView({
                          date: group.date,
                          bucket: "FINISHED",
                          todos: finishedTodos,
                        })
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Finished 已完成</p>
                          <p className="text-xl font-semibold mt-1">{finishedCount} 条</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        点击查看该日期内所有已完成的归档任务
                      </p>
                    </motion.div>
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border p-4 bg-muted/30 cursor-pointer hover:border-amber-400/60 transition-colors"
                      onClick={() =>
                        setSelectedBucketView({
                          date: group.date,
                          bucket: "UNFINISHED",
                          todos: unfinishedTodos,
                        })
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Unfinished 未完成</p>
                          <p className="text-xl font-semibold mt-1">{unfinishedCount} 条</p>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        点击查看该日期内所有未完成的归档任务
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>

        {archivePagination.page * archivePagination.pageSize < archivePagination.total && (
          <div className="text-center">
            <Button variant="outline" onClick={loadNextPage} disabled={isArchiveLoading}>
              {isArchiveLoading ? "加载中..." : "加载更多记录"}
            </Button>
          </div>
        )}
      </div>

      <Sheet open={Boolean(selectedBucketView)} onOpenChange={(open) => !open && setSelectedBucketView(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selectedBucketView
                ? `${format(selectedBucketView.date, "yyyy 年 MM 月 dd 日", { locale: zhCN })} · ${
                    bucketLabels[selectedBucketView.bucket]
                  }（${selectedBucketView.todos.length} 条）`
                : "归档详情"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {selectedBucketView?.todos.length ? (
              selectedBucketView.todos.map((todo) => {
                const statusLabel = todo.customStatus?.name || statusLabels[todo.status]
                const priorityMeta = priorityDisplay[todo.priority]
                return (
                  <div key={todo.id} className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-semibold truncate">
                            {todo.title || "未命名待办"}
                          </h4>
                          {todo.archivedReason && (
                            <Badge variant="outline" className="text-xs">
                              {todo.archivedReason}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          归档于{" "}
                          {format(todo.archivedAt ?? new Date(), "yyyy/MM/dd HH:mm", { locale: zhCN })}{" "}
                          · {todo.archivedBySystem ? "自动归档" : "手动归档"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openTodoDetail(todo)
                        }}
                      >
                        查看详情
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>状态：{statusLabel}</span>
                      <span className="flex items-center gap-1">
                        优先级：
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-xs"
                          style={{ backgroundColor: priorityMeta.color }}
                        >
                          {priorityMeta.label}
                        </span>
                      </span>
                      <span>
                        截止：
                        {todo.dueDate
                          ? format(todo.dueDate, "yyyy/MM/dd HH:mm", { locale: zhCN })
                          : "未设置"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRestore([todo.id])}>
                        恢复
                      </Button>
                      {todo.dueDate && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelayTodo(todo)}>
                          延期一天
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">暂无记录</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isLogDrawerOpen} onOpenChange={setIsLogDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>归档日志</SheetTitle>
            <p className="text-sm text-muted-foreground">最近 14 天自动与手动归档记录</p>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {isLogLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载归档日志...
              </div>
            )}
            {!isLogLoading && logDays.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无日志数据。</p>
            )}
            {logDays.map((day) => (
              <div key={day.date} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{day.date}</p>
                    <p className="text-xs text-muted-foreground">
                      完成 {day.finished} · 未完成 {day.unfinished}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {day.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {(entry.snapshot as any)?.title ?? "未命名"}
                        </span>
                        <Badge variant="secondary">
                          {entry.bucket === "FINISHED" ? "Finished" : "Unfinished"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entry.archivedAt), "HH:mm")} ·{" "}
                        {entry.autoArchived ? "自动归档" : "手动归档"}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <TodoDetailPanel
        todo={selectedTodo}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={() => fetchArchivedTodos({ page: 1 })}
        readOnly
      />
    </div>
  )
}

