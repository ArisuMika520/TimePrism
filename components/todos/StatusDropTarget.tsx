"use client"

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

interface StatusDropTargetProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function StatusDropTarget({ id, children, className }: StatusDropTargetProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-primary ring-offset-2 rounded-md"
      )}
    >
      {children}
    </div>
  )
}



