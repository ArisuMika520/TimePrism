"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Github } from "lucide-react"

type AuthProviders = {
  credentials: boolean
  google: boolean
  github: boolean
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [providers, setProviders] = useState<AuthProviders>({
    credentials: true,
    google: false,
    github: false,
  })

  useEffect(() => {
    // 获取可用的认证提供商
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    // 倒计时
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendCode = async () => {
    if (!email) {
      setError("请输入邮箱地址")
      return
    }

    setError("")
    setIsSendingCode(true)

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "发送验证码失败")
        return
      }

      setCodeSent(true)
      setCountdown(60) // 60秒倒计时
      setError("")
    } catch (err) {
      setError("发送验证码失败，请稍后重试")
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "注册失败")
        return
      }

      // 注册成功后自动登录
      router.push("/auth/signin?registered=true")
    } catch (err) {
      setError("注册失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    window.location.href = `/api/auth/signin/${provider}?callbackUrl=/dashboard`
  }

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
          <CardTitle>注册</CardTitle>
          <CardDescription>创建您的TimePrism账户</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">昵称（可选）</Label>
              <Input
                id="name"
                type="text"
                placeholder="您的昵称"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  placeholder="6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={isSendingCode || countdown > 0 || !email}
                  className="whitespace-nowrap"
                >
                  {countdown > 0
                    ? `${countdown}秒后重发`
                    : isSendingCode
                    ? "发送中..."
                    : codeSent
                    ? "重新发送"
                    : "发送验证码"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "注册中..." : "注册"}
            </Button>
            
            {/* 仅在配置了OAuth提供商时显示分隔线和按钮 */}
            {(providers.google || providers.github) && (
              <>
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      或使用
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {providers.google && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOAuthSignIn("google")}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                  )}
                  {providers.github && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOAuthSignIn("github")}
                      className={providers.google ? "" : "col-span-2"}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                  )}
                </div>
              </>
            )}
            
            <p className="text-center text-sm text-muted-foreground">
              已有账户？{" "}
              <Link href="/auth/signin" className="text-primary hover:underline">
                登录
              </Link>
            </p>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  )
}

