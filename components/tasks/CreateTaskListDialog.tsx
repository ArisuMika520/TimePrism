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
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { ColorPicker } from "@/components/ui/color-picker"

interface CreateTaskListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  projectId?: string | null
}

export function CreateTaskListDialog({
  open,
  onOpenChange,
  onSuccess,
  projectId,
}: CreateTaskListDialogProps) {
  const { showError } = useNotification()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/task-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          color: color || null,
          projectId: projectId || null,
        }),
      })

      if (response.ok) {
        onSuccess()
        setName("")
        setDescription("")
        setColor(null)
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新建任务列表</DialogTitle>
            <DialogDescription>创建一个新的任务列表</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入列表名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述（备忘）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入描述（可选）"
                rows={3}
              />
            </div>
            <ColorPicker value={color} onChange={setColor} label="Group颜色" />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

