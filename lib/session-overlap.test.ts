import { describe, it, expect } from "vitest"
import { resolveSessionOverlaps } from "./session-overlap"
import type { Session } from "./types"

const MIN = 60 * 1000 // 1分（ミリ秒）

/** テスト用 Session を簡潔に作るヘルパー。timestamp はミリ秒、duration は秒。 */
function session(
  partial: Partial<Session> & Pick<Session, "timestamp" | "duration">,
): Session {
  return {
    id: partial.id ?? crypto.randomUUID(),
    status: partial.status ?? "completed",
    isBillable: partial.isBillable ?? false,
    ...partial,
  }
}

/** 指定 id のセッションを結果から取り出す。 */
function find(sessions: Session[], id: string): Session | undefined {
  return sessions.find((s) => s.id === id)
}

describe("resolveSessionOverlaps", () => {
  it("claude-code セッションが無ければ何も変えずそのまま返す", () => {
    const sessions = [
      session({ id: "p1", timestamp: 0, duration: 1500, source: "pomodoro" }),
    ]
    expect(resolveSessionOverlaps(sessions)).toBe(sessions)
  })

  it("重ならない pomodoro と claude-code はどちらも保持し duration を変えない", () => {
    const sessions = [
      // 09:00-09:25 pomodoro
      session({ id: "p1", timestamp: 0, duration: 25 * 60, source: "pomodoro" }),
      // 10:00-10:10 claude（pomodoro と重ならない）
      session({ id: "c1", timestamp: 60 * MIN, duration: 10 * 60, source: "claude-code" }),
    ]
    const result = resolveSessionOverlaps(sessions)
    expect(find(result, "p1")!.duration).toBe(25 * 60)
    expect(find(result, "c1")!.duration).toBe(10 * 60)
  })

  it("pomodoro の途中に claude が収まる場合、重なり分だけ pomodoro を減らす", () => {
    // 00:00-25:00 pomodoro(1500s)、10:00-20:00 claude(600s) が内側で重なる
    const sessions = [
      session({ id: "p1", timestamp: 0, duration: 25 * 60, source: "pomodoro" }),
      session({ id: "c1", timestamp: 10 * MIN, duration: 10 * 60, source: "claude-code" }),
    ]
    const result = resolveSessionOverlaps(sessions)
    // pomodoro は 1500 - 600 = 900 に減る
    expect(find(result, "p1")!.duration).toBe(900)
    // claude はそのまま
    expect(find(result, "c1")!.duration).toBe(600)
  })

  it("claude に完全に飲み込まれた pomodoro は除外する", () => {
    // 10:00-20:00 pomodoro が、09:00-30:00 claude に完全包含される
    const sessions = [
      session({ id: "p1", timestamp: 10 * MIN, duration: 10 * 60, source: "pomodoro" }),
      session({ id: "c1", timestamp: 9 * MIN, duration: 21 * 60, source: "claude-code" }),
    ]
    const result = resolveSessionOverlaps(sessions)
    expect(find(result, "p1")).toBeUndefined()
    expect(find(result, "c1")).toBeDefined()
  })

  it("部分的に重なる場合、重なった分だけ差し引く", () => {
    // 00:00-20:00 pomodoro(1200s)、10:00-30:00 claude → 重なりは 10:00-20:00 の 600s
    const sessions = [
      session({ id: "p1", timestamp: 0, duration: 20 * 60, source: "pomodoro" }),
      session({ id: "c1", timestamp: 10 * MIN, duration: 20 * 60, source: "claude-code" }),
    ]
    const result = resolveSessionOverlaps(sessions)
    expect(find(result, "p1")!.duration).toBe(20 * 60 - 600)
  })

  it("source 未指定セッションも pomodoro として相殺対象になる", () => {
    const sessions = [
      session({ id: "p1", timestamp: 0, duration: 25 * 60 }), // source 無し
      session({ id: "c1", timestamp: 10 * MIN, duration: 10 * 60, source: "claude-code" }),
    ]
    const result = resolveSessionOverlaps(sessions)
    expect(find(result, "p1")!.duration).toBe(900)
  })

  it("複数の claude 区間が重なっていてもマージして二重に引かない", () => {
    // 00:00-30:00 pomodoro(1800s)
    // claude A: 05:00-15:00、claude B: 10:00-20:00 → マージすると 05:00-20:00 の 900s
    const sessions = [
      session({ id: "p1", timestamp: 0, duration: 30 * 60, source: "pomodoro" }),
      session({ id: "cA", timestamp: 5 * MIN, duration: 10 * 60, source: "claude-code" }),
      session({ id: "cB", timestamp: 10 * MIN, duration: 10 * 60, source: "claude-code" }),
    ]
    const result = resolveSessionOverlaps(sessions)
    // 1800 - 900 = 900（A+B を単純合算した 1200 を引いてはいけない）
    expect(find(result, "p1")!.duration).toBe(900)
  })

  it("元の配列・Session オブジェクトは破壊しない", () => {
    const p1 = session({ id: "p1", timestamp: 0, duration: 25 * 60, source: "pomodoro" })
    const sessions = [
      p1,
      session({ id: "c1", timestamp: 10 * MIN, duration: 10 * 60, source: "claude-code" }),
    ]
    resolveSessionOverlaps(sessions)
    // 元の duration は変わらない
    expect(p1.duration).toBe(25 * 60)
    expect(sessions.length).toBe(2)
  })

  it("isBillable が異なっても時間帯が重なれば相殺する（claude=没頭・pomodoro=収益）", () => {
    const sessions = [
      session({ id: "p1", timestamp: 0, duration: 25 * 60, source: "pomodoro", isBillable: true }),
      session({ id: "c1", timestamp: 10 * MIN, duration: 10 * 60, source: "claude-code", isBillable: false }),
    ]
    const result = resolveSessionOverlaps(sessions)
    expect(find(result, "p1")!.duration).toBe(900)
  })
})
