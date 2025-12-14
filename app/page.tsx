import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckSquare, LayoutGrid, Calendar, ArrowRight } from "lucide-react"

export default async function Home() {
  const session = await auth()

  // 如果已登录，重定向到 dashboard
  if (session) {
    redirect("/dashboard")
  }

  // 未登录时显示欢迎页面
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-4xl w-full space-y-6 sm:space-y-8">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <Image
                src="/tp logo512.png"
                alt="TimePrism Logo"
                width={64}
                height={64}
                className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16"
                priority
              />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">TimePrism</h1>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              集成Todo、Task Manager和Schedule的现代化应用
            </p>
            <p className="text-sm sm:text-base text-muted-foreground px-4">
              高效管理您的任务、日程和待办事项
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3 mt-8 sm:mt-12">
            <Card>
              <CardHeader>
                <CheckSquare className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>待办事项</CardTitle>
                <CardDescription>
                  轻松管理您的待办事项，跟踪完成进度
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <LayoutGrid className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>任务看板</CardTitle>
                <CardDescription>
                  使用看板视图直观管理任务流程
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>日程安排</CardTitle>
                <CardDescription>
                  管理您的日程和事件，不错过重要安排
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-6 sm:pt-8 px-4">
            <Button asChild size="lg" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              <Link href="/auth/signin" className="flex items-center justify-center">
                开始使用
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              <Link href="/auth/register">
                注册账号
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <footer className="border-t py-4 sm:py-6">
        <div className="container mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2025 TimePrism. 现代化的任务管理解决方案</p>
        </div>
      </footer>
    </main>
  )
}

