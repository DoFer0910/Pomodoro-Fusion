import { useState, useEffect, useCallback } from "react"
import { type Settings, DEFAULT_SETTINGS, type Session } from "@/lib/types"
import { getSettings, saveSettings as persistSettings, getSessions, saveSessions as persistSessions, addSession as persistSession } from "@/lib/storage"

export function usePomodoro() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [sessions, setSessions] = useState<Session[]>([])
    const [isBillable, setIsBillable] = useState(true)
    const [mounted, setMounted] = useState(false)
    const [earnedAmount, setEarnedAmount] = useState(0)
    const [showMoneyOverlay, setShowMoneyOverlay] = useState(false)

    useEffect(() => {
        setMounted(true)
        setSettings(getSettings())
        setSessions(getSessions())
    }, [])

    const updateSettings = useCallback((newSettings: Settings) => {
        setSettings(newSettings)
        persistSettings(newSettings)
    }, [])

    const addSession = useCallback(
        (duration: number, status: "completed" | "interrupted") => {
            const session: Session = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                duration,
                status,
                isBillable,
            }
            persistSession(session)
            setSessions(getSessions())

            if (isBillable && status === "completed") {
                const earned = Math.round((duration / 3600) * settings.hourlyRate)
                setEarnedAmount(earned)
                setShowMoneyOverlay(true)
                setTimeout(() => setShowMoneyOverlay(false), 2000)
            }
        },
        [isBillable, settings.hourlyRate],
    )

    const deleteSessions = useCallback(
        (ids: string[]) => {
            const newSessions = sessions.filter((s) => !ids.includes(s.id))
            setSessions(newSessions)
            persistSessions(newSessions)
        },
        [sessions],
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
        showMoneyOverlay
    }
}
