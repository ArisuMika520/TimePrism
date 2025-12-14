"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TodoItem } from "./TodoItem"
import { Todo } from "@/store/todoStore"

interface SortableTodoItemProps {
  todo: Todo
  onUpdate: () => void
  customStatuses: Array<{ id: string; name: string; color?: string | null; position: number }>
  isSelected?: boolean
  onSelect?: (todoId: string, isMultiSelect: boolean, event?: React.MouseEvent) => void
  onArchive?: (todoId: string) => void
}

export function SortableTodoItem({
  todo,
  onUpdate,
  customStatuses,
  isSelected,
  onSelect,
  onArchive,
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: todo.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null)

  const customListeners = isSelected ? {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      const target = e.target as HTMLElement
      if (target.closest('.checkbox-container')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      if (listeners?.onPointerDown) {
        return listeners.onPointerDown(e as any)
      }
    },
    onMouseDown: (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      const target = e.target as HTMLElement
      if (target.closest('.checkbox-container')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      if (listeners?.onMouseDown) {
        return listeners.onMouseDown(e as any)
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      }
      
      const target = e.target as HTMLElement
      if (target.closest('.checkbox-container')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      if (listeners?.onTouchStart) {
        return listeners.onTouchStart(e as any)
      }
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (touchStartRef.current && e.touches.length === 1) {
        const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x)
        const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y)
        
        if (deltaY > deltaX && deltaY > 10) {
          touchStartRef.current = null
          return false
        }
      }
      
      if (listeners?.onTouchMove) {
        return listeners.onTouchMove(e as any)
      }
    },
  } : undefined

  return (
    <div 
      ref={setNodeRef}
      id={`todo-${todo.id}`} 
      style={style}
      {...(isSelected ? { ...attributes, ...customListeners } : {})}
      className={isSelected ? "cursor-grab active:cursor-grabbing" : ""}
    >
      <TodoItem
        todo={todo}
        onUpdate={onUpdate}
        customStatuses={customStatuses}
        dragHandleProps={isSelected ? undefined : { ...attributes, ...listeners }}
        isSelected={isSelected}
        onSelect={onSelect}
        onArchive={onArchive}
      />
    </div>
  )
}



