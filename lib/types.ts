export interface Project {
  id: string
  name: string
  clientName?: string
  hourlyRate: number
  color: string
  archived?: boolean
  createdAt: number
  updatedAt: number
  /** Claude Code 連携用: 紐づける git リポジトリの絶対パス（複数可） */
  repoPaths?: string[]
  /**
   * @deprecated 後方互換用。旧バージョンで保存された単一パス。
   * 読み取り時のみ参照し、保存時は repoPaths に統一する。
   */
  repoPath?: string
  /**
   * リポジトリごとの収益/没頭の区分。
   * キーは normalizePath で正規化したリポジトリパス、値は「収益（billable）か」。
   * 未登録のパスは没頭モード（false）として扱う（デフォルト没頭）。
   */
  repoBillableMap?: Record<string, boolean>
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
  /** セッションの記録元。未指定は従来のポモドーロ計測（pomodoro 相当）として扱う */
  source?: "pomodoro" | "manual" | "claude-code"
  /** Claude Code セッションの jsonl ファイル名（= sessionId）。冪等同期のキー */
  claudeSessionId?: string
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
