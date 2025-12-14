import { create } from "zustand"

export interface Schedule {
  id: string
  title: string
  description?: string | null
  startTime: Date
  endTime: Date
  allDay: boolean
  location?: string | null
  repeatRule?: any // JSON field
  reminder?: number | null
  taskId?: string | null
  todoId?: string | null
  attachments: Attachment[]
  createdAt: Date
  updatedAt: Date
}

export interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface ScheduleStore {
  schedules: Schedule[]
  setSchedules: (schedules: Schedule[]) => void
  addSchedule: (schedule: Schedule) => void
  updateSchedule: (id: string, updates: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  schedules: [],
  isLoading: false,
  setSchedules: (schedules) => set({ schedules }),
  addSchedule: (schedule) =>
    set((state) => ({ schedules: [...state.schedules, schedule] })),
  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map((schedule) =>
        schedule.id === id ? { ...schedule, ...updates } : schedule
      ),
    })),
  deleteSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter((schedule) => schedule.id !== id),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}))

