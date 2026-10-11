import type { Project } from "./types"

export interface TimeInterval { start: number; end: number }
export interface WorkRecord {
  id: string
  start: number
  end: number | null
  kind: "work" | "break"
  projectId?: string
  projectName?: string
}
export interface ActivityDecision extends TimeInterval { activityId: string }
export interface AttendanceData {
  version: 1
  records: WorkRecord[]
  ignored: ActivityDecision[]
  reviews: Record<string, number>
}
export interface WorkActivity extends TimeInterval {
  id: string
  source: "claude-code" | "codex"
  projectId: string
  projectName: string
}
export interface WorkCandidate extends WorkActivity { candidateId: string }

export function emptyAttendance(): AttendanceData {
  return { version: 1, records: [], ignored: [], reviews: {} }
}

export function localDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function dayBounds(date: string): TimeInterval {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("wrInvalidTime")
  const [year, month, day] = date.split("-").map(Number)
  const start = new Date(year, month - 1, day)
  if (localDate(start.getTime()) !== date) throw new Error("wrInvalidTime")
  const end = new Date(year, month - 1, day + 1)
  return { start: start.getTime(), end: end.getTime() }
}

export function recordEnd(record: WorkRecord, now: number): number { return record.end ?? now }

function assertTime(value: unknown, now: number): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > now) {
    throw new Error("wrInvalidTime")
  }
}

/** Validate the entire ledger before any write, including backup imports. */
export function validateAttendance(value: unknown, now = Date.now()): asserts value is AttendanceData {
  const data = value as AttendanceData
  if (!data || data.version !== 1 || !Array.isArray(data.records) || !Array.isArray(data.ignored) ||
      !data.reviews || typeof data.reviews !== "object" || Array.isArray(data.reviews)) throw new Error("wrInvalidBackup")
  const ids = new Set<string>()
  const sorted: WorkRecord[] = []
  for (const record of data.records) {
    if (!record || typeof record.id !== "string" || !record.id || ids.has(record.id) ||
        !["work", "break"].includes(record.kind) ||
        (record.projectId !== undefined && typeof record.projectId !== "string") ||
        (record.projectName !== undefined && typeof record.projectName !== "string")) throw new Error("wrInvalidBackup")
    ids.add(record.id)
    assertTime(record.start, now)
    if (record.end !== null) {
      assertTime(record.end, now)
      if (record.end <= record.start) throw new Error("wrInvalidTime")
    }
    sorted.push(record)
  }
  sorted.sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].end === null || sorted[i].start < sorted[i - 1].end!) throw new Error("wrOverlap")
  }
  for (const decision of data.ignored) {
    if (!decision || typeof decision.activityId !== "string" || !decision.activityId) throw new Error("wrInvalidBackup")
    assertTime(decision.start, now)
    assertTime(decision.end, now)
    if (decision.end < decision.start) throw new Error("wrInvalidTime")
  }
  for (const [date, confirmedAt] of Object.entries(data.reviews)) {
    const bounds = dayBounds(date)
    assertTime(confirmedAt, now)
    if (bounds.start > now || data.records.some(r => r.end === null && r.start < bounds.end)) {
      throw new Error("wrUnfinished")
    }
  }
}

function invalidateReviews(data: AttendanceData, intervals: { start: number; end: number | null }[], now: number): AttendanceData {
  const reviews = { ...data.reviews }
  for (const date of Object.keys(reviews)) {
    const day = dayBounds(date)
    if (intervals.some(r => r.start < day.end && (r.end ?? now) > day.start)) delete reviews[date]
  }
  return { ...data, reviews }
}

export function putWorkRecord(data: AttendanceData, record: WorkRecord, now = Date.now()): AttendanceData {
  const old = data.records.find(r => r.id === record.id)
  const next = invalidateReviews({ ...data, records: [...data.records.filter(r => r.id !== record.id), record] },
    old ? [old, record] : [record], now)
  validateAttendance(next, now)
  return next
}

export function removeWorkRecord(data: AttendanceData, id: string, now = Date.now()): AttendanceData {
  const old = data.records.find(r => r.id === id)
  return invalidateReviews({ ...data, records: data.records.filter(r => r.id !== id) }, old ? [old] : [], now)
}

