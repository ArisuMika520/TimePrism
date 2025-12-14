/**
 * Task Store测试
 */

import { useTaskStore } from '../taskStore'

describe('TaskStore', () => {
  beforeEach(() => {
    // 重置store状态
    useTaskStore.setState({
      taskLists: [],
      isLoading: false,
    })
  })

  it('应该初始化空状态', () => {
    const state = useTaskStore.getState()
    expect(state.taskLists).toEqual([])
    expect(state.isLoading).toBe(false)
  })

  it('应该设置taskLists', () => {
    const taskLists = [
      {
        id: '1',
        name: '测试任务列表',
        description: '测试',
        position: 0,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
      },
    ]

    useTaskStore.getState().setTaskLists(taskLists)
    const state = useTaskStore.getState()
    expect(state.taskLists).toHaveLength(1)
    expect(state.taskLists[0].name).toBe('测试任务列表')
  })

  it('应该设置加载状态', () => {
    useTaskStore.getState().setLoading(true)
    expect(useTaskStore.getState().isLoading).toBe(true)

    useTaskStore.getState().setLoading(false)
    expect(useTaskStore.getState().isLoading).toBe(false)
  })
})






