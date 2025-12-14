"use client"

import { Project } from "@/store/projectStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, MoreVertical } from "lucide-react"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProjectStore } from "@/store/projectStore"
import { useNotification } from "@/components/ui/notification"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useState } from "react"
import { EditProjectDialog } from "./EditProjectDialog"

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onUpdate?: () => void
}

export function ProjectCard({ project, onClick, onUpdate }: ProjectCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const { deleteProject } = useProjectStore()
  const { showSuccess, showError } = useNotification()
  const confirm = useConfirm()

  // 计算任务统计
  const totalTasks = project.taskLists.reduce((sum, list) => sum + list.tasks.length, 0)
  const completedTasks = project.taskLists.reduce(
    (sum, list) => sum + list.tasks.filter((t) => t.status === "COMPLETE").length,
    0
  )
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm.confirm({
      title: "删除项目",
      message: "确定要删除这个项目吗？所有任务列表和任务也将被删除。",
      variant: "destructive",
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        deleteProject(project.id)
        showSuccess("项目删除成功")
        onUpdate?.()
      } else {
        const error = await response.json()
        showError("删除失败", error.error || "删除失败")
      }
    } catch (error) {
      console.error("删除项目错误:", error)
      showError("删除失败", "删除项目失败，请稍后重试")
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditOpen(true)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow relative group"
        style={{
          borderLeft: project.color
            ? `4px solid ${project.color}`
            : undefined,
        }}
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  编辑项目
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  删除项目
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalTasks} 任务</Badge>
              <Badge variant="outline">{progress}% 完成</Badge>
            </div>
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <EditProjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        projectId={project.id}
        onSuccess={() => {
          onUpdate?.()
        }}
      />
    </motion.div>
  )
}

