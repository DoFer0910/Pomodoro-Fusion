"use client"

import { useEffect } from "react"
import { useTimerContext } from "./timer-context"

interface TimerMetaProps {
    t: any
}

export function TimerMeta({ t }: TimerMetaProps) {
    const { timeLeft, isRunning, isBreak, isOvertime } = useTimerContext()

    const formatTime = (seconds: number) => {
        const absSeconds = Math.abs(seconds)
        const mins = Math.floor(absSeconds / 60)
        const secs = absSeconds % 60
        return `${isOvertime ? "+" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    useEffect(() => {
        if (isRunning) {
            document.title = `${formatTime(timeLeft)} - ${isBreak ? t.break : t.focus}`
        } else {
            document.title = "Pomodoro Fusion" // Or use t.appName if available
        }
    }, [timeLeft, isRunning, isBreak, t, isOvertime])

    return null
}
