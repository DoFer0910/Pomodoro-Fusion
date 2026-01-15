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
  language: "en" | "ja"
}

export const DEFAULT_SETTINGS: Settings = {
  hourlyRate: 3000,
  goalAmount: 300000,
  workDuration: 25,
  breakDuration: 5,
  language: "ja",
}
