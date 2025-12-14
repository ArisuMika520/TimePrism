"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    Configuration: "服务器配置错误，请联系管理员",
    AccessDenied: "访问被拒绝",
    Verification: "验证失败，链接可能已过期",
    Default: "认证过程中发生错误",
  }

  const errorMessage = errorMessages[error || "Default"] || errorMessages.Default

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/tp logo512.png"
            alt="TimePrism Logo"
            width={66}
            height={66}
            className="flex-shrink-0"
            priority
          />
          <h1 className="text-3xl font-bold">TimePrism</h1>
        </div>
        <Card className="w-full shadow-[0_0_30px_rgba(139,92,246,0.15)] border-purple-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>认证错误</CardTitle>
            </div>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error === "Configuration" && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-2">可能的原因：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>服务器环境变量配置不正确</li>
                  <li>NEXTAUTH_URL 未正确设置</li>
                  <li>域名配置问题</li>
                </ul>
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button asChild className="w-full">
              <Link href="/auth/signin">返回登录</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 relative z-10">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/tp logo512.png"
              alt="TimePrism Logo"
              width={66}
              height={66}
              className="flex-shrink-0"
              priority
            />
            <h1 className="text-3xl font-bold">TimePrism</h1>
          </div>
          <Card className="w-full shadow-[0_0_30px_rgba(139,92,246,0.15)] border-purple-500/20">
            <CardHeader>
              <CardTitle>加载中...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}

