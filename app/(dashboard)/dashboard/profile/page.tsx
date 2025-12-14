import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { ProfileForm } from "@/components/profile/ProfileForm"
import { AvatarUpload } from "@/components/profile/AvatarUpload"
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ProfilePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // 获取用户资料
  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">个人资料</h1>
        <p className="text-muted-foreground mt-1">
          管理您的个人信息和账户设置
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>头像</CardTitle>
            <CardDescription>
              上传您的个人头像
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              currentAvatar={profile?.image}
              currentName={profile?.name}
              currentEmail={profile?.email}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>
              更新您的个人信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm initialData={profile || undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>修改密码</CardTitle>
            <CardDescription>
              更新您的登录密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm hasPassword={!!profile?.password} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

