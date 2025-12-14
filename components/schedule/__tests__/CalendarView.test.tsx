/**
 * CalendarView组件测试
 */

import { render, screen } from '@testing-library/react'
import { CalendarView } from '../CalendarView'

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

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => date.toString()),
  startOfMonth: jest.fn((date) => date),
  endOfMonth: jest.fn((date) => date),
  eachDayOfInterval: jest.fn(() => []),
  isSameMonth: jest.fn(() => true),
  isToday: jest.fn(() => false),
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [],
  })
) as jest.Mock

// Mock schedule store
jest.mock('@/store/scheduleStore', () => ({
  useScheduleStore: () => ({
    schedules: [],
    setSchedules: jest.fn(),
    isLoading: false,
    setLoading: jest.fn(),
  }),
}))

describe('CalendarView', () => {
  // 注意: CalendarView组件依赖较多，需要完整的mock设置
  // 这里先跳过，后续可以完善
  it.skip('应该渲染组件', () => {
    // 需要mock:
    // - date-fns的所有函数
    // - scheduleStore
    // - 所有UI组件
    render(<CalendarView />)
  })
})

