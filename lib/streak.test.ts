import { describe, it, expect } from "vitest"
import { calculateStreak } from "./streak"
import type { Session } from "./types"

/** 指定日（base からのオフセット日）にセッションを作る。 */
function sessionOnDay(base: Date, offsetDays: number, id?: string): Session {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return {
    id: id ?? crypto.randomUUID(),
    timestamp: d.getTime(),
    duration: 1500,
    status: "completed",
    isBillable: false,
  }
}

describe("calculateStreak", () => {
  const now = new Date(2026, 5, 8, 12, 0, 0) // 2026-06-08 12:00 ローカル

  it("セッションが無ければ 0/0", () => {
    expect(calculateStreak([], now)).toEqual({ current: 0, longest: 0 })
  })

  it("今日だけ作業していれば current=1, longest=1", () => {
    expect(calculateStreak([sessionOnDay(now, 0)], now)).toEqual({ current: 1, longest: 1 })
  })

  it("今日含め3日連続なら current=3", () => {
    const sessions = [sessionOnDay(now, 0), sessionOnDay(now, -1), sessionOnDay(now, -2)]
    expect(calculateStreak(sessions, now)).toEqual({ current: 3, longest: 3 })
  })

  it("今日は未作業でも昨日まで続いていれば current は維持される", () => {
    const sessions = [sessionOnDay(now, -1), sessionOnDay(now, -2)]
    expect(calculateStreak(sessions, now)).toEqual({ current: 2, longest: 2 })
  })

  it("今日も昨日も無ければ current=0 だが longest は残る", () => {
    const sessions = [sessionOnDay(now, -5), sessionOnDay(now, -4), sessionOnDay(now, -3)]
    expect(calculateStreak(sessions, now)).toEqual({ current: 0, longest: 3 })
  })

  it("同じ日に複数セッションがあっても1日として数える", () => {
    const sessions = [sessionOnDay(now, 0, "a"), sessionOnDay(now, 0, "b"), sessionOnDay(now, -1, "c")]
    expect(calculateStreak(sessions, now)).toEqual({ current: 2, longest: 2 })
  })

  it("過去の長い連続が最長として残り、現在は別の短い連続を数える", () => {
    const sessions = [
      sessionOnDay(now, -10),
      sessionOnDay(now, -9),
      sessionOnDay(now, -8),
      sessionOnDay(now, -7),
      sessionOnDay(now, 0),
      sessionOnDay(now, -1),
    ]
    expect(calculateStreak(sessions, now)).toEqual({ current: 2, longest: 4 })
  })
})
