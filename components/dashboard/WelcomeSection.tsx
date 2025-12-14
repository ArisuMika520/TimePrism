"use client"

import { motion } from "framer-motion"

interface WelcomeSectionProps {
  userName: string
}

export function WelcomeSection({ userName }: WelcomeSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
        欢迎回来, {userName}
      </h1>
      <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base md:text-lg">
        管理您的任务、日程和待办事项
      </p>
    </motion.div>
  )
}






