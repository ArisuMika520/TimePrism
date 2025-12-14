import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TodoArchiveSettings } from "@/components/settings/TodoArchiveSettings"

export default async function ArchiveSettingsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">归档设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          配置自动归档时间、宽限策略以及归档清理规则。
        </p>
      </div>
      <TodoArchiveSettings />
    </div>
  )
}






