import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MainLayout } from "@/components/layout/MainLayout"
import { prisma } from "@/lib/db/prisma"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  })

  const userData = user || {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: null,
  }

  return (
    <MainLayout user={userData}>
      {children}
    </MainLayout>
  )
}
