// 連続作業日数（ストリーク）の算出。セッションのある暦日を集合にし、
// 連続している日数を数える。継続のモチベーション表示に使う。

import type { Session } from "@/lib/types"

export interface StreakResult {
  /** 現在の連続日数。今日または昨日に作業があり、そこから途切れず遡れる日数。 */
  current: number
  /** 全期間で最長の連続日数。 */
  longest: number
}

// Date を「YYYY-MM-DD」のローカル暦日キーに変換する。
// UTC ではなくローカル日付で数えるのは、ユーザーの体感（その日に作業したか）に合わせるため。
function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// 暦日キーを Date（その日の0時）に戻す。連続判定で前日を求めるのに使う。
function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// 翌日のキーを返す。
function nextDayKey(key: string): string {
  const date = keyToDate(key)
  date.setDate(date.getDate() + 1)
  return dayKey(date)
}

/**
 * セッション一覧から現在/最長のストリークを算出する。
 * @param sessions 対象セッション（呼び出し側でモードや完了状態を絞ってから渡す想定）
 * @param now 基準日時。テスト用に注入できるようにする。既定は現在時刻。
 */
export function calculateStreak(sessions: Session[], now: Date = new Date()): StreakResult {
  if (sessions.length === 0) return { current: 0, longest: 0 }

  // 作業した暦日の集合（重複排除）。
  const daySet = new Set<string>()
  for (const s of sessions) {
    daySet.add(dayKey(new Date(s.timestamp)))
  }

  const sortedKeys = Array.from(daySet).sort()

  // 最長ストリーク: 昇順に走査し、前日から連続していれば伸ばす。
  let longest = 0
  let run = 0
  let prevKey: string | null = null
  for (const key of sortedKeys) {
    if (prevKey !== null && nextDayKey(prevKey) === key) {
      run += 1
    } else {
      run = 1
    }
    if (run > longest) longest = run
    prevKey = key
  }

  // 現在のストリーク: 今日に作業があれば今日から、無ければ昨日から遡る。
  // （今日まだ作業していなくても昨日まで続いていれば「継続中」とみなす。）
  const todayKey = dayKey(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dayKey(yesterday)

  let cursor: string
  if (daySet.has(todayKey)) {
    cursor = todayKey
  } else if (daySet.has(yesterdayKey)) {
    cursor = yesterdayKey
  } else {
    return { current: 0, longest }
  }

  let current = 0
  while (daySet.has(cursor)) {
    current += 1
    const prev = keyToDate(cursor)
    prev.setDate(prev.getDate() - 1)
    cursor = dayKey(prev)
  }

  return { current, longest }
}
