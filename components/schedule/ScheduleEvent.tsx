"use client"

import { Schedule } from "@/store/scheduleStore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { useState } from "react"
import { EditScheduleDialog } from "./EditScheduleDialog"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useConfirm } from "@/components/ui/confirm-dialog"

interface ScheduleEventProps {
  schedule: Schedule
  onUpdate: () => void
}

export function ScheduleEvent({ schedule, onUpdate }: ScheduleEventProps) {
  const confirm = useConfirm()
  const [isEditOpen, setIsEditOpen] = useState(false)

  const handleDelete = async () => {
    const confirmed = await confirm.confirm({
      title: "删除日程",
      message: "确定要删除这个日程吗？",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })
    if (!confirmed) return

    try {
      await fetch(`/api/schedules/${schedule.id}`, {
        method: "DELETE",
      })
      onUpdate()
    } catch (error) {
      console.error("删除失败:", error)
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <h4 className="font-medium text-sm">{schedule.title}</h4>
              {schedule.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {schedule.description}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                {schedule.allDay
                  ? format(new Date(schedule.startTime), "yyyy-MM-dd", { locale: zhCN })
                  : `${format(new Date(schedule.startTime), "yyyy-MM-dd HH:mm", { locale: zhCN })} - ${format(new Date(schedule.endTime), "HH:mm", { locale: zhCN })}`}
              </div>
              {schedule.location && (
                <p className="text-xs text-muted-foreground">
                  地点: {schedule.location}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditScheduleDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        schedule={schedule}
        onSuccess={onUpdate}
      />
    </>
  )
}

