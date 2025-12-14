"use client"

import { useState, useEffect } from "react"
import { Todo } from "@/store/todoStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X } from "lucide-react"
import { useNotification } from "@/components/ui/notification"
import { useTodoStore } from "@/store/todoStore"

interface TaskTodoListProps {
  taskId: string
  todos: Todo[]
  onUpdate: () => void
}

export function TaskTodoList({ taskId, todos: initialTodos, onUpdate }: TaskTodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [newTodoTitle, setNewTodoTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const { showSuccess, showError } = useNotification()
  const { addTodo } = useTodoStore()

  useEffect(() => {
    setTodos(initialTodos)
  }, [initialTodos])

  const handleToggleTodo = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETE" ? "WAIT" : "COMPLETE"
    
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedTodo = await response.json()
        setTodos((prev) =>
          prev.map((todo) => (todo.id === todoId ? updatedTodo : todo))
        )
        onUpdate()
      } else {
        showError("更新失败", "更新Todo状态失败")
      }
    } catch (error) {
      console.error("更新Todo失败:", error)
      showError("更新失败", "更新Todo状态失败，请稍后重试")
    }
  }

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoTitle.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          taskId: taskId,
          status: "WAIT",
        }),
      })

      if (response.ok) {
        const newTodo = await response.json()
        setTodos((prev) => [...prev, newTodo])
        addTodo(newTodo)
        setNewTodoTitle("")
        showSuccess("Todo添加成功")
        onUpdate()
      } else {
        const error = await response.json()
        showError("添加失败", error.error || "添加Todo失败")
      }
    } catch (error) {
      console.error("添加Todo失败:", error)
      showError("添加失败", "添加Todo失败，请稍后重试")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: null }),
      })

      if (response.ok) {
        setTodos((prev) => prev.filter((todo) => todo.id !== todoId))
        onUpdate()
      } else {
        showError("移除失败", "从Task移除Todo失败")
      }
    } catch (error) {
      console.error("移除Todo失败:", error)
      showError("移除失败", "从Task移除Todo失败，请稍后重试")
    }
  }

  return (
    <div className="space-y-2 mt-3 pt-3 border-t">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        子任务 ({todos.length})
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={todo.status === "COMPLETE"}
              onCheckedChange={() => handleToggleTodo(todo.id, todo.status)}
            />
            <span
              className={`flex-1 text-sm ${
                todo.status === "COMPLETE"
                  ? "line-through text-muted-foreground"
                  : ""
              }`}
            >
              {todo.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleRemoveTodo(todo.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddTodo} className="flex gap-2">
        <Input
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="添加子任务..."
          className="h-8 text-sm"
          disabled={isAdding}
        />
        <Button type="submit" size="sm" disabled={isAdding || !newTodoTitle.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </form>
    </div>
  )
}

