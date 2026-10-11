import { describe, expect, it } from "vitest"
import {
  emptyAttendance, transitionWork, putWorkRecord, confirmWorkDay, dailyWork, missingWorkCandidates,
  ignoreWorkCandidate, removeWorkRecord, confirmedWorkText, validateAttendance, localDate,
  type WorkActivity, type WorkRecord,
} from "./attendance"
import { activitiesFromScan } from "./work-activity"

const start = new Date(2026, 9, 10, 9).getTime()
const now = start + 10 * 3600000
const date = localDate(start)
const work = (id: string, from: number, to: number | null, kind: WorkRecord["kind"] = "work"): WorkRecord => ({ id, start: from, end: to, kind })
const activity = (id: string, from: number, to: number): WorkActivity => ({ id, start: from, end: to,
  source: "codex", projectId: "p", projectName: "案件A" })

describe("本人の勤務記録", () => {
  it("開始・休憩・再開・終了を1本の勤務として記録し、休憩を実時間で除く", () => {
    let data = transitionWork(emptyAttendance(), "start", start)
    data = transitionWork(data, "break", start + 3600000)
    data = transitionWork(data, "resume", start + 5400000)
    data = transitionWork(data, "finish", start + 9000000)
    expect(data.records).toHaveLength(3)
    expect(dailyWork(data, date, now)).toEqual({ workMs: 7200000, breakMs: 1800000 })
    expect(data.records.every(r => r.end !== null)).toBe(true)
  })

  it("並行開始と、勤務・休憩双方の重複を拒否する", () => {
    const data = transitionWork(emptyAttendance(), "start", start)
    expect(() => transitionWork(data, "start", start + 60000)).toThrow("wrInvalidAction")
    expect(() => putWorkRecord(data, work("duplicate", start + 60000, start + 120000), now)).toThrow("wrOverlap")
    const closed = transitionWork(data, "finish", start + 3600000)
    expect(() => putWorkRecord(closed, work("overlap-break", start + 1800000, start + 5400000, "break"), now)).toThrow("wrOverlap")
  })

  it("案件切替で区間を分け、未選択への切替もできる", () => {
    let data = transitionWork(emptyAttendance(), "start", start, { id: "a", name: "案件A" })
    data = transitionWork(data, "switch", start + 3600000, { id: "b", name: "案件B" })
    data = transitionWork(data, "switch", start + 7200000)
    expect(data.records.map(r => r.projectId)).toEqual(["a", "b", undefined])
  })

  it("日またぎを日境界で分ける", () => {
    const from = new Date(2026, 9, 10, 23, 30).getTime()
    const to = new Date(2026, 9, 11, 1).getTime()
    const data = putWorkRecord(emptyAttendance(), work("night", from, to), to)
    expect(dailyWork(data, "2026-10-10", to).workMs).toBe(30 * 60000)
    expect(dailyWork(data, "2026-10-11", to).workMs).toBe(60 * 60000)
  })

  it("未終了の日は確定できず、確定後の修正・削除で再確認が必要になる", () => {
    const active = transitionWork(emptyAttendance(), "start", start)
    expect(() => confirmWorkDay(active, date, now)).toThrow("wrUnfinished")
    const closed = transitionWork(active, "finish", start + 3600000)
    const confirmed = confirmWorkDay(closed, date, now)
    expect(confirmedWorkText(confirmed)).toBe(`${date}\t1:00:00`)
    const edited = putWorkRecord(confirmed, { ...closed.records[0], end: start + 7200000 }, now)
    expect(edited.reviews[date]).toBeUndefined()
    expect(removeWorkRecord(confirmed, closed.records[0].id, now).reviews[date]).toBeUndefined()
  })

  it("日をまたぐ修正で、影響する全ての確定日を解除する", () => {
    const from = new Date(2026, 9, 10, 23).getTime(), to = new Date(2026, 9, 11, 1).getTime()
    let data = putWorkRecord(emptyAttendance(), work("night", from, to), to)
    data = confirmWorkDay(confirmWorkDay(data, "2026-10-10", to), "2026-10-11", to)
    expect(putWorkRecord(data, work("night", from + 60000, to), to).reviews).toEqual({})
  })

  it("不正時刻、逆転、未来と破損バックアップを拒否する", () => {
    for (const record of [work("a", NaN, now), work("b", start, start), work("c", start, now + 1)]) {
      expect(() => putWorkRecord(emptyAttendance(), record, now)).toThrow()
    }
    expect(() => validateAttendance({ ...emptyAttendance(), records: [work("a", start, null), work("b", start, null)] }, now)).toThrow()
    expect(() => validateAttendance({ ...emptyAttendance(), reviews: { "2026-02-30": now } }, now)).toThrow()
    expect(() => validateAttendance({ ...emptyAttendance(), ignored: [{ activityId: "a", start, end: Infinity }] }, now)).toThrow()
  })
})

describe("AIログは本人の勤務を増やさず、未記録箇所の候補にする", () => {
  it("2つのAIが並行しても本人の時間に加算しない", () => {
    const data = putWorkRecord(emptyAttendance(), work("human", start, start + 3600000), now)
    expect(missingWorkCandidates([activity("a", start, start + 3600000), activity("b", start, start + 3600000)], data, date, now)).toEqual([])
    expect(dailyWork(data, date, now).workMs).toBe(3600000)
  })

  it("勤務と休憩の間の未記録区間だけを候補として返す", () => {
    let data = putWorkRecord(emptyAttendance(), work("first", start, start + 600000), now)
    data = putWorkRecord(data, work("rest", start + 1200000, start + 1800000, "break"), now)
    const result = missingWorkCandidates([activity("a", start, start + 2400000)], data, date, now)
    expect(result.map(c => [c.start, c.end])).toEqual([[start + 600000, start + 1200000], [start + 1800000, start + 2400000]])
    const ignored = ignoreWorkCandidate(data, result[0], now)
    expect(missingWorkCandidates([activity("a", start, start + 2400000)], ignored, date, now)).toHaveLength(1)
  })

  it("単一イベントを候補にでき、勤務外の判断を保持する", () => {
    const a = activity("point", start, start)
    const candidate = missingWorkCandidates([a], emptyAttendance(), date, now)[0]
    const data = ignoreWorkCandidate(emptyAttendance(), candidate, now)
    expect(missingWorkCandidates([a], JSON.parse(JSON.stringify(data)), date, now)).toEqual([])
  })

  it("累積秒数から終了時刻を作らず、ログの実区間を使う", () => {
    const project = { id: "p", name: "案件A", color: "#000000", hourlyRate: 1, createdAt: start, updatedAt: start, repoPaths: ["D:/repo"] }
    const results = activitiesFromScan([{ codexSessionId: "ai", repoPath: "D:/repo", startTimestamp: start,
      durationSeconds: 120, activityIntervals: [{ start, end: start + 60000 }, { start: start + 3600000, end: start + 3660000 }] }], "codex", [project])
    expect(results.map(a => a.end)).toEqual([start + 60000, start + 3660000])
    expect(activitiesFromScan([{ codexSessionId: "old", repoPath: "D:/repo", startTimestamp: start, durationSeconds: 120 }], "codex", [project])).toEqual([])
  })
})