/** A transition closes the previous interval and opens exactly one next interval. */
export function transitionWork(data: AttendanceData, action: "start" | "break" | "resume" | "finish" | "switch",
  now: number, project?: Pick<Project, "id" | "name">, start = now): AttendanceData {
  const open = data.records.find(r => r.end === null)
  if ((action === "start" && open) || (action !== "start" && !open) ||
      (action === "break" && open?.kind !== "work") || (action === "resume" && open?.kind !== "break") ||
      (action === "switch" && open?.kind !== "work")) throw new Error("wrInvalidAction")
  let next = data
  if (open) next = putWorkRecord(next, { ...open, end: now }, now)
  if (action !== "finish") {
    const currentProject = action === "start" || action === "switch" ? project :
      project || (open?.projectId ? { id: open.projectId, name: open.projectName || "" } : undefined)
    next = putWorkRecord(next, {
      id: crypto.randomUUID(), start: action === "start" ? start : now, end: null,
      kind: action === "break" ? "break" : "work", projectId: currentProject?.id, projectName: currentProject?.name,
    }, now)
  }
  return next
}

export function confirmWorkDay(data: AttendanceData, date: string, now = Date.now()): AttendanceData {
  const day = dayBounds(date)
  if (day.start > now) throw new Error("wrInvalidTime")
  if (data.records.some(r => r.end === null && r.start < day.end)) throw new Error("wrUnfinished")
  const next = { ...data, reviews: { ...data.reviews, [date]: now } }
  validateAttendance(next, now)
  return next
}

export function ignoreWorkCandidate(data: AttendanceData, candidate: WorkCandidate, now = Date.now()): AttendanceData {
  const next = invalidateReviews({ ...data, ignored: [...data.ignored, {
    activityId: candidate.id, start: candidate.start, end: candidate.end,
  }] }, [candidate], now)
  validateAttendance(next, now)
  return next
}

export function undoActivityDecision(data: AttendanceData, activityId: string, now = Date.now()): AttendanceData {
  const removed = data.ignored.filter(decision => decision.activityId === activityId)
  return invalidateReviews({ ...data, ignored: data.ignored.filter(decision => decision.activityId !== activityId) }, removed, now)
}

export function dailyWork(data: AttendanceData, date: string, now = Date.now()): { workMs: number; breakMs: number } {
  const day = dayBounds(date)
  let workMs = 0, breakMs = 0
  for (const record of data.records) {
    const duration = Math.max(0, Math.min(recordEnd(record, now), day.end) - Math.max(record.start, day.start))
    if (record.kind === "work") workMs += duration
    else breakMs += duration
  }
  return { workMs, breakMs }
}

/** Subtract recorded/explicitly excluded intervals; AI overlap never increases human time. */
export function missingWorkCandidates(activities: WorkActivity[], data: AttendanceData, date: string, now = Date.now()): WorkCandidate[] {
  const day = dayBounds(date)
  const candidates: WorkCandidate[] = []
  for (const activity of activities) {
    if (activity.start >= day.end || activity.end < day.start) continue
    const start = Math.max(activity.start, day.start), end = Math.min(activity.end, day.end, now)
    if (end < start) continue
    const covers: TimeInterval[] = [
      ...data.records.map(r => ({ start: r.start, end: recordEnd(r, now) })),
      ...data.ignored.filter(d => d.activityId === activity.id),
    ].sort((a, b) => a.start - b.start)
    if (start === end) {
      if (!covers.some(c => c.start <= start && c.end >= start)) candidates.push({ ...activity, start, end, candidateId: `${activity.id}:${start}` })
      continue
    }
    let cursor = start
    for (const cover of covers) {
      if (cover.end <= cursor || cover.start >= end) continue
      if (cover.start > cursor) candidates.push({ ...activity, start: cursor, end: Math.min(cover.start, end), candidateId: `${activity.id}:${cursor}` })
      cursor = Math.max(cursor, cover.end)
      if (cursor >= end) break
    }
    if (cursor < end) candidates.push({ ...activity, start: cursor, end, candidateId: `${activity.id}:${cursor}` })
  }
  return candidates.sort((a, b) => a.start - b.start)
}

export function confirmedWorkText(data: AttendanceData): string {
  return Object.keys(data.reviews).sort().map(date => {
    const seconds = Math.floor(dailyWork(data, date).workMs / 1000)
    return `${date}\t${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
  }).join("\n")
}
