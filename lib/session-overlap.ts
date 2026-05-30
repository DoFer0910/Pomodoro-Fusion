import { type Session } from "./types"

/**
 * セッションの時間帯（ミリ秒）。[start, end) の半開区間として扱う。
 */
interface Interval {
  start: number
  end: number
}

/**
 * セッションが claude-code 由来かを判定する。
 * source 未指定は従来のポモドーロ計測（types.ts のコメント参照）なので claude-code ではない。
 */
function isClaudeSession(s: Session): boolean {
  return s.source === "claude-code"
}

/**
 * セッションの時間帯を [start, end) で返す。
 * end は start + duration（秒→ミリ秒）で近似する。
 * claude-code の duration は離席ギャップ除外後の正味秒数なので、
 * 実際の終了時刻より早めに出るが、現状の Session データだけで完結させるためこれで近似する。
 */
function toInterval(s: Session): Interval {
  return { start: s.timestamp, end: s.timestamp + s.duration * 1000 }
}

/**
 * 区間配列を開始時刻順にソートし、重なり・隣接をマージして
 * 重複のない区間配列にまとめる。claude-code 同士が重なっていても
 * 二重に数えないようにするための前処理。
 */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: Interval[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const cur = sorted[i]
    if (cur.start <= last.end) {
      // 重なる or 隣接 → 終端を伸ばして統合
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push({ ...cur })
    }
  }

  return merged
}

/**
 * ある区間 [start, end) が、マージ済み claude 区間群と重なる合計ミリ秒を返す。
 * merged は開始時刻昇順・非重複である前提。
 */
function overlapMs(interval: Interval, merged: Interval[]): number {
  let total = 0
  for (const m of merged) {
    if (m.start >= interval.end) break // 以降は interval より後ろなので打ち切り
    const lo = Math.max(interval.start, m.start)
    const hi = Math.min(interval.end, m.end)
    if (hi > lo) total += hi - lo
  }
  return total
}

/**
 * タイマー（pomodoro）と Claude Code の作業時間が同じ時間帯で二重計上されるのを防ぐため、
 * claude-code セッションを「真」として、重なる pomodoro セッションの duration を相殺する。
 *
 * 方針（ユーザー確定事項）:
 * - 時間帯が重なったら claude-code を優先（真とする）
 * - 重なる pomodoro 区間を duration から差し引く
 * - 区間は [timestamp, timestamp + duration] で近似する
 * - 元データは書き換えず、集計用に相殺後の Session 配列を返す純粋関数
 *
 * 挙動:
 * - claude-code セッションはそのまま通す
 * - pomodoro（source 未指定含む）は claude 区間との重なり秒数を duration から引く
 * - 相殺の結果 duration が 0 以下になった pomodoro は集計対象から除外する
 *
 * window や electron に依存しないため、そのままユニットテストできる。
 */
export function resolveSessionOverlaps(sessions: Session[]): Session[] {
  const claudeIntervals = sessions
    .filter(isClaudeSession)
    .map(toInterval)
    .filter((iv) => iv.end > iv.start)

  // claude セッションが無ければ相殺する対象も無いので、そのまま返す
  if (claudeIntervals.length === 0) return sessions

  const merged = mergeIntervals(claudeIntervals)
  const result: Session[] = []

  for (const s of sessions) {
    if (isClaudeSession(s)) {
      result.push(s)
      continue
    }

    const interval = toInterval(s)
    const overlapSeconds = Math.round(overlapMs(interval, merged) / 1000)
    if (overlapSeconds <= 0) {
      result.push(s)
      continue
    }

    const adjusted = s.duration - overlapSeconds
    if (adjusted <= 0) {
      // claude 区間に完全に飲み込まれた pomodoro は二重計上分なので除外
      continue
    }
    result.push({ ...s, duration: adjusted })
  }

  return result
}
