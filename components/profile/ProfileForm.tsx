"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { Loader2 } from "lucide-react"

interface UserProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  bio: string | null
}

interface ProfileFormProps {
  initialData?: UserProfile
  onUpdate?: (profile: UserProfile) => void
}

export function ProfileForm({ initialData, onUpdate }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(initialData?.name || "")
  const [bio, setBio] = useState(initialData?.bio || "")
  const { showNotification } = useNotification()

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "")
      setBio(initialData.bio || "")
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || null,
          bio: bio.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "更新失败")
      }

      const updatedProfile = await response.json()
      showNotification({
        type: "success",
        title: "更新成功",
        message: "个人资料已更新",
      })
      onUpdate?.(updatedProfile)
    } catch (error) {
      console.error("更新资料错误:", error)
      showNotification({
        type: "error",
        title: "更新失败",
        message: error instanceof Error ? error.message : "请稍后重试",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">昵称</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入昵称"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          type="email"
          value={initialData?.email || ""}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          邮箱地址无法修改
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">个人签名</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="介绍一下自己..."
          maxLength={500}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/500
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        保存更改
      </Button>
    </form>
  )
}




