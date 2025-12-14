"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { useNotification } from "@/components/ui/notification"

interface CreateScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  onSuccess: () => void
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: CreateScheduleDialogProps) {
  const { showError } = useNotification()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState("")
  const [reminder, setReminder] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && defaultDate) {
      const dateStr = format(defaultDate, "yyyy-MM-dd")
      setStartTime(`${dateStr}T09:00`)
      setEndTime(`${dateStr}T10:00`)
    } else if (open) {
      const now = new Date()
      const dateStr = format(now, "yyyy-MM-dd")
      setStartTime(`${dateStr}T09:00`)
      setEndTime(`${dateStr}T10:00`)
    }
  }, [open, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const start = allDay
        ? new Date(startTime.split("T")[0] + "T00:00:00")
        : new Date(startTime)
      const end = allDay
        ? new Date(endTime.split("T")[0] + "T23:59:59")
        : new Date(endTime)

      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          allDay,
          location: location || null,
          reminder: reminder ? parseInt(reminder) : null,
        }),
      })

      if (response.ok) {
        onSuccess()
        setTitle("")
        setDescription("")
        setLocation("")
        setReminder("")
        setAllDay(false)
        onOpenChange(false)
      } else {
        const data = await response.json()
        showError("创建失败", data.error || "创建失败")
      }
    } catch (error) {
      console.error("创建失败:", error)
      showError("创建失败", "创建失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新建日程</DialogTitle>
            <DialogDescription>创建一个新的日程安排</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="schedule-title">标题 *</Label>
              <Input
                id="schedule-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入日程标题"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-description">描述（备忘）</Label>
              <Textarea
                id="schedule-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入详细描述（可选）"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-day"
                checked={allDay}
                onCheckedChange={(checked) => setAllDay(checked as boolean)}
              />
              <Label htmlFor="all-day">全天</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="schedule-start">开始时间</Label>
                <Input
                  id="schedule-start"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? startTime.split("T")[0] : startTime}
                  onChange={(e) => {
                    if (allDay) {
                      setStartTime(e.target.value + "T00:00")
                    } else {
                      setStartTime(e.target.value)
                    }
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schedule-end">结束时间</Label>
                <Input
                  id="schedule-end"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? endTime.split("T")[0] : endTime}
                  onChange={(e) => {
                    if (allDay) {
                      setEndTime(e.target.value + "T23:59")
                    } else {
                      setEndTime(e.target.value)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-location">地点</Label>
              <Input
                id="schedule-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="输入地点（可选）"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-reminder">提醒（分钟前）</Label>
              <Input
                id="schedule-reminder"
                type="number"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                placeholder="例如：15"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

