"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Calendar } from "lucide-react"
import { listItemVariants } from "@/lib/animations"

interface ScheduleEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  type: string
}

export function ScheduleTimeline() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch("/api/schedules/upcoming?days=3")
      if (response.ok) {
        const data = await response.json()
        // 转换数据格式，确保日期是Date对象
        const events: ScheduleEvent[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          startTime: new Date(item.startTime),
          endTime: new Date(item.endTime),
          type: item.type || "日程",
        }))
        setEvents(events)
      } else {
        console.error("获取即将到来的事件失败:", response.statusText)
      }
    } catch (error) {
      console.error("获取即将到来的事件失败:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>即将到来的日程</CardTitle>
            <CardDescription>未来3天的日程安排</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card hoverable>
        <CardHeader>
          <CardTitle>即将到来的日程</CardTitle>
          <CardDescription>未来3天的日程安排</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无即将到来的日程</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  variants={listItemVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-card-border hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center"
                  >
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h4 className="font-medium text-sm sm:text-base truncate">{event.title}</h4>
                      <Badge variant="secondary" animated className="text-xs flex-shrink-0">{event.type}</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {format(event.startTime, "MM月dd日 HH:mm", { locale: zhCN })} -{" "}
                      {format(event.endTime, "HH:mm", { locale: zhCN })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}






