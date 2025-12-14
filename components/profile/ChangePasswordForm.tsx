"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNotification } from "@/components/ui/notification"
import { Loader2, Eye, EyeOff } from "lucide-react"

interface ChangePasswordFormProps {
  hasPassword: boolean
}

export function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { showNotification } = useNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      showNotification({
        type: "error",
        title: "密码太短",
        message: "密码至少需要6个字符",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification({
        type: "error",
        title: "密码不一致",
        message: "两次输入的密码不一致",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "修改失败")
      }

      showNotification({
        type: "success",
        title: "修改成功",
        message: "密码已更新",
      })

      // 清空表单
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("修改密码错误:", error)
      showNotification({
        type: "error",
        title: "修改失败",
        message: error instanceof Error ? error.message : "请稍后重试",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!hasPassword) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>您使用 OAuth 登录，无需设置密码</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">新密码</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码（至少6个字符）"
            required
            minLength={6}
            maxLength={100}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">确认新密码</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            required
            minLength={6}
            maxLength={100}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        修改密码
      </Button>
    </form>
  )
}
