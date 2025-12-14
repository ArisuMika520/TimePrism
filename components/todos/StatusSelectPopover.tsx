"use client"

import { useState, useEffect } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TodoStatus, UserCustomStatus } from "@/store/todoStore"
import { Circle, Radio, CheckCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusSelectPopoverProps {
  currentStatus: TodoStatus
  customStatusId: string | null
  customStatuses: UserCustomStatus[]
  onStatusChange: (status: TodoStatus, customStatusId: string | null) => void
  children: React.ReactNode
}

const statusLabels: Record<TodoStatus, string> = {
  WAIT: "等待中",
  IN_PROGRESS: "进行中",
  COMPLETE: "已完成",
}

const statusIcons: Record<TodoStatus, React.ReactNode> = {
  WAIT: <Circle className="h-4 w-4" />,
  IN_PROGRESS: <Radio className="h-4 w-4" />,
  COMPLETE: <CheckCircle className="h-4 w-4" />,
}

export function StatusSelectPopover({
  currentStatus,
  customStatusId,
  customStatuses,
  onStatusChange,
  children,
}: StatusSelectPopoverProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleStatusSelect = (status: TodoStatus, customId: string | null = null) => {
    onStatusChange(status, customId)
    setOpen(false)
  }

  const filteredCustomStatuses = customStatuses.filter((cs) =>
    cs.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBaseStatuses = Object.entries(statusLabels).filter(([_, label]) =>
    label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />

          <div className="space-y-1">
            {filteredBaseStatuses.map(([status, label]) => {
              const isSelected =
                status === currentStatus && !customStatusId
              return (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status as TodoStatus)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors",
                    isSelected && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {statusIcons[status as TodoStatus]}
                    <span>{label}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {customStatuses.length > 0 && (
            <>
              <div className="h-px bg-border my-2" />
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">
                自定义状态
              </div>
              <div className="space-y-1">
                {filteredCustomStatuses.map((cs) => {
                  const isSelected = customStatusId === cs.id
                  return (
                    <button
                      key={cs.id}
                      onClick={() => handleStatusSelect("WAIT", cs.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4" />
                        <span>{cs.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {filteredBaseStatuses.length === 0 && filteredCustomStatuses.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              未找到匹配的状态
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

