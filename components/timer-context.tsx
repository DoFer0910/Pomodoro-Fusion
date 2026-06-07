"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { Settings, Session } from "@/lib/types"
import { useTimer } from "@/hooks/use-timer"
import type { Todo } from "@/lib/types"
import { translations } from "@/lib/i18n"

// Electron preload で公開した API の最小型。Web 環境では undefined。
interface ElectronTimerAPI {
    updateProgress?: (payload: {
        progress: number
        isRunning: boolean
        labels: { show: string; startPause: string; quit: string; tooltip: string }
    }) => void
    onShortcutAction?: (callback: (action: string) => void) => () => void
    configureIdle?: (config: { enabled: boolean; thresholdMinutes: number }) => void
    onIdleDetected?: (callback: (idleSeconds: number) => void) => () => void
    showNotification?: (title: string, body: string) => void
}

function getElectron(): ElectronTimerAPI | undefined {
    if (typeof window === "undefined") return undefined
    return (window as unknown as { electron?: ElectronTimerAPI }).electron
}

// 残り秒数を mm:ss 形式に整形する。残業中（負値）は先頭に + を付ける。
function formatRemaining(seconds: number): string {
    const overtime = seconds < 0
    const abs = Math.abs(seconds)
    const m = Math.floor(abs / 60)
    const s = abs % 60
    const body = `${m}:${s.toString().padStart(2, "0")}`
    return overtime ? `+${body}` : body
}

interface TimerContextType {
    timeLeft: number
    progress: number
    isRunning: boolean
    isBreak: boolean
    isOvertime: boolean
    handleStart: () => void
    handlePause: () => void
    handleReset: () => void
    handleSkip: () => void
    finishSession: () => void
    totalTime: number
    selectedTodoId: string | undefined
    setSelectedTodoId: (id: string | undefined) => void
    selectedProjectId: string | undefined
    setSelectedProjectId: (id: string | undefined) => void
}

const TimerContext = createContext<TimerContextType | null>(null)

interface TimerProviderProps {
    settings: Settings
    sessions: Session[]
    todos: Todo[]
    onSessionComplete: (duration: number, status: "completed" | "interrupted", todoId?: string, todoTitle?: string, projectId?: string) => void
    children: React.ReactNode
}

export function TimerProvider({ settings, sessions, todos, onSessionComplete, children }: TimerProviderProps) {
    const [isBreak, setIsBreak] = useState(false)
    const [selectedTodoId, setSelectedTodoId] = useState<string>()
    const [selectedProjectId, setSelectedProjectId] = useState<string>()

    // Update selectedProjectId when selectedTodoId changes
    React.useEffect(() => {
        if (selectedTodoId) {
            const todo = todos.find(t => t.id === selectedTodoId)
            if (todo && todo.projectId) {
                setSelectedProjectId(todo.projectId)
            }
        }
    }, [selectedTodoId, todos])

    // Calculate if next/current break is a long break
    // Filter for completed sessions today
    const today = new Date().toDateString()
    const completedSessionsToday = sessions.filter(
        (s) => s.status === "completed" && new Date(s.timestamp).toDateString() === today,
    ).length

    // If working: we are working on (completed + 1). If that % interval == 0, next break is long.
    // If break: we completed (completed). If that % interval == 0, this break is long.
    const targetSessionNumber = isBreak ? completedSessionsToday : completedSessionsToday + 1
    const isLongBreak = targetSessionNumber > 0 && targetSessionNumber % settings.longBreakInterval === 0

    const effectiveSettings = React.useMemo(() => ({
        ...settings,
        breakDuration: isLongBreak ? settings.longBreakDuration : settings.breakDuration,
    }), [settings, isLongBreak])

    const handleSessionComplete = useCallback((duration: number, status: "completed" | "interrupted") => {
        const todo = todos.find(t => t.id === selectedTodoId)
        onSessionComplete(duration, status, selectedTodoId, todo?.title, selectedProjectId)
    }, [onSessionComplete, selectedTodoId, todos, selectedProjectId])

    const timer = useTimer({
        settings: effectiveSettings,
        isBreak,
        setIsBreak,
        onSessionComplete: handleSessionComplete,
    })

    // タスクバー進捗バーと Tray のツールチップ/メニューをメインプロセスへ送る。
    // 毎秒変わる timeLeft/progress に追従させる。Web 環境では electron が無いので何もしない。
    React.useEffect(() => {
        const electron = getElectron()
        if (!electron?.updateProgress) return
        const t = translations[settings.language]
        const stateLabel = timer.isRunning
            ? `${timer.isBreak ? t.break : t.focus} ${formatRemaining(timer.timeLeft)}`
            : t.trayTooltipIdle
        electron.updateProgress({
            progress: timer.progress,
            isRunning: timer.isRunning,
            labels: {
                show: t.trayShow,
                startPause: t.trayStartPause,
                quit: t.trayQuit,
                tooltip: `${t.appName} - ${stateLabel}`,
            },
        })
    }, [timer.progress, timer.isRunning, timer.isBreak, timer.timeLeft, settings.language])

    // Tray/グローバルショートカットからの操作を受け取り、タイマーに反映する。
    React.useEffect(() => {
        const electron = getElectron()
        if (!electron?.onShortcutAction) return
        const unsubscribe = electron.onShortcutAction((action) => {
            if (action === "toggle") {
                if (timer.isRunning) timer.handlePause()
                else timer.handleStart()
            } else if (action === "skip") {
                timer.handleSkip()
            }
        })
        return unsubscribe
    }, [timer.isRunning, timer.handlePause, timer.handleStart, timer.handleSkip])

    // 離席検知の設定（有効/閾値）をメインプロセスへ送る。設定変更に追従する。
    React.useEffect(() => {
        const electron = getElectron()
        if (!electron?.configureIdle) return
        electron.configureIdle({
            enabled: settings.idleDetectionEnabled,
            thresholdMinutes: settings.idleThresholdMinutes,
        })
    }, [settings.idleDetectionEnabled, settings.idleThresholdMinutes])

    // 離席検知時の自動一時停止。作業中（実行中かつ休憩でない）のときだけ止めて通知する。
    React.useEffect(() => {
        const electron = getElectron()
        if (!electron?.onIdleDetected) return
        const unsubscribe = electron.onIdleDetected(() => {
            if (timer.isRunning && !timer.isBreak) {
                timer.handlePause()
                const t = translations[settings.language]
                electron.showNotification?.(t.notifyIdleTitle, t.notifyIdleBody)
            }
        })
        return unsubscribe
    }, [timer.isRunning, timer.isBreak, timer.handlePause, settings.language])

    const value = {
        ...timer,
        selectedTodoId,
        setSelectedTodoId,
        selectedProjectId,
        setSelectedProjectId
    }

    return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimerContext() {
    const context = useContext(TimerContext)
    if (!context) {
        throw new Error("useTimerContext must be used within a TimerProvider")
    }
    return context
}
