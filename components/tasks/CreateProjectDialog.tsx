"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useProjectStore } from "@/store/projectStore"
import { useNotification } from "@/components/ui/notification"
import { ColorPicker } from "@/components/ui/color-picker"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { addProject, setLoading } = useProjectStore()
  const { showSuccess, showError } = useNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setLoading(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color: color || null,
        }),
      })

      if (response.ok) {
        const project = await response.json()
        addProject(project)
        showSuccess("项目创建成功")
        setName("")
        setDescription("")
        setColor(null)
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        showError(error.error || "创建项目失败")
      }
    } catch (error) {
      console.error("创建项目错误:", error)
      showError("创建项目失败，请稍后重试")
    } finally {
      setIsLoading(false)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
            <DialogDescription>
              创建一个新项目来组织和管理您的任务
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">项目名称 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入项目名称"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">项目描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入项目描述（可选）"
                rows={3}
              />
            </div>
            <ColorPicker value={color} onChange={setColor} label="项目颜色" />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
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

