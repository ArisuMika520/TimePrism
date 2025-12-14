"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useNotification } from "@/components/ui/notification"

interface CreateCustomStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PRESET_COLORS = [
  "#3b82f6", // 蓝色
  "#10b981", // 绿色
  "#f59e0b", // 橙色
  "#ef4444", // 红色
  "#8b5cf6", // 紫色
  "#ec4899", // 粉色
  "#06b6d4", // 青色
  "#84cc16", // 黄绿色
  "#f97316", // 橙红色
  "#6366f1", // 靛蓝色
]

export function CreateCustomStatusDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomStatusDialogProps) {
  const { showError, showSuccess } = useNotification()
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [customColor, setCustomColor] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showError("输入错误", "请输入状态名称")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/custom-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: customColor || color,
        }),
      })

      if (response.ok) {
        showSuccess("创建成功", "自定义状态已创建")
        onSuccess()
        setName("")
        setColor(PRESET_COLORS[0])
        setCustomColor("")
        onOpenChange(false)
      } else {
        const data = await response.json()
        showError("创建失败", data.error || "创建失败")
      }
    } catch (error) {
      console.error("创建失败:", error)
      showError("创建失败", "创建失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建自定义状态</DialogTitle>
            <DialogDescription>
              创建一个新的自定义状态来组织您的待办事项
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-name">状态名称 *</Label>
              <Input
                id="status-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：审核中、暂停中"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>状态颜色</Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      onClick={() => {
                        setColor(presetColor)
                        setCustomColor("")
                      }}
                      className={cn(
                        "w-10 h-10 rounded-md border-2 transition-all",
                        (customColor ? false : color === presetColor) && "border-foreground scale-110"
                      )}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="custom-color" className="text-sm">
                    自定义颜色:
                  </Label>
                  <Input
                    id="custom-color"
                    type="color"
                    value={customColor || color}
                    onChange={(e) => {
                      setCustomColor(e.target.value)
                      setColor(e.target.value)
                    }}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColor || color}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                        setCustomColor(value)
                        setColor(value)
                      } else if (value === "") {
                        setCustomColor("")
                      }
                    }}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

