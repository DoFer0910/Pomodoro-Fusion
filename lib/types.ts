export interface Project {
  id: string
  name: string
  clientName?: string
  hourlyRate: number
  color: string
  archived?: boolean
  createdAt: number
  updatedAt: number
}

export interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: number
  projectId?: string
}

export interface Session {
  id: string
  timestamp: number
  duration: number
  status: "completed" | "interrupted"
  isBillable: boolean
  todoId?: string
  todoTitle?: string
  projectId?: string
}

export interface Settings {
  defaultHourlyRate: number
  goalAmount: number
  workDuration: number
  breakDuration: number
  language: "ja" | "en"
  allowOvertime: boolean
  alarmSound: "bell" | "digital" | "none"
  longBreakDuration: number
  longBreakInterval: number
  countInterruptedSessions: boolean
  monthlyGoals: Record<string, number>
  hideMoneyCount: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  defaultHourlyRate: 2500,
  goalAmount: 300000,
  workDuration: 25,
  breakDuration: 5,
  language: "ja",
  allowOvertime: true,
  alarmSound: "bell",
  longBreakDuration: 15,
  longBreakInterval: 4,
  countInterruptedSessions: true,
  monthlyGoals: {},
  hideMoneyCount: false,
}
