"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { Settings, Session } from "@/lib/types"
import { useTimer } from "@/hooks/use-timer"
import type { Todo } from "@/hooks/use-todo"

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
}

const TimerContext = createContext<TimerContextType | null>(null)

interface TimerProviderProps {
    settings: Settings
    sessions: Session[]
    todos: Todo[]
    onSessionComplete: (duration: number, status: "completed" | "interrupted", todoId?: string, todoTitle?: string) => void
    children: React.ReactNode
}

export function TimerProvider({ settings, sessions, todos, onSessionComplete, children }: TimerProviderProps) {
    const [isBreak, setIsBreak] = useState(false)
    const [selectedTodoId, setSelectedTodoId] = useState<string>()

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
        onSessionComplete(duration, status, selectedTodoId, todo?.title)
    }, [onSessionComplete, selectedTodoId, todos])

    const timer = useTimer({
        settings: effectiveSettings,
        isBreak,
        setIsBreak,
        onSessionComplete: handleSessionComplete,
    })

    const value = {
        ...timer,
        selectedTodoId,
        setSelectedTodoId
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
