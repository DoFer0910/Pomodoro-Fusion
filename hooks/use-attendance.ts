"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAttendance, getProjects, mutateAttendance } from "@/lib/storage"
import {
  emptyAttendance, transitionWork, putWorkRecord, removeWorkRecord, confirmWorkDay, ignoreWorkCandidate,
  localDate, missingWorkCandidates, type AttendanceData, type WorkRecord, type WorkActivity, type WorkCandidate,
  undoActivityDecision,
} from "@/lib/attendance"
import { scanWorkActivities, workScanSupported } from "@/lib/work-activity"
import type { Project } from "@/lib/types"
import { translations, type Language } from "@/lib/i18n"

export function useAttendance(language: Language) {
  const [data, setData] = useState<AttendanceData>(emptyAttendance)
  const [projects, setProjects] = useState<Project[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<WorkActivity[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)
  const [liveCandidate, setLiveCandidate] = useState<WorkCandidate | null>(null)
  const liveRef = useRef<WorkCandidate | null>(null)
  const [restoredId, setRestoredId] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const dataRef = useRef(data)
  const operationRef = useRef(false)
  const scanningRef = useRef(false)
  const seen = useRef(new Map<string, number>())
  const notified = useRef(new Set<string>())
  const baselined = useRef(new Set<WorkActivity["source"]>())
  const alive = useRef(true)

  const load = useCallback(async () => {
    try {
      const [stored, allProjects] = await Promise.all([getAttendance(), getProjects()])
      if (!alive.current) return
      dataRef.current = stored
      setData(stored)
      setProjects(allProjects)
      setRestoredId(stored.records.find(r => r.end === null)?.id ?? null)
      setReady(true)
      setError(null)
    } catch (err) {
      if (alive.current) setError(err instanceof Error && err.message.startsWith("wr") ? err.message : "wrLoadFailed")
    }
  }, [])

  useEffect(() => {
    alive.current = true
    setSupported(workScanSupported())
    void load()
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => { alive.current = false; clearInterval(interval) }
  }, [load])

  const run = useCallback(async (mutator: (current: AttendanceData) => AttendanceData | Promise<AttendanceData>) => {
    if (operationRef.current) return false
    operationRef.current = true
    setBusy(true)
    setError(null)
    try {
      const next = await mutateAttendance(mutator)
      if (alive.current) { dataRef.current = next; setData(next); setNow(Date.now()) }
      return true
    } catch (err) {
      if (alive.current) setError(err instanceof Error && err.message.startsWith("wr") ? err.message : "wrSaveFailed")
      return false
    } finally {
      operationRef.current = false
      if (alive.current) setBusy(false)
    }
  }, [])

  const scan = useCallback(async () => {
    if (scanningRef.current || !workScanSupported()) return
    scanningRef.current = true
    setScanning(true)
    try {
      const allProjects = await getProjects()
      const result = await scanWorkActivities(allProjects)
      if (!alive.current) return
      setProjects(allProjects)
      // Preserve the last successful references when one agent fails to scan.
      setActivities(previous => [...previous.filter(a => result.failed.includes(a.source)), ...result.activities])
      setScanError(result.failed.length ? "wrScanFailed" : result.outdated ? "wrScanOutdated" : null)
      const today = localDate(Date.now())
      const candidates = missingWorkCandidates(result.activities, dataRef.current, today)
      for (const candidate of candidates) {
        const oldEnd = seen.current.get(candidate.id)
        const isNew = baselined.current.has(candidate.source) &&
          (oldEnd === undefined || candidate.end > oldEnd) && !notified.current.has(candidate.id)
        if (isNew && !liveRef.current && !dataRef.current.records.some(r => r.end === null)) {
          notified.current.add(candidate.id)
          liveRef.current = candidate
          setLiveCandidate(candidate)
          const notify = (window as any).electron?.showNotification
          if (notify) void Promise.resolve(notify(translations[language].wrLiveTitle,
            `${candidate.projectName}: ${translations[language].wrLiveBody}`)).catch(error => console.error("[attendance] notification failed", error))
        }
      }
      for (const activity of result.activities) seen.current.set(activity.id, activity.end)
      for (const source of ["claude-code", "codex"] as const) {
        if (!result.failed.includes(source)) baselined.current.add(source)
      }
    } catch {
      if (alive.current) setScanError("wrScanFailed")
    } finally {
      scanningRef.current = false
      if (alive.current) setScanning(false)
    }
  }, [language])

  useEffect(() => {
    if (!ready || !supported) return
    void scan()
    const timer = setInterval(() => { void scan() }, 30000)
    return () => clearInterval(timer)
  }, [ready, supported, scan])

  useEffect(() => {
    if (liveCandidate && !missingWorkCandidates([liveCandidate], data, localDate(liveCandidate.start)).length) { liveRef.current = null; setLiveCandidate(null) }
  }, [data, liveCandidate])

  const refreshProjects = useCallback(async () => {
    try { const next = await getProjects(); if (alive.current) setProjects(next) }
    catch { if (alive.current) setError("wrLoadFailed") }
  }, [])
  const transition = (action: Parameters<typeof transitionWork>[1], projectId?: string, start?: number) =>
    run(async current => {
      const allProjects = await getProjects()
      if (alive.current) setProjects(allProjects)
      return transitionWork(current, action, Date.now(), allProjects.find(p => p.id === projectId), start)
    })
  const saveRecord = (record: WorkRecord) => run(current => putWorkRecord(current, record))
  const removeRecord = (id: string) => run(current => removeWorkRecord(current, id))
  const confirmDay = (date: string) => run(current => confirmWorkDay(current, date))
  const undoDecision = (activityId: string) => run(current => undoActivityDecision(current, activityId))
  const ignoreCandidate = async (candidate: WorkCandidate) => {
    const saved = await run(current => ignoreWorkCandidate(current, candidate))
    if (saved && liveCandidate?.id === candidate.id) { liveRef.current = null; setLiveCandidate(null) }
    return saved
  }

  return { data, projects, ready, busy, error, activities, scanning, scanError, supported, liveCandidate, restoredId,
    now, load, scan, transition, saveRecord, removeRecord, confirmDay, ignoreCandidate, undoDecision, refreshProjects,
    dismissLive: () => { liveRef.current = null; setLiveCandidate(null) } }
}

export type AttendanceController = ReturnType<typeof useAttendance>
