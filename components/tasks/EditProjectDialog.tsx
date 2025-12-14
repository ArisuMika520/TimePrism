"use client"

import { useState, useEffect } from "react"
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
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ColorPicker } from "@/components/ui/color-picker"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
  onSuccess?: () => void
}

export function EditProjectDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: EditProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { projects, updateProject, deleteProject, getCurrentProject } = useProjectStore()
  const { showSuccess, showError } = useNotification()
  const confirm = useConfirm()

  useEffect(() => {
    if (open && projectId) {
      const project = projects.find((p) => p.id === projectId) || getCurrentProject()
      if (project) {
        setName(project.name)
        setDescription(project.description || "")
        setColor(project.color || null)
      }
    }
  }, [open, projectId, projects, getCurrentProject])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !projectId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color: color || null,
        }),
      })

      if (response.ok) {
        const project = await response.json()
        updateProject(projectId, project)
        showSuccess("项目更新成功")
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        showError(error.error || "更新项目失败")
      }
    } catch (error) {
      console.error("更新项目错误:", error)
      showError("更新项目失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!projectId) return

    const confirmed = await confirm.confirm({
      title: "删除项目",
      message: "确定要删除这个项目吗？所有任务列表和任务也将被删除。",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        deleteProject(projectId)
        showSuccess("项目删除成功")
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        showError("删除失败", error.error || "删除失败")
      }
    } catch (error) {
      console.error("删除项目错误:", error)
      showError("删除失败", "删除项目失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
            <DialogDescription>修改项目信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">项目名称 *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入项目名称"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">项目描述</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入项目描述（可选）"
                rows={3}
              />
            </div>
            <ColorPicker value={color} onChange={setColor} label="项目颜色" />
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              删除
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading ? "更新中..." : "更新"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

