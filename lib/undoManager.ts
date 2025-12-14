// 撤销队列管理器

export interface UndoAction {
  id: string
  todoId: string
  previousStatus: string
  previousCustomStatusId: string | null
  newStatus: string
  newCustomStatusId: string | null
  timestamp: number
  undo: () => Promise<void>
  redo: () => Promise<void>
}

class UndoManager {
  private actions: Map<string, UndoAction> = new Map()
  private actionOrder: string[] = []
  private readonly UNDO_TIMEOUT = 30000

  private removeAction(actionId: string) {
    this.actions.delete(actionId)
    this.actionOrder = this.actionOrder.filter((id) => id !== actionId)
  }

  // 添加可撤销操作
  addAction(action: UndoAction): string {
    const existingEntry = Array.from(this.actions.entries()).find(
      ([, a]) => a.todoId === action.todoId
    )
    if (existingEntry) {
      this.removeAction(existingEntry[0])
    }

    this.actions.set(action.id, action)
    this.actionOrder.push(action.id)

    // 30秒后自动清理
    setTimeout(() => {
      this.removeAction(action.id)
    }, this.UNDO_TIMEOUT)

    return action.id
  }

  // 撤销操作
  async undo(actionId: string): Promise<boolean> {
    const action = this.actions.get(actionId)
    if (!action) {
      return false
    }

    try {
      await action.undo()
      this.removeAction(actionId)
      return true
    } catch (error) {
      return false
    }
  }

  // 获取操作信息
  getAction(actionId: string): UndoAction | undefined {
    return this.actions.get(actionId)
  }

  // 检查操作是否有效
  isValid(actionId: string): boolean {
    const action = this.actions.get(actionId)
    if (!action) {
      return false
    }

    const elapsed = Date.now() - action.timestamp
    return elapsed < this.UNDO_TIMEOUT
  }

  // 撤销最近一次操作
  async undoLatest(): Promise<{ success: boolean; action?: UndoAction }> {
    const latestId = this.actionOrder[this.actionOrder.length - 1]
    if (!latestId) {
      return { success: false }
    }

    if (!this.isValid(latestId)) {
      this.removeAction(latestId)
      return { success: false }
    }

    const action = this.actions.get(latestId)
    if (!action) {
      this.removeAction(latestId)
      return { success: false }
    }

    const success = await this.undo(latestId)
    return { success, action: success ? action : undefined }
  }

  /**
   * 清理所有操作
   */
  clear(): void {
    this.actions.clear()
    this.actionOrder = []
  }

  /**
   * 清理特定todo的所有操作
   */
  clearTodoActions(todoId: string): void {
    const actionsToDelete = Array.from(this.actions.values())
      .filter((a) => a.todoId === todoId)
      .map((a) => a.id)

    actionsToDelete.forEach((id) => this.removeAction(id))
  }
}

// 单例模式
export const undoManager = new UndoManager()



