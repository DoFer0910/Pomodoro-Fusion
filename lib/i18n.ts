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
    finishSessionToSwitch: "モードを切り替えるにはセッションを終了してください",

    // Stats
    stats: "統計",
    thisMonth: "今月",
    totalEarnings: "合計収益",
    totalTime: "合計作業時間",
    goal: "目標",
    progress: "達成率",
    remaining: "残り目安",
    dailyRemaining: "1日あたり",
    hours: "時間",
    minutes: "分",
    sessions: "セッション",

    // History
    history: "履歴",
    noHistory: "履歴がありません",
    noHistoryThisMonth: "この月の履歴はありません",
    deleteSelected: "選択を削除",
    selectAll: "すべて選択",
    earned: "獲得",

    // Settings
    settings: "設定",
    hourlyRate: "時給",
    monthlyGoal: "月間目標",
    workDuration: "作業時間",
    breakDuration: "休憩時間",
    longBreakDuration: "長休憩時間",
    longBreakInterval: "長休憩間隔 (セット)",
    language: "言語",
    save: "保存",
    allowOvertime: "オーバータイム（時間超過）を許可",
    hideMoneyCount: "金額表示を隠す（マウスオーバーで表示）",
    countInterruptedSessions: "中断セッションも収益に含める",
    alarmSound: "アラーム音",
    soundBell: "ベル",
    soundDigital: "デジタル",
    soundNone: "なし",
    finishWork: "作業終了",
    overtime: "ボーナスタイム",

    // Notifications & Tray
    notifyWorkDoneTitle: "作業セッション完了",
    notifyWorkDoneBody: "お疲れさまです。休憩を取りましょう。",
    notifyBreakDoneTitle: "休憩終了",
    notifyBreakDoneBody: "次の作業セッションを始めましょう。",
    trayShow: "ウィンドウを表示",
    trayStartPause: "開始 / 一時停止",
    trayQuit: "終了",
    trayTooltipIdle: "イールド - 停止中",

    // Streak
    currentStreak: "連続",
    longestStreak: "最長",
    streakDays: "日",

    // Pace forecast
    projectedThisMonth: "月末着地予測",
    onTrack: "このペースで達成可能",
    behindPace: "ペースが不足",

    // Idle detection
    idleDetection: "離席を検知して自動一時停止",
    idleThreshold: "離席とみなす時間",
    notifyIdleTitle: "離席を検知しました",
    notifyIdleBody: "タイマーを一時停止しました。戻ったら再開してください。",


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

    // Projects
    projects: "プロジェクト",
    addProject: "プロジェクトを追加",
    editProject: "プロジェクトを編集",
    projectName: "プロジェクト名",
    clientName: "クライアント名 (任意)",
    projectColor: "カラー",
    repoPath: "リポジトリのパス (任意・複数可)",
    repoPathHint: "Claude Code の作業時間をこのプロジェクトに紐づけます",
    addRepoPath: "リポジトリを追加",
    removeRepoPath: "削除",
    repoBillable: "収益",
    repoFocus: "没頭",
    repoBillableHint: "リポジトリごとに、その時間を収益として計上するか没頭モードに換算するかを選べます",
    selectProject: "プロジェクトを選択...",
    noProject: "プロジェクトなし",
    allProjects: "すべてのプロジェクト",
    defaultHourlyRate: "デフォルト時給",
    defaultHourlyRateDesc: "プロジェクトが選択されていない場合に適用される時給です。",

    // Claude Code 連携
    syncClaude: "Claude Code 同期",
    claudeCodeTime: "Claude Code",
    claudeSyncHint: "Claude Code の作業時間を取り込みます",
    claudeSyncResult: "Claude Code: 新規 {added} 件 / 更新 {updated} 件",
    claudeSyncUnmatched: "（未登録リポジトリ {unmatched} 件）",
    claudeSyncFailed: "Claude Code の同期に失敗しました",

    // Stats additional
    edit: "編集",
    goalAchieved: "目標達成！",
    focusModeNoGoal: "没頭モード - 目標金額なし",
    dailyEarnings: "日別収益",
    dailyFocusTime: "日別集中時間",
    activityMap: "アクティビティマップ",
    dailyDetails: "日別詳細",
    projectBreakdown: "プロジェクト別内訳",
    unknownProject: "未分類",
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
    finishSessionToSwitch: "Finish session to switch mode",

    // Stats
    stats: "Stats",
    thisMonth: "This Month",
    totalEarnings: "Total Earnings",
    totalTime: "Total Time",
    goal: "Goal",
    progress: "Progress",
    remaining: "Remaining",
    dailyRemaining: "Daily Avg",
    hours: "hours",
    minutes: "min",
    sessions: "sessions",

    // History
    history: "History",
    noHistory: "No history yet",
    noHistoryThisMonth: "No history this month",
    deleteSelected: "Delete Selected",
    selectAll: "Select All",
    earned: "Earned",

    // Settings
    settings: "Settings",
    hourlyRate: "Hourly Rate",
    monthlyGoal: "Monthly Goal",
    workDuration: "Work Duration",
    breakDuration: "Break Duration",
    longBreakDuration: "Long Break Duration",
    longBreakInterval: "Long Break Interval (Sets)",
    language: "Language",
    save: "Save",
    allowOvertime: "Allow Overtime",
    hideMoneyCount: "Hide Money Count (Show on Hover)",
    countInterruptedSessions: "Count Interrupted Sessions",
    alarmSound: "Alarm Sound",
    soundBell: "Bell",
    soundDigital: "Digital",
    soundNone: "None",
    finishWork: "Finish Work",
    overtime: "BONUS TIME",

    // Notifications & Tray
    notifyWorkDoneTitle: "Work session complete",
    notifyWorkDoneBody: "Nice work. Time for a break.",
    notifyBreakDoneTitle: "Break over",
    notifyBreakDoneBody: "Let's start the next work session.",
    trayShow: "Show Window",
    trayStartPause: "Start / Pause",
    trayQuit: "Quit",
    trayTooltipIdle: "Yield - Idle",

    // Streak
    currentStreak: "Streak",
    longestStreak: "Longest",
    streakDays: "d",

    // Pace forecast
    projectedThisMonth: "Projected",
    onTrack: "On track to hit goal",
    behindPace: "Behind pace",

    // Idle detection
    idleDetection: "Auto-pause on idle",
    idleThreshold: "Idle threshold",
    notifyIdleTitle: "Idle detected",
    notifyIdleBody: "Timer paused. Resume when you're back.",


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

    // Projects
    projects: "Projects",
    addProject: "Add Project",
    editProject: "Edit Project",
    projectName: "Project Name",
    clientName: "Client Name (Optional)",
    projectColor: "Color",
    repoPath: "Repository Paths (Optional)",
    repoPathHint: "Link Claude Code working time to this project",
    addRepoPath: "Add Repository",
    removeRepoPath: "Remove",
    repoBillable: "Billable",
    repoFocus: "Focus",
    repoBillableHint: "Choose per repository whether its time counts as earnings or as focus mode",
    selectProject: "Select Project...",
    noProject: "No Project",
    allProjects: "All Projects",
    defaultHourlyRate: "Default Hourly Rate",
    defaultHourlyRateDesc: "This rate is used when no specific project is selected.",

    // Claude Code integration
    syncClaude: "Sync Claude Code",
    claudeCodeTime: "Claude Code",
    claudeSyncHint: "Import Claude Code working time",
    claudeSyncResult: "Claude Code: {added} added / {updated} updated",
    claudeSyncUnmatched: " ({unmatched} unregistered repos)",
    claudeSyncFailed: "Failed to sync Claude Code",

    // Stats additional
    edit: "Edit",
    goalAchieved: "Goal Achieved!",
    focusModeNoGoal: "Focus Mode - No Monetary Goal",
    dailyEarnings: "Daily Earnings",
    dailyFocusTime: "Daily Focus Time",
    activityMap: "Activity Map",
    dailyDetails: "Daily Details",
    projectBreakdown: "Project Breakdown",
    unknownProject: "Unknown Project",
  },
} as const

export function useTranslation(lang: Language) {
  return translations[lang]
}
