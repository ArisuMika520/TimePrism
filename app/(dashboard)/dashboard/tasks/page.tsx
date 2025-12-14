"use client"

import { motion } from "framer-motion"
import { BoardView } from "@/components/tasks/BoardView"

export default function TasksPage() {
  return (
    <div className="space-y-8 h-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold tracking-tight">任务看板</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          使用看板视图管理和跟踪您的任务
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 min-h-0"
      >
        <BoardView />
      </motion.div>
    </div>
  )
}

