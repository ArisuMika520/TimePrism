"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface TaskStatusData {
  name: string
  value: number
  color: string
  [key: string]: string | number // 添加索引签名以兼容 Recharts
}

// 使用更清晰的颜色方案，确保在light/dark模式下都可见
const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",        
]

// 暗色模式下的颜色
const DARK_COLORS = [
  "hsl(217, 91%, 70%)",
  "hsl(142, 76%, 50%)",
  "hsl(38, 92%, 65%)",
  "hsl(0, 84%, 70%)",       
]

// 自定义标签渲染函数 - 显示在扇形外侧
const renderCustomLabel = (entry: any) => {
  const RADIAN = Math.PI / 180
  const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = entry
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ 
        fontSize: "12px", 
        fontWeight: 500,
        pointerEvents: "none",
      }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const renderCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div
        style={{
          backgroundColor: "hsl(var(--popover))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          padding: "8px 12px",
          color: "hsl(var(--popover-foreground))",
        }}
      >
        <p style={{ 
          margin: 0, 
          marginBottom: "4px",
          fontWeight: 500,
          color: "hsl(var(--foreground))",
        }}>
          {data.name}
        </p>
        <p style={{ 
          margin: 0,
          color: "hsl(var(--foreground))",
        }}>
          {`数量: ${data.value}`}
        </p>
      </div>
    )
  }
  return null
}

export function TaskStatusChart() {
  const [data, setData] = useState<TaskStatusData[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [outerRadius, setOuterRadius] = useState(100)

  useEffect(() => {
    fetchTaskStats()
    
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }
    checkTheme()
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    
    const updateOuterRadius = () => {
      setOuterRadius(window.innerWidth < 640 ? 70 : 100)
    }
    updateOuterRadius()
    window.addEventListener("resize", updateOuterRadius)
    
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateOuterRadius)
    }
  }, [])

  const fetchTaskStats = async () => {
    try {
      const response = await fetch("/api/tasks/stats")
      if (response.ok) {
        const stats = await response.json()
        const dark = document.documentElement.classList.contains("dark")
        const colors = dark ? DARK_COLORS : COLORS
        
        const statusColorMap: Record<string, number> = {
          "待处理": 0,  
          "进行中": 1, 
          "已完成": 3,
        }
        
        const dataWithColors = stats.map((item: { name: string; value: number }) => ({
          ...item,
          color: colors[statusColorMap[item.name] ?? 0],
        }))
        
        setData(dataWithColors)
      } else {
        console.error("获取任务统计失败:", response.statusText)
      }
    } catch (error) {
      console.error("获取任务统计失败:", error)
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
            <CardTitle>待办状态分布</CardTitle>
            <CardDescription>各状态待办事项的数量分布</CardDescription>
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
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card hoverable>
        <CardHeader>
          <CardTitle>待办状态分布</CardTitle>
          <CardDescription>各状态待办事项的数量分布</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 || data.every((item) => item.value === 0) ? (
            <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground">
              <p className="text-sm sm:text-base">暂无待办数据</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={outerRadius}
                    innerRadius={0}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={renderCustomTooltip} />
                  <Legend 
                    wrapperStyle={{ color: "hsl(var(--foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}


