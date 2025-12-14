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
import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/color-picker"
import { useTaskStore } from "@/store/taskStore"
import { useNotification } from "@/components/ui/notification"
import { useConfirm } from "@/components/ui/confirm-dialog"

interface EditTaskListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskListId: string | null
  onSuccess: () => void
}

export function EditTaskListDialog({
  open,
  onOpenChange,
  taskListId,
  onSuccess,
}: EditTaskListDialogProps) {
  const { showError, showSuccess } = useNotification()
  const confirm = useConfirm()
  const { taskLists } = useTaskStore()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && taskListId) {
      const taskList = taskLists.find((list) => list.id === taskListId)
      if (taskList) {
        setName(taskList.name)
        setDescription(taskList.description || "")
        setColor(taskList.color || null)
      }
    }
  }, [open, taskListId, taskLists])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskListId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/task-lists/${taskListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          color: color || null,
        }),
      })

      if (response.ok) {
        showSuccess("任务列表更新成功")
        onOpenChange(false)
        onSuccess()
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

  const handleDelete = async () => {
    if (!taskListId) return

    const confirmed = await confirm.confirm({
      title: "删除任务列表",
      message: "确定要删除这个任务列表吗？所有任务也将被删除。",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/task-lists/${taskListId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        showSuccess("任务列表删除成功")
        onOpenChange(false)
        onSuccess()
      } else {
        const data = await response.json()
        showError("删除失败", data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
      showError("删除失败", "删除失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑任务列表</DialogTitle>
            <DialogDescription>修改任务列表信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-list-name">名称 *</Label>
              <Input
                id="edit-list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入列表名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-list-description">描述（备忘）</Label>
              <Textarea
                id="edit-list-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入描述（可选）"
                rows={3}
              />
            </div>
            <ColorPicker value={color} onChange={setColor} label="Group颜色" />
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
                {isLoading ? "更新中..." : "保存"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

