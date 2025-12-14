"use client"

import { useState, useEffect } from "react"
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
import { UserCustomStatus } from "@/store/todoStore"

interface EditCustomStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: UserCustomStatus | null
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

export function EditCustomStatusDialog({
  open,
  onOpenChange,
  status,
  onSuccess,
}: EditCustomStatusDialogProps) {
  const { showError, showSuccess } = useNotification()
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [customColor, setCustomColor] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status) {
      setName(status.name)
      const statusColor = status.color || PRESET_COLORS[0]
      setColor(statusColor)
      setCustomColor(statusColor)
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showError("输入错误", "请输入状态名称")
      return
    }

    if (!status) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/custom-statuses/${status.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: customColor || color,
        }),
      })

      if (response.ok) {
        showSuccess("更新成功", "自定义状态已更新")
        onSuccess()
        onOpenChange(false)
      } else {
        const data = await response.json()
        showError("更新失败", data.error || "更新失败")
      }
    } catch (error) {
      console.error("更新失败:", error)
      showError("更新失败", "更新失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑自定义状态</DialogTitle>
            <DialogDescription>
              修改自定义状态的名称和颜色
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
                autoComplete="off"
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
                    autoComplete="off"
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
              {isLoading ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}





