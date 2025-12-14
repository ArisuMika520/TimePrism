"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Command, Search, CheckCircle2 } from "lucide-react"
import type { Todo } from "@/store/todoStore"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

type CommandItem = {
  id: string
  label: string
  description?: string
  onExecute: () => void
}

type PaletteEntry =
  | { kind: "command"; item: CommandItem }
  | { kind: "todo"; item: Todo }

type PaletteSection =
  | { type: "commands"; title: string; items: CommandItem[] }
  | { type: "todos"; title: string; items: Todo[] }

interface TodoCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  todos: Todo[]
  commands: CommandItem[]
  onSelectTodo?: (todo: Todo) => void
}

function TodoPreview({ todo }: { todo: Todo }) {
  const due =
    todo.dueDate &&
    (() => {
      try {
        return format(new Date(todo.dueDate), "yyyy/MM/dd HH:mm", { locale: zhCN })
      } catch {
        return null
      }
    })()

  const statusColor =
    todo.status === "COMPLETE"
      ? "#10b981"
      : todo.status === "IN_PROGRESS"
      ? "#2563eb"
      : "#6b7280"

  const priorityColor =
    todo.priority === "URGENT"
      ? "#ef4444"
      : todo.priority === "HIGH"
      ? "#f97316"
      : todo.priority === "MEDIUM"
      ? "#2563eb"
      : "#10b981"

  return (
    <div className="h-full w-full flex flex-col gap-2 sm:gap-3 rounded-xl border border-border/70 bg-background/90 backdrop-blur-xl shadow-xl p-2 sm:p-4">
      <div className="space-y-0.5 sm:space-y-1">
        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">待办预览</div>
        <div className="text-sm sm:text-lg font-semibold leading-snug line-clamp-2">
          {todo.title || "未命名待办"}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
        {todo.status && (
          <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-background/60 px-1.5 sm:px-2 py-0.5 sm:py-1">
            <span
              className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span>状态：{todo.status}</span>
          </span>
        )}
        {todo.priority && (
          <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-background/60 px-1.5 sm:px-2 py-0.5 sm:py-1">
            <span
              className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full"
              style={{ backgroundColor: priorityColor }}
            />
            <span>优先级：{todo.priority}</span>
          </span>
        )}
        {due && (
          <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-background/60 px-1.5 sm:px-2 py-0.5 sm:py-1">
            <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-rose-500/80" />
            <span>结束：{due}</span>
          </span>
        )}
      </div>

      <div className="mt-1 sm:mt-2 flex-1 overflow-hidden rounded-lg border bg-background/95 p-2 sm:p-3">
        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">描述</div>
        <div className="max-h-32 sm:max-h-40 overflow-y-auto whitespace-pre-wrap text-xs sm:text-sm text-muted-foreground/90">
          {todo.description?.trim() ? todo.description : "暂无描述"}
        </div>
      </div>
    </div>
  )
}

