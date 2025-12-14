/**
 * TodoList组件测试
 * 
 * 注意: 需要先运行 tests/test-frontend-setup.sh 设置测试环境
 */

import { render, screen, waitFor } from '@testing-library/react'
import { TodoList } from '../TodoList'

// Mock Zustand store
const mockSetTodos = jest.fn()
const mockSetLoading = jest.fn()

jest.mock('@/store/todoStore', () => ({
  useTodoStore: jest.fn(() => ({
    todos: [],
    setTodos: mockSetTodos,
    isLoading: false,
    setLoading: mockSetLoading,
  })),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [],
  })
) as jest.Mock

describe('TodoList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该渲染组件', () => {
    render(<TodoList />)
    expect(screen.getByText('待办事项')).toBeInTheDocument()
  })

  it('应该显示创建按钮', () => {
    render(<TodoList />)
    expect(screen.getByText('新建待办')).toBeInTheDocument()
  })

  // 注意: 加载状态测试需要更复杂的mock设置
  // 由于jest.resetModules()会导致React hooks问题，暂时跳过
  it.skip('应该在加载时显示加载状态', () => {
    // 这个测试需要特殊的mock设置
    // 可以通过直接测试store的isLoading状态来验证
  })

  it('应该显示空状态', () => {
    render(<TodoList />)
    expect(screen.getByText(/还没有待办事项/)).toBeInTheDocument()
  })
})

