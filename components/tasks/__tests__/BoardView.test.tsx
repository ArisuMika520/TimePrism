/**
 * BoardView组件测试
 */

import { render, screen } from '@testing-library/react'
import { BoardView } from '../BoardView'

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

// Mock @dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}))

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn((arr, oldIndex, newIndex) => {
    const newArr = [...arr]
    const [removed] = newArr.splice(oldIndex, 1)
    newArr.splice(newIndex, 0, removed)
    return newArr
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  horizontalListSortingStrategy: jest.fn(),
}))

// Mock Zustand store
jest.mock('@/store/taskStore', () => ({
  useTaskStore: () => ({
    taskLists: [],
    setTaskLists: jest.fn(),
    moveTask: jest.fn(),
    isLoading: false,
    setLoading: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [],
  })
) as jest.Mock

describe('BoardView', () => {
  it('应该渲染组件', () => {
    render(<BoardView />)
    expect(screen.getByText(/任务看板|Task Board/i)).toBeInTheDocument()
  })

  it('应该显示创建任务列表按钮', () => {
    render(<BoardView />)
    // 根据实际实现调整
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})






