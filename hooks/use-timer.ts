import { useState, useEffect, useRef, useCallback } from "react"
import type { Settings } from "@/lib/types"

interface UseTimerProps {
    settings: Settings
    isBreak: boolean
    setIsBreak: (isBreak: boolean) => void
    onSessionComplete: (duration: number, status: "completed" | "interrupted") => void
}

export function useTimer({ settings, isBreak, setIsBreak, onSessionComplete }: UseTimerProps) {
    const [isRunning, setIsRunning] = useState(false)
    const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)

    const totalTime = isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
    const progress = ((totalTime - timeLeft) / totalTime) * 100

    // Update time when settings change or break mode changes
    useEffect(() => {
        if (!isRunning) {
            if (!isBreak) {
                setTimeLeft(settings.workDuration * 60)
            } else {
                setTimeLeft(settings.breakDuration * 60)
            }
        }
    }, [settings.workDuration, settings.breakDuration, isBreak, isRunning])

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false)
                        if (!isBreak) {
                            const sessionDuration = settings.workDuration * 60
                            onSessionComplete(sessionDuration, "completed")
                            setIsBreak(true)
                            return settings.breakDuration * 60
                        } else {
                            setIsBreak(false)
                            return settings.workDuration * 60
                        }
                    }
                    return prev - 1
                })
            }, 1000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isRunning, isBreak, settings, onSessionComplete, timeLeft, setIsBreak])

    const start = useCallback(() => {
        // Fix for double-count bug: reset if starting from 0
        if (timeLeft <= 0) {
            if (!isBreak) {
                setTimeLeft(settings.workDuration * 60)
            } else {
                setTimeLeft(settings.breakDuration * 60)
            }
        }
        setIsRunning(true)
        startTimeRef.current = Date.now()
    }, [timeLeft, isBreak, settings])

    const pause = useCallback(() => {
        setIsRunning(false)
    }, [])

    const reset = useCallback(() => {
        setIsRunning(false)
        setIsBreak(false)
        setTimeLeft(settings.workDuration * 60)
    }, [settings.workDuration, setIsBreak])

    const skip = useCallback(() => {
        setIsRunning(false)
        if (!isBreak) {
            const elapsedTime = totalTime - timeLeft
            if (elapsedTime > 60) {
                onSessionComplete(elapsedTime, "interrupted")
            }
            setIsBreak(true)
            // Effect will handle time update
        } else {
            setIsBreak(false)
            // Effect will handle time update
        }
    }, [isBreak, totalTime, timeLeft, onSessionComplete, setIsBreak])

    return {
        timeLeft,
        progress,
        isRunning,
        start,
        pause,
        reset,
        skip,
        totalTime
    }
}
