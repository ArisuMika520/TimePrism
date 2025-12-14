import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
export default async function SettingsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">全局设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          全局设置TimePrism的相关设置（暂未想到设置啥（））
        </p>
      </div>
    </div>
  )
}

