import { useState, useEffect, useCallback } from "react"
import { type Settings, DEFAULT_SETTINGS, type Session } from "@/lib/types"
import {
    getSettings,
    saveSettings as persistSettings,
    getSessions,
    addSession as persistSession,
    mutateSessions,
    getProjects
} from "@/lib/storage"
import {
    scanClaudeSessions,
    mergeClaudeSessions,
    type SyncSummary,
} from "@/lib/claude-sync"

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
            const idSet = new Set(ids)
            // 保存直前の最新セッションから削除する（他操作との直列化で lost update を防ぐ）
            const next = await mutateSessions((current) =>
                current.filter((s) => !idSet.has(s.id)),
            )
            setSessions(next)
        },
        [],
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
            // 保存直前の最新セッションを起点に更新する（他操作との直列化で lost update を防ぐ）
            const next = await mutateSessions((current) =>
                current
                    .map((s) => (s.id === id ? { ...s, ...updates } : s))
                    .sort((a, b) => b.timestamp - a.timestamp),
            )
            setSessions(next)
        },
        []
    )

    // Claude Code ログをスキャンし、登録 Project に紐づくセッションを冪等に取り込む。
    // 取り込んだ結果を永続化して state に反映し、サマリ（追加/更新/未マッチ件数）を返す。
    const syncClaude = useCallback(async (): Promise<SyncSummary> => {
        const projects = await getProjects()
        // スキャン（IPC）は時間がかかるため先に実行し、マージと保存は
        // mutateSessions 内で「保存直前の最新セッション」に対して行う。
        // こうすることで、スキャン中にタイマー完了の addSession が走っても、
        // その追加分を巻き戻さずにマージできる（lost update 防止）。
        const results = await scanClaudeSessions()

        let summary: SyncSummary = { added: 0, updated: 0, unmatched: 0 }
        const next = await mutateSessions((current) => {
            const outcome = mergeClaudeSessions(results, projects, current)
            summary = outcome.summary
            if (outcome.summary.added === 0 && outcome.summary.updated === 0) {
                // 変化なしなら現状をそのまま返し、無意味な再保存を避ける
                return current
            }
            return [...outcome.sessions].sort((a, b) => b.timestamp - a.timestamp)
        })

        if (summary.added > 0 || summary.updated > 0) {
            setSessions(next)
        }

        return summary
    }, [])

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
        updateSession,
        syncClaude
    }
}
