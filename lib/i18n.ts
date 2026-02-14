export type Language = "ja" | "en"

export const translations = {
  ja: {
    // Header
    appName: "イールド",
    billableMode: "稼ぐ",
    focusMode: "没頭",

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
    appearance: "外観",
    theme: "テーマ",
    hourlyRate: "時給",
    monthlyGoal: "月間目標",
    workDuration: "作業時間",
    breakDuration: "休憩時間",
    longBreakDuration: "長休憩時間",
    longBreakInterval: "長休憩間隔 (セット)",
    language: "言語",
    save: "保存",
    allowOvertime: "オーバータイム（時間超過）を許可",
    countInterruptedSessions: "中断セッションも収益に含める",
    alarmSound: "アラーム音",
    soundBell: "ベル",
    soundDigital: "デジタル",
    soundNone: "なし",
    finishWork: "作業終了",
    overtime: "超過",


    // Data Management
    dataManagement: "データ管理",
    backupJson: "バックアップ (JSON)",
    restoreJson: "復元 (JSON)",
    exportCsv: "CSV出力",
    backupDesc: "設定と履歴をJSONファイルとして保存します。",
    restoreDesc: "バックアップファイルからデータを復元します。",
    csvDesc: "履歴をCSV形式でダウンロードします。",
    successImport: "データの復元に成功しました。",
    failImport: "データの復元に失敗しました。",

    // Money overlay
    earned_prefix: "+¥",

    // Navigation
    timer: "タイマー",
    todo: "ToDo",

    // ToDo
    addTask: "タスクを追加...",
    noTasks: "タスクがありません",
    selectTask: "タスクを選択...",
    noTaskSelected: "タスクなし",
  },
  en: {
    // Header
    appName: "Yield",
    billableMode: "Earn",
    focusMode: "Focus",

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
    appearance: "Appearance",
    theme: "Theme",
    hourlyRate: "Hourly Rate",
    monthlyGoal: "Monthly Goal",
    workDuration: "Work Duration",
    breakDuration: "Break Duration",
    longBreakDuration: "Long Break Duration",
    longBreakInterval: "Long Break Interval (Sets)",
    language: "Language",
    save: "Save",
    allowOvertime: "Allow Overtime",
    countInterruptedSessions: "Count Interrupted Sessions",
    alarmSound: "Alarm Sound",
    soundBell: "Bell",
    soundDigital: "Digital",
    soundNone: "None",
    finishWork: "Finish Work",
    overtime: "Overtime",


    // Data Management
    dataManagement: "Data Management",
    backupJson: "Backup (JSON)",
    restoreJson: "Restore (JSON)",
    exportCsv: "Export CSV",
    backupDesc: "Save settings and history as a JSON file.",
    restoreDesc: "Restore data from a backup file.",
    csvDesc: "Download history in CSV format.",
    successImport: "Data restored successfully.",
    failImport: "Failed to restore data.",

    // Money overlay
    earned_prefix: "+¥",

    // Navigation
    timer: "Timer",
    todo: "ToDo",

    // ToDo
    addTask: "Add task...",
    noTasks: "No tasks",
    selectTask: "Select a task...",
    noTaskSelected: "No Task",
  },
} as const

export function useTranslation(lang: Language) {
  return translations[lang]
}
