import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDashboard } from "@/components/admin/AdminDashboard"

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // 检查是否是管理员
  const { prisma } = await import("@/lib/db/prisma")
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <AdminDashboard />
}
