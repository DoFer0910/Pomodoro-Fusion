export type Language = "ja" | "en"

export const translations = {
  ja: {
    // Header
    appName: "ポモドーロ・フュージョン",
    billableMode: "稼ぐモード",
    focusMode: "没頭モード",

    // Timer
    focus: "集中",
    break: "休憩",
    start: "スタート",
    pause: "一時停止",
    reset: "リセット",
    skip: "スキップ",

    // Stats
    stats: "統計",
    thisMonth: "今月",
    totalEarnings: "合計収益",
    totalTime: "合計作業時間",
    goal: "目標",
    progress: "達成率",
    remaining: "残り目安",
    hours: "時間",
    minutes: "分",
    sessions: "セッション",

    // History
    history: "履歴",
    noHistory: "履歴がありません",
    deleteSelected: "選択を削除",
    selectAll: "すべて選択",
    earned: "獲得",

    // Settings
    settings: "設定",
    hourlyRate: "時給",
    monthlyGoal: "月間目標",
    workDuration: "作業時間",
    breakDuration: "休憩時間",
    language: "言語",
    save: "保存",

    // Money overlay
    earned_prefix: "+¥",

    // Navigation
    timer: "タイマー",
  },
  en: {
    // Header
    appName: "Pomodoro Fusion",
    billableMode: "Billable Mode",
    focusMode: "Focus Mode",

    // Timer
    focus: "Focus",
    break: "Break",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    skip: "Skip",

    // Stats
    stats: "Stats",
    thisMonth: "This Month",
    totalEarnings: "Total Earnings",
    totalTime: "Total Time",
    goal: "Goal",
    progress: "Progress",
    remaining: "Remaining",
    hours: "hours",
    minutes: "min",
    sessions: "sessions",

    // History
    history: "History",
    noHistory: "No history yet",
    deleteSelected: "Delete Selected",
    selectAll: "Select All",
    earned: "Earned",

    // Settings
    settings: "Settings",
    hourlyRate: "Hourly Rate",
    monthlyGoal: "Monthly Goal",
    workDuration: "Work Duration",
    breakDuration: "Break Duration",
    language: "Language",
    save: "Save",

    // Money overlay
    earned_prefix: "+¥",

    // Navigation
    timer: "Timer",
  },
} as const

export function useTranslation(lang: Language) {
  return translations[lang]
}
