/**
 * Todo Store测试
 */

import { useTodoStore } from '../todoStore'

describe('TodoStore', () => {
  beforeEach(() => {
    // 重置store状态
    useTodoStore.setState({
      todos: [],
      isLoading: false,
    })
  })

  it('应该初始化空状态', () => {
    const state = useTodoStore.getState()
    expect(state.todos).toEqual([])
    expect(state.isLoading).toBe(false)
  })

  it('应该设置todos', () => {
    const todos = [
      {
        id: '1',
        title: '测试Todo',
        completed: false,
        priority: 'MEDIUM' as const,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
    ]

    useTodoStore.getState().setTodos(todos)
    const state = useTodoStore.getState()
    expect(state.todos).toHaveLength(1)
    expect(state.todos[0].title).toBe('测试Todo')
  })

  it('应该设置加载状态', () => {
    useTodoStore.getState().setLoading(true)
    expect(useTodoStore.getState().isLoading).toBe(true)

    useTodoStore.getState().setLoading(false)
    expect(useTodoStore.getState().isLoading).toBe(false)
  })
})






