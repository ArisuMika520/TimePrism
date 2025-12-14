"use client"

import { motion } from "framer-motion"
import { CalendarView } from "@/components/schedule/CalendarView"

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold tracking-tight">日程安排</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          管理您的日程和事件，查看月/周/日视图
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <CalendarView />
      </motion.div>
    </div>
  )
}

