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
import { Badge } from "@/components/ui/badge"
import { Priority, TodoStatus } from "@/store/todoStore"
import { Plus } from "lucide-react"
import { useNotification } from "@/components/ui/notification"

interface CreateTodoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateTodoDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTodoDialogProps) {
  const { showError, showSuccess } = useNotification()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TodoStatus>("WAIT")
  const [priority, setPriority] = useState<Priority>("MEDIUM")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState("")
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [links, setLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          priority,
          category: category || null,
          tags: tags
            ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
            : [],
          startDate: startDate || null,
          dueDate: dueDate || null,
          links,
        }),
      })

      if (response.ok) {
        showSuccess("创建成功", "待办事项已创建")
        onSuccess()
        setTitle("")
        setDescription("")
        setStatus("WAIT")
        setPriority("MEDIUM")
        setCategory("")
        setTags("")
        setStartDate("")
        setDueDate("")
        setLinks([])
        setNewLink("")
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
            <DialogTitle>新建待办事项</DialogTitle>
            <DialogDescription>
              创建一个新的待办事项来跟踪您的任务
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入待办事项标题"
                required
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述（备忘）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入详细描述（可选）"
                rows={3}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">状态</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TodoStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAIT">等待中</SelectItem>
                    <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                    <SelectItem value="COMPLETE">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">优先级</Label>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">截止日期</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">分类</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="工作、个人等"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">标签（逗号分隔）</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="标签1, 标签2"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="links">附加链接</Label>
              <div className="flex gap-2">
                <Input
                  id="links"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="输入链接 URL（可选）"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (newLink.trim() && !links.includes(newLink.trim())) {
                        try {
                          new URL(newLink.trim())
                          setLinks([...links, newLink.trim()])
                          setNewLink("")
                        } catch {
                          showError("无效的 URL", "请输入有效的 URL")
                        }
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => {
                    if (newLink.trim() && !links.includes(newLink.trim())) {
                      try {
                        new URL(newLink.trim())
                        setLinks([...links, newLink.trim()])
                        setNewLink("")
                      } catch {
                        showError("无效的 URL", "请输入有效的 URL")
                      }
                    }
                  }}
                  disabled={!newLink.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {links.map((link, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {link}
                      <button
                        type="button"
                        onClick={() => setLinks(links.filter((_, i) => i !== index))}
                        className="ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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

