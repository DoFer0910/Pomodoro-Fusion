import { useState, useEffect, useCallback } from "react"
import { type Settings, DEFAULT_SETTINGS, type Session } from "@/lib/types"
import {
    getSettings,
    saveSettings as persistSettings,
    getSessions,
    saveSessions as persistSessions,
    addSession as persistSession,
    getProjects
} from "@/lib/storage"

export function usePomodoro() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [sessions, setSessions] = useState<Session[]>([])
    const [isBillable, setIsBillable] = useState(true)
    const [mounted, setMounted] = useState(false)
    const [earnedAmount, setEarnedAmount] = useState(0)
    const [showMoneyOverlay, setShowMoneyOverlay] = useState(false)

    useEffect(() => {
        setMounted(true)
        const load = async () => {
            setSettings(await getSettings())
            setSessions(await getSessions())
        }
        load()
    }, [])

    const updateSettings = useCallback(async (newSettings: Settings) => {
        setSettings(newSettings)
        await persistSettings(newSettings)
    }, [])

    const addSession = useCallback(
        async (
            duration: number,
            status: "completed" | "interrupted",
            todoId?: string,
            todoTitle?: string,
            projectId?: string,
            customTimestamp?: number,
            customIsBillable?: boolean
        ) => {
            const timestamp = customTimestamp || Date.now()
            const sessionIsBillable = customIsBillable !== undefined ? customIsBillable : isBillable

            const session: Session = {
                id: crypto.randomUUID(),
                timestamp,
                duration,
                status,
                isBillable: sessionIsBillable,
                todoId,
                todoTitle,
                projectId,
            }

            // Optimistic update
            setSessions(prev => {
                const newSessions = [session, ...prev]
                // Sort by timestamp descending to keep order correct
                return newSessions.sort((a, b) => b.timestamp - a.timestamp)
            })

            await persistSession(session)
            // Re-fetch to ensure consistency (optional, but good for id/timestamp if generated server-side, here client-side so maybe redundant but safe)
            // setSessions(await getSessions()) 
            // Commenting out re-fetch to rely on optimistic update for immediate feedback, 
            // strictly speaking we should probably re-fetch or just leave it. 
            // If I re-fetch, it might cause a second render. 
            // Let's keep the optimistic one and MAYBE re-fetch in background?
            // For now, I'll trust persistSession works. If I want to be 100% sure:
            // const stored = await getSessions(); setSessions(stored);
            // But this causes the 'lag' again if we await it.
            // So: Optimistic update -> Fire persist -> Done.
            // But verify persistence later?
            // I'll leave the optimistic update and REMOVE the await getSessions() call for now, 
            // OR keep it but accept it might update state later.
            // If I keep it, I have the race condition. 
            // If I remove it, I might desync if persist fails (unlikely).
            // I'll remove `setSessions(await getSessions())` and trust `setSessions(prev => ...)` is enough for now.

            // Only trigger overlay/earnings update if it's a "live" session (no custom timestamp)
            // Or maybe we WANT to see the overlay? User might find it annoying if bulk adding.
            // Let's only show overlay if it's a real-time completion (customTimestamp is undefined)
            if (sessionIsBillable && !customTimestamp) {
                let rate = settings.defaultHourlyRate
                if (projectId) {
                    const projects = await getProjects()
                    const project = projects.find((p) => p.id === projectId)
                    if (project) {
                        rate = project.hourlyRate
                    }
                }

                if (status === "completed") {
                    const earned = Math.round((duration / 3600) * rate)
                    setEarnedAmount(earned)
                    setShowMoneyOverlay(true)
                    setTimeout(() => setShowMoneyOverlay(false), 2000)
                } else if (status === "interrupted" && settings.countInterruptedSessions) {
                    const earned = Math.round((duration / 3600) * rate)
                    setEarnedAmount(earned)
                    setShowMoneyOverlay(true)
                    setTimeout(() => setShowMoneyOverlay(false), 2000)
                }
            }
        },
        [isBillable, settings.defaultHourlyRate, settings.countInterruptedSessions],
    )

    const deleteSessions = useCallback(
        async (ids: string[]) => {
            const newSessions = sessions.filter((s) => !ids.includes(s.id))
            setSessions(newSessions)
            await persistSessions(newSessions)
        },
        [sessions],
    )

    const updateSession = useCallback(
        async (
            id: string,
            updates: {
                duration: number
                projectId?: string
                timestamp: number
                isBillable: boolean,
                status: "completed" | "interrupted"
            }
        ) => {
            const newSessions = sessions.map(s => {
                if (s.id === id) {
                    return { ...s, ...updates }
                }
                return s
            }).sort((a, b) => b.timestamp - a.timestamp)

            setSessions(newSessions)
            await persistSessions(newSessions)
        },
        [sessions]
    )

    return {
        settings,
        sessions,
        isBillable,
        setIsBillable,
        updateSettings,
        addSession,
        deleteSessions,
        mounted,
        earnedAmount,
        showMoneyOverlay,
        updateSession
    }
}
