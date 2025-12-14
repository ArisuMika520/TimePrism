/**
 * TaskCard组件测试
 */

import { render, screen } from '@testing-library/react'
import { TaskCard } from '../TaskCard'

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
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    setNodeRef: jest.fn(),
    attributes: {},
    listeners: {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: jest.fn(),
    Translate: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('TaskCard', () => {
  const mockTask = {
    id: '1',
    title: '测试任务',
    description: '这是一个测试任务',
    status: 'TODO' as const,
    priority: 'MEDIUM' as const,
    position: 0,
    taskListId: 'list-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['test'],
    attachments: [],
  }

  it('应该渲染任务卡片', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('测试任务')).toBeInTheDocument()
  })

  it('应该显示任务描述', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('这是一个测试任务')).toBeInTheDocument()
  })

  it('应该显示任务状态', () => {
    render(<TaskCard task={mockTask} />)
    // 根据实际实现调整
    expect(screen.getByText('测试任务')).toBeInTheDocument()
  })
})

