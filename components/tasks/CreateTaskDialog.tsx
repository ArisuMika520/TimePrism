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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Priority, TaskStatus } from "@/store/taskStore"
import { useNotification } from "@/components/ui/notification"
import { useEffect } from "react"
import { ProjectCustomStatus } from "@/store/projectStore"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskListId: string
  onSuccess: () => void
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  taskListId,
  onSuccess,
}: CreateTaskDialogProps) {
  const { showError } = useNotification()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("MEDIUM")
  const [status, setStatus] = useState<TaskStatus>("TODO")
  const [customStatusId, setCustomStatusId] = useState<string | null>(null)
  const [customStatuses, setCustomStatuses] = useState<ProjectCustomStatus[]>([])
  const [tags, setTags] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchCustomStatuses()
    }
  }, [open])

  const fetchCustomStatuses = async () => {
    try {
      const response = await fetch("/api/project-custom-statuses")
      if (response.ok) {
        const data = await response.json()
        setCustomStatuses(data)
      }
    } catch (error) {
      console.error("获取自定义状态失败:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          status,
          customStatusId: customStatusId || null,
          tags: tags
            ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
            : [],
          dueDate: dueDate || null,
          taskListId,
        }),
      })

      if (response.ok) {
        onSuccess()
        setTitle("")
        setDescription("")
        setPriority("MEDIUM")
        setStatus("TODO")
        setCustomStatusId(null)
        setTags("")
        setDueDate("")
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新建任务</DialogTitle>
            <DialogDescription>创建一个新的任务</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">标题 *</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入任务标题"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-description">描述（备忘）</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入详细描述（可选）"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-priority">优先级</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as Priority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">低</SelectItem>
                    <SelectItem value="MEDIUM">中</SelectItem>
                    <SelectItem value="HIGH">高</SelectItem>
                    <SelectItem value="URGENT">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-status">状态</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TaskStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">待办</SelectItem>
                    <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                    <SelectItem value="COMPLETE">完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {customStatuses.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="task-customStatus">自定义状态（可选）</Label>
                <Select
                  value={customStatusId || ""}
                  onValueChange={(value) => setCustomStatusId(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择自定义状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {customStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          {status.color && (
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                          )}
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-dueDate">截止日期</Label>
                <Input
                  id="task-dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-tags">标签（逗号分隔）</Label>
                <Input
                  id="task-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="标签1, 标签2"
                />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

