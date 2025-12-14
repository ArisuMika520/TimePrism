"use client"

import { Project } from "@/store/projectStore"
import { ProjectCard } from "./ProjectCard"

interface ProjectListProps {
  projects: Project[]
  onProjectClick: (projectId: string) => void
  onUpdate?: () => void
}

export function ProjectList({ projects, onProjectClick, onUpdate }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        还没有项目，创建一个开始吧！
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project.id)}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

