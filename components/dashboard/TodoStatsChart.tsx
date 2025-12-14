"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

const COMPLETED_COLOR_LIGHT = "#88c6a2" 
const COMPLETED_COLOR_DARK = "#0e743a" 

interface TodoStats {
  date: string
  completed: number
  total: number
}

export function TodoStatsChart() {
  const [data, setData] = useState<TodoStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    fetchTodoStats()
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  const fetchTodoStats = async () => {
    try {
      const response = await fetch("/api/todos/stats?days=7")
      if (response.ok) {
        const stats = await response.json()
        setData(stats)
      } else {
        console.error("获取统计数据失败:", response.statusText)
      }
    } catch (error) {
      console.error("获取统计数据失败:", error)
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
            <CardTitle>待办完成趋势</CardTitle>
            <CardDescription>最近7天的待办完成情况</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] sm:h-[300px] w-full" />
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card hoverable>
        <CardHeader>
          <CardTitle>待办完成趋势</CardTitle>
          <CardDescription>最近7天的待办完成情况</CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))"
            />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--popover-foreground))",
              }}
              labelStyle={{ 
                color: "hsl(var(--foreground))",
                fontWeight: 500,
              }}
              itemStyle={{
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend 
              wrapperStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke={isDark ? COMPLETED_COLOR_DARK : COMPLETED_COLOR_LIGHT}
              strokeWidth={2}
              name="已完成"
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              name="总数"
            />
          </LineChart>
        </ResponsiveContainer>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}


