"use client"

import { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

interface PrioritySelectPopoverProps {
  currentPriority: Priority
  onPriorityChange: (priority: Priority) => void
  children: React.ReactNode
}

const priorityLabels: Record<Priority, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
}

const priorityColors: Record<Priority, string> = {
  LOW: "text-green-600 dark:text-green-400",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-red-600 dark:text-red-400",
}

export function PrioritySelectPopover({
  currentPriority,
  onPriorityChange,
  children,
}: PrioritySelectPopoverProps) {
  const [open, setOpen] = useState(false)

  const handlePrioritySelect = (priority: Priority) => {
    onPriorityChange(priority)
    setOpen(false)
  }

  const filteredPriorities = Object.entries(priorityLabels)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2">
          <div className="space-y-1">
            {filteredPriorities.map(([priority, label]) => {
              const isSelected = priority === currentPriority
              return (
                <button
                  key={priority}
                  onClick={() => handlePrioritySelect(priority as Priority)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors",
                    isSelected && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", priorityColors[priority as Priority])}>
                      {label}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {filteredPriorities.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              未找到匹配的优先级
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

