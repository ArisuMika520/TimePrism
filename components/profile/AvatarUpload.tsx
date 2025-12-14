"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Upload, X } from "lucide-react"
import { useNotification } from "@/components/ui/notification"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentAvatar?: string | null
  currentName?: string | null
  currentEmail?: string | null
  onUploadSuccess?: (url: string) => void
  className?: string
}

export function AvatarUpload({
  currentAvatar,
  currentName,
  currentEmail,
  onUploadSuccess,
  className,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showNotification } = useNotification()
  const router = useRouter()

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      showNotification({
        type: "error",
        title: "文件类型不支持",
        message: "仅支持图片文件（JPEG, PNG, GIF, WebP）",
      })
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showNotification({
        type: "error",
        title: "文件过大",
        message: "文件大小不能超过5MB",
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "上传失败")
      }

      const data = await response.json()
      setPreview(null)
      showNotification({
        type: "success",
        title: "上传成功",
        message: "头像已更新",
      })
      onUploadSuccess?.(data.url)
      
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { url: data.url } }))
      }
      
      setTimeout(() => {
        router.refresh()
      }, 300)
    } catch (error) {
      showNotification({
        type: "error",
        title: "上传失败",
        message: error instanceof Error ? error.message : "请稍后重试",
      })
      setPreview(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const avatarUrl = preview || currentAvatar

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarUrl || undefined} alt={currentName || ""} />
          <AvatarFallback className="text-2xl">
            {getInitials(currentName, currentEmail)}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          上传头像
        </Button>
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}

