export interface Session {
  id: string
  timestamp: number
  duration: number
  status: "completed" | "interrupted"
  isBillable: boolean
}

export interface Settings {
  hourlyRate: number
  goalAmount: number
  workDuration: number
  breakDuration: number
  language: "ja" | "en"
  allowOvertime: boolean
  alarmSound: "bell" | "digital" | "none"
  longBreakDuration: number
  longBreakInterval: number
  countInterruptedSessions: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  hourlyRate: 2500,
  goalAmount: 300000,
  workDuration: 25,
  breakDuration: 5,
  language: "ja",
  allowOvertime: true,
  alarmSound: "bell",
  longBreakDuration: 15,
  longBreakInterval: 4,
  countInterruptedSessions: false,
}
