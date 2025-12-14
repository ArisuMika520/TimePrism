"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  CheckSquare,
  X,
  Trash2,
  Archive,
  Tag,
  MoreVertical,
  Loader2,
  Sparkles,
  Sun,
} from "lucide-react"
import { TodoStatus, Priority } from "@/store/todoStore"
import { useState } from "react"
import { StatusSelectPopover } from "./StatusSelectPopover"
import { PrioritySelectPopover } from "./PrioritySelectPopover"
import { useNotification } from "@/components/ui/notification"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

interface BatchActionBarProps {
  selectedIds: string[]
  onClearSelection: () => void
  onBatchUpdate: (updates: {
    status?: TodoStatus
    customStatusId?: string | null
    priority?: Priority
    tags?: string[]
    todayPinnedDate?: string | null
    dueDate?: string | null
  }) => Promise<void>
  onBatchDelete: () => Promise<void>
  onBatchArchive?: () => Promise<void>
  customStatuses: Array<{ id: string; name: string; color?: string | null; position: number }>
  onBatchAddToToday: () => Promise<void>
}

const ARCHIVE_CANCELLED_ERROR = "USER_CANCELLED_ARCHIVE"

export function BatchActionBar({
  selectedIds,
  onClearSelection,
  onBatchUpdate,
  onBatchDelete,
  onBatchArchive,
  customStatuses,
  onBatchAddToToday,
}: BatchActionBarProps) {
  const { showSuccess, showError } = useNotification()
  const confirm = useConfirm()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleBatchStatusChange = async (
    status: TodoStatus,
    customStatusId: string | null
  ) => {
    setIsUpdating(true)
    try {
      await onBatchUpdate({ status, customStatusId })
      showSuccess(
        "批量更新成功",
        `已更新 ${selectedIds.length} 个待办事项的状态`
      )
    } catch (error) {
      showError("批量更新失败", "状态更新失败，请稍后重试")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBatchPriorityChange = async (priority: Priority) => {
    setIsUpdating(true)
    try {
      await onBatchUpdate({ priority })
      showSuccess(
        "批量更新成功",
        `已更新 ${selectedIds.length} 个待办事项的优先级`
      )
    } catch (error) {
      showError("批量更新失败", "优先级更新失败，请稍后重试")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBatchDelete = async () => {
    const confirmed = await confirm.confirm({
      title: "批量删除",
      message: `确定要删除选中的 ${selectedIds.length} 个待办事项吗？此操作无法撤销。`,
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    setIsUpdating(true)
    try {
      await onBatchDelete()
      showSuccess("批量删除成功", `已删除 ${selectedIds.length} 个待办事项`)
      onClearSelection()
    } catch (error) {
      showError("批量删除失败", "删除失败，请稍后重试")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBatchArchive = async () => {
    if (!onBatchArchive) return
    
    setIsUpdating(true)
    try {
      await onBatchArchive()
      showSuccess("批量归档成功", `已归档 ${selectedIds.length} 个待办事项`)
      onClearSelection()
    } catch (error) {
      if (error instanceof Error && error.message === ARCHIVE_CANCELLED_ERROR) {
        return
      }
      showError("批量归档失败", "归档失败，请稍后重试")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBatchAddToday = async () => {
    setIsUpdating(true)
    try {
      await onBatchAddToToday()
      showSuccess("已加入今日", `已将 ${selectedIds.length} 个待办加入今日任务`)
    } catch (error) {
      showError("操作失败", "加入今日任务失败，请稍后重试")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <AnimatePresence>
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-50 flex justify-center px-2 sm:px-4"
        >
          <motion.div
            className="bg-background border border-card-border rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-xl bg-background/95 p-2 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-3 justify-center w-full sm:w-auto sm:min-w-[500px] sm:max-w-[90vw]"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-primary/10"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </motion.div>
              <span className="text-xs sm:text-sm font-semibold text-primary whitespace-nowrap">
                已选 {selectedIds.length}
              </span>
            </motion.div>

            <div className="hidden sm:block h-8 w-px bg-border" />

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <StatusSelectPopover
                currentStatus="WAIT"
                customStatusId={null}
                customStatuses={customStatuses}
                onStatusChange={handleBatchStatusChange}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  className="rounded-lg text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">修改状态</span>
                  <span className="sm:hidden">状态</span>
                </Button>
              </StatusSelectPopover>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <PrioritySelectPopover
                currentPriority="MEDIUM"
                onPriorityChange={handleBatchPriorityChange}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  className="rounded-lg text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">修改优先级</span>
                  <span className="sm:hidden">优先级</span>
                </Button>
              </PrioritySelectPopover>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.22 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchAddToday}
                disabled={isUpdating}
                className="rounded-lg text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">加入今日</span>
                <span className="sm:hidden">今日</span>
              </Button>
            </motion.div>

            <div className="hidden sm:block h-8 w-px bg-border" />

            {onBatchArchive && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchArchive}
                  disabled={isUpdating}
                  className="rounded-lg text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">归档</span>
                  <span className="sm:hidden">归档</span>
                </Button>
              </motion.div>
            )}

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={isUpdating}
                className="rounded-lg text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">删除</span>
                <span className="sm:hidden">删除</span>
              </Button>
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.35, type: "spring" }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearSelection}
                disabled={isUpdating}
                className="rounded-lg hover:bg-accent h-7 w-7 sm:h-8 sm:w-8"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
