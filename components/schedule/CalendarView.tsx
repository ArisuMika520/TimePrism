"use client"

import { useState, useEffect } from "react"
import { useScheduleStore } from "@/store/scheduleStore"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CreateScheduleDialog } from "./CreateScheduleDialog"
import { ScheduleEvent } from "./ScheduleEvent"

type ViewMode = "month" | "week" | "day"

export function CalendarView() {
  const { schedules, setSchedules, isLoading, setLoading } = useScheduleStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchSchedules()
  }, [currentDate, viewMode])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      let start: Date
      let end: Date

      if (viewMode === "month") {
        start = startOfMonth(currentDate)
        end = endOfMonth(currentDate)
      } else if (viewMode === "week") {
        start = startOfWeek(currentDate, { locale: zhCN })
        end = endOfWeek(currentDate, { locale: zhCN })
      } else {
        start = new Date(currentDate)
        start.setHours(0, 0, 0, 0)
        end = new Date(currentDate)
        end.setHours(23, 59, 59, 999)
      }

      const response = await fetch(
        `/api/schedules?start=${start.toISOString()}&end=${end.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        setSchedules(data)
      }
    } catch (error) {
      console.error("获取日程失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (viewMode === "week") {
      setCurrentDate(subMonths(currentDate, 1 / 4))
    } else {
      setCurrentDate(subMonths(currentDate, 1 / 30))
    }
  }

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (viewMode === "week") {
      setCurrentDate(addMonths(currentDate, 1 / 4))
    } else {
      setCurrentDate(addMonths(currentDate, 1 / 30))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((schedule) => {
      const start = new Date(schedule.startTime)
      const end = new Date(schedule.endTime)
      return (
        isSameDay(start, date) ||
        isSameDay(end, date) ||
        (start <= date && end >= date)
      )
    })
  }

  if (viewMode === "month") {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { locale: zhCN })
    const calendarEnd = endOfWeek(monthEnd, { locale: zhCN })
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">
              {format(currentDate, "yyyy年MM月", { locale: zhCN })}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                今天
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
            >
              月
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
            >
              周
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              onClick={() => setViewMode("day")}
            >
              日
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建日程
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center font-semibold text-sm border-r last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const daySchedules = getSchedulesForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] p-2 border-r border-b last:border-r-0 ${
                      !isCurrentMonth ? "bg-muted/30" : ""
                    } ${isToday ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      setSelectedDate(day)
                      setIsCreateOpen(true)
                    }}
                  >
                    <div
                      className={`text-sm mb-1 ${
                        isToday
                          ? "font-bold text-primary"
                          : isCurrentMonth
                          ? ""
                          : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((schedule) => (
                        <ScheduleEvent
                          key={schedule.id}
                          schedule={schedule}
                          onUpdate={fetchSchedules}
                        />
                      ))}
                      {daySchedules.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{daySchedules.length - 3} 更多
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <CreateScheduleDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          defaultDate={selectedDate || undefined}
          onSuccess={fetchSchedules}
        />
      </div>
    )
  }

  // 周视图和日视图的简化实现
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {viewMode === "week"
              ? format(currentDate, "yyyy年MM月第w周", { locale: zhCN })
              : format(currentDate, "yyyy年MM月dd日", { locale: zhCN })}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday}>
              今天
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
          >
            月
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => setViewMode("week")}
          >
            周
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            onClick={() => setViewMode("day")}
          >
            日
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建日程
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <ScheduleEvent
                key={schedule.id}
                schedule={schedule}
                onUpdate={fetchSchedules}
              />
            ))}
            {schedules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                没有日程安排
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateScheduleDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultDate={selectedDate || undefined}
        onSuccess={fetchSchedules}
      />
    </div>
  )
}

