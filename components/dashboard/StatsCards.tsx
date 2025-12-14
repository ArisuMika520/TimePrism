"use client"

import { useEffect, useState } from "react"
import { CheckSquare, LayoutGrid, Calendar, TrendingUp } from "lucide-react"
import { StatsCard } from "./StatsCard"

interface DashboardStats {
  todos: {
    total: number
    completed: number
    today: number
  }
  tasks: {
    total: number
    inProgress: number
    dueToday: number
  }
  schedules: {
    today: number
  }
  completionRate: {
    value: number
    change: number
  }
}

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("获取统计数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 sm:h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="待办事项"
        value={stats.todos.total.toString()}
        description={`${stats.todos.completed} 个已完成`}
        icon={CheckSquare}
        trend={stats.todos.today > 0 ? { value: stats.todos.today, isPositive: true } : undefined}
        index={0}
      />
      <StatsCard
        title="进行中任务"
        value={stats.tasks.inProgress.toString()}
        description={stats.tasks.dueToday > 0 ? `${stats.tasks.dueToday} 个即将到期` : "暂无即将到期"}
        icon={LayoutGrid}
        trend={stats.tasks.dueToday > 0 ? { value: stats.tasks.dueToday, isPositive: false } : undefined}
        index={1}
      />
      <StatsCard
        title="今日日程"
        value={stats.schedules.today.toString()}
        description={stats.schedules.today > 0 ? "查看今日安排" : "暂无日程"}
        icon={Calendar}
        index={2}
      />
      <StatsCard
        title="完成率"
        value={`${stats.completionRate.value}%`}
        description={
          stats.completionRate.change > 0
            ? `比上周提升 ${stats.completionRate.change}%`
            : stats.completionRate.change < 0
            ? `比上周下降 ${Math.abs(stats.completionRate.change)}%`
            : "与上周持平"
        }
        icon={TrendingUp}
        trend={
          stats.completionRate.change !== 0
            ? { value: Math.abs(stats.completionRate.change), isPositive: stats.completionRate.change > 0 }
            : undefined
        }
        index={3}
      />
    </div>
  )
}





