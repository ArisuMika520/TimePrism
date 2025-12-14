import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { QuickAccess } from "@/components/dashboard/QuickAccess"
import { TodoStatsChart } from "@/components/dashboard/TodoStatsChart"
import { TaskStatusChart } from "@/components/dashboard/TaskStatusChart"
import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline"
import { WelcomeSection } from "@/components/dashboard/WelcomeSection"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <WelcomeSection userName={session.user?.name || session.user?.email || "用户"} />

      <StatsCards />

      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">快速访问</h2>
        <QuickAccess />
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <TodoStatsChart />
        <TaskStatusChart />
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-1 lg:grid-cols-2">
        <ScheduleTimeline />
      </div>
    </div>
  )
}