export function TodoCommandPalette({
  open,
  onOpenChange,
  todos,
  commands,
  onSelectTodo,
}: TodoCommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<"right" | "bottom">("right")
  const listRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!showPreview || !containerRef.current) return
    
    const checkPosition = () => {
      const windowWidth = window.innerWidth
      setPreviewPosition(windowWidth < 1024 ? "bottom" : "right")
    }
    
    checkPosition()
    window.addEventListener("resize", checkPosition)
    return () => window.removeEventListener("resize", checkPosition)
  }, [showPreview])

  const lowerQuery = query.toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!lowerQuery) return commands
    return commands.filter((cmd) => {
      const text = (cmd.label + " " + (cmd.description || "")).toLowerCase()
      return text.includes(lowerQuery)
    })
  }, [commands, lowerQuery])

  const filteredTodos = useMemo(() => {
    if (!lowerQuery) return []
    return todos.filter((todo) => {
      const text = `${todo.title ?? ""} ${todo.description ?? ""}`.toLowerCase()
      return text.includes(lowerQuery)
    })
  }, [todos, lowerQuery])

  const sections: PaletteSection[] = useMemo(() => {
    const result: PaletteSection[] = []
    if (filteredCommands.length) {
      result.push({
        type: "commands",
        title: "命令",
        items: filteredCommands,
      })
    }
    if (filteredTodos.length) {
      result.push({
        type: "todos",
        title: "待办",
        items: filteredTodos,
      })
    }
    return result
  }, [filteredCommands, filteredTodos])

  const flatItems: PaletteEntry[] = useMemo(() => {
    const items: PaletteEntry[] = []
    sections.forEach((section) => {
      if (section.type === "commands") {
        section.items.forEach((cmd) => items.push({ kind: "command", item: cmd }))
      } else {
        section.items.forEach((todo) => items.push({ kind: "todo", item: todo }))
      }
    })
    return items
  }, [sections])

  useEffect(() => {
    if (!flatItems.length) {
      setActiveIndex(0)
      return
    }
    if (activeIndex >= flatItems.length) {
      setActiveIndex(flatItems.length - 1)
    }
  }, [flatItems.length, activeIndex])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`
    )
    if (el && "scrollIntoView" in el) {
      el.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  const activeEntry = flatItems[activeIndex]

  const handleExecute = (entry: PaletteEntry) => {
    if (entry.kind === "command") {
      entry.item.onExecute()
      onOpenChange(false)
      return
    }
    if (entry.kind === "todo" && onSelectTodo) {
      onSelectTodo(entry.item)
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => {
        if (!flatItems.length) return 0
        return Math.min(prev + 1, flatItems.length - 1)
      })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      setShowPreview(false)
    } else if (e.key === " " || e.code === "Space") {
      const entry = flatItems[activeIndex]
      if (entry && entry.kind === "todo") {
        e.preventDefault()
        setShowPreview((prev) => !prev)
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      const entry = flatItems[activeIndex]
      if (!entry) return
      handleExecute(entry)
      setShowPreview(false)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowPreview(false)
      onOpenChange(false)
    }
  }
  useEffect(() => {
    if (!activeEntry || activeEntry.kind !== "todo") {
      setShowPreview(false)
    }
  }, [activeEntry])

  const showPreviewCard = showPreview && activeEntry && activeEntry.kind === "todo"
  const isPreviewBottom = previewPosition === "bottom"

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setShowPreview(false)
        }
        onOpenChange(value)
      }}
    >
      <DialogContent
        hideClose
        className={cn(
          "border-none bg-transparent p-0 shadow-none",
          "sm:max-w-2xl w-full",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          showPreviewCard && !isPreviewBottom && "sm:left-[46%]"
        )}
      >        <VisuallyHidden>
          <DialogTitle>待办事项搜索</DialogTitle>
        </VisuallyHidden>        <div ref={containerRef} className="relative flex flex-col items-stretch">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-2xl">
            <div className="px-4 pt-4 pb-3">
              <div className="pointer-events-none absolute left-6 top-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Command className="h-3.5 w-3.5" />
                <span>聚焦搜索 & 命令面板</span>
                <span className="hidden items-center gap-1 rounded-md border bg-muted/60 px-1.5 py-0.5 text-[10px] sm:inline-flex">
                  <span className="rounded border px-1 leading-none">Ctrl</span>
                  <span className="leading-none">/</span>
                </span>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="搜索待办或输入命令..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-11 rounded-xl border border-border/70 bg-background/80 pl-11 pr-24 text-sm shadow-none focus-visible:ring-1"
                />
                <span className="pointer-events-none absolute right-3 top-2.5 hidden rounded-md border bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                  ↑/↓ 选择 · Enter 执行 · Space 预览
                </span>
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[360px] overflow-y-auto border-t border-border/60 text-sm"
            >
              {!flatItems.length ? (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                  {lowerQuery ? "没有匹配的命令或待办" : "开始输入以搜索命令或待办"}
                </div>
              ) : (
                <div className="py-2">
                  {sections.map((section) => {
                    if (section.type === "commands" && !section.items.length) return null
                    if (section.type === "todos" && !section.items.length) return null

                    return (
                      <div key={section.title} className="mb-1.5">
                        <div className="px-3 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                          {section.title}
                        </div>
                        <ul className="space-y-0.5">
                          {section.type === "commands"
                            ? section.items.map((cmd) => {
                                const index = flatItems.findIndex(
                                  (entry) => entry.kind === "command" && entry.item === cmd
                                )
                                const isActive = index === activeIndex
                                return (
                                  <li
                                    key={`cmd-${cmd.id}`}
                                    data-palette-index={index}
                                    className={cn(
                                      "mx-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors",
                                      isActive
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/60"
                                    )}
                                    onMouseEnter={() => index >= 0 && setActiveIndex(index)}
                                    onClick={() =>
                                      index >= 0 && handleExecute({ kind: "command", item: cmd })
                                    }
                                  >
                                    <Command className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                      <div className="font-medium text-[13px]">{cmd.label}</div>
                                      {cmd.description && (
                                        <div className="text-[11px] text-muted-foreground">
                                          {cmd.description}
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                )
                              })
                            : section.items.map((todo) => {
                                const index = flatItems.findIndex(
                                  (entry) => entry.kind === "todo" && entry.item === todo
                                )
                                const isActive = index === activeIndex
                                return (
                                  <li
                                    key={`todo-${todo.id}`}
                                    data-palette-index={index}
                                    className={cn(
                                      "mx-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors",
                                      isActive
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/60"
                                    )}
                                    onMouseEnter={() => index >= 0 && setActiveIndex(index)}
                                    onClick={() =>
                                      index >= 0 && handleExecute({ kind: "todo", item: todo })
                                    }
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="truncate text-[13px] font-medium">
                                          {todo.title}
                                        </div>
                                      </div>
                                      {todo.description && (
                                        <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                          {todo.description}
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {activeEntry && activeEntry.kind === "todo" && (
            <>
              {!isPreviewBottom && (
                <div
                  className={cn(
                    "pointer-events-none absolute top-0 bottom-0 left-full ml-4 hidden lg:block overflow-hidden transition-all duration-300 ease-out",
                    showPreviewCard ? "w-[380px] opacity-100" : "w-0 opacity-0"
                  )}
                >
                  {showPreviewCard && (
                    <div className="pointer-events-auto h-full w-[360px] p-2 animate-in slide-in-from-right-2 fade-in-0">
                      <TodoPreview todo={activeEntry.item} />
                    </div>
                  )}
                </div>
              )}
              
              {/* 底部预览（小屏幕） */}
              {isPreviewBottom && showPreviewCard && (
                <div className="mt-3 animate-in slide-in-from-bottom-2 fade-in-0">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-2xl max-h-[300px] sm:max-h-[400px]">
                    <TodoPreview todo={activeEntry.item} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

