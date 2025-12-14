"use client"

import { motion } from "framer-motion"
import { TodoList } from "@/components/todos/TodoList"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TodosPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold tracking-tight">待办事项</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          管理您的待办事项，跟踪任务进度
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle>我的待办</CardTitle>
            <CardDescription>所有待办事项列表</CardDescription>
          </CardHeader>
          <CardContent>
            <TodoList />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

