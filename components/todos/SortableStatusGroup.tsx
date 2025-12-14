"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Radio, Circle, CheckCircle, Edit2, Trash2, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { TodoStatus } from "@/store/todoStore"
import { StatusDropTarget } from "./StatusDropTarget"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SortableStatusGroupProps {
  id: string
  status: TodoStatus | "custom"
  label: string
  color: string
  count: number
  icon: React.ReactNode
  children: React.ReactNode
  onEdit?: () => void
  onDelete?: () => void
}

export function SortableStatusGroup({
  id,
  status,
  label,
  color,
  count,
  icon,
  children,
  onEdit,
  onDelete,
}: SortableStatusGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isCustom = status === "custom"

  const dropTargetId = isCustom ? `custom-${id}` : undefined

  return (
    <div ref={setNodeRef} style={style} className="space-y-1 sm:space-y-2">
      {dropTargetId ? (
        <StatusDropTarget id={dropTargetId}>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              className="h-5 sm:h-9 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium text-white !opacity-100 cursor-grab active:cursor-grabbing select-none min-w-[70px]"
              style={{
                backgroundColor: color.startsWith("#") ? color : undefined,
                color: "#ffffff",
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
              }}
              disabled
              {...attributes}
              {...listeners}
            >
              {icon}
              {label}
              <span className="ml-1 sm:ml-2 opacity-75 text-[10px] sm:text-sm">{count}</span>
            </Button>
            {isCustom && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 sm:h-7 sm:w-7 p-0 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <MoreVertical className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                      }}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      编辑
                    </DropdownMenuItem>
                  )}
                  {onEdit && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </StatusDropTarget>
      ) : (
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            className="h-5 sm:h-9 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium text-white !opacity-100 cursor-grab active:cursor-grabbing select-none min-w-[70px]"
            style={{
              backgroundColor: color.startsWith("#") ? color : undefined,
              color: "#ffffff",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
            disabled
            {...attributes}
            {...listeners}
          >
            {icon}
            {label}
            <span className="ml-1 sm:ml-2 opacity-75 text-[8px] sm:text-xs">{count}</span>
          </Button>
        </div>
      )}

      {children}
    </div>
  )
}

