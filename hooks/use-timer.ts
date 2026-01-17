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
    const [isOvertime, setIsOvertime] = useState(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)

    const totalTime = isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
    // Prevent progress form going < 0 or > 100. If overtime, timeLeft is negative, so max(0, ...) clamps it.
    const progress = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100))

    // Update time when settings change or break mode changes
    useEffect(() => {
        if (!isRunning) {
            if (!isBreak) {
                if (!isOvertime) setTimeLeft(settings.workDuration * 60)
            } else {
                setTimeLeft(settings.breakDuration * 60)
            }
        }
    }, [settings.workDuration, settings.breakDuration, isBreak])

    const playAlarm = useCallback(() => {
        if (settings.alarmSound === "none") return
        // Placeholder for sound playing
    }, [settings.alarmSound])

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    // Transition to overtime
                    if (prev === 1 && !isBreak && settings.allowOvertime) {
                        playAlarm()
                    }

                    if (prev <= 1) {
                        if (!isBreak && settings.allowOvertime) {
                            // Enter Overtime
                            if (!isOvertime) setIsOvertime(true)
                            return prev - 1
                        } else {
                            // Normal completion
                            setIsRunning(false)
                            if (!isBreak) {
                                const sessionDuration = settings.workDuration * 60
                                onSessionComplete(sessionDuration, "completed")
                                setIsBreak(true)
                                playAlarm()
                                return settings.breakDuration * 60
                            } else {
                                setIsBreak(false)
                                playAlarm()
                                return settings.workDuration * 60
                            }
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
    }, [isRunning, isBreak, settings, onSessionComplete, playAlarm, isOvertime, setIsBreak])

    const finishSession = useCallback(() => {
        if (!isBreak) {
            const baseDuration = settings.workDuration * 60
            const overtimeDuration = isOvertime ? Math.abs(timeLeft) : 0
            const totalDuration = baseDuration + overtimeDuration

            setIsRunning(false)
            onSessionComplete(totalDuration, "completed")
            setIsBreak(true)
            setIsOvertime(false)
            setTimeLeft(settings.breakDuration * 60)
        }
    }, [isBreak, isOvertime, timeLeft, settings, onSessionComplete, setIsBreak])

    const handleStart = useCallback(() => {
        if (timeLeft <= 0 && !isOvertime) {
            if (isBreak) {
                setTimeLeft(settings.breakDuration * 60)
            } else if (timeLeft > 0) {
                setTimeLeft(settings.workDuration * 60)
            }
        }
        if (!isRunning && timeLeft === 0 && !isOvertime) {
            if (isBreak) setTimeLeft(settings.breakDuration * 60)
            else setTimeLeft(settings.workDuration * 60)
        }

        setIsRunning(true)
        startTimeRef.current = Date.now()
    }, [timeLeft, isBreak, settings, isOvertime, isRunning])

    const handlePause = useCallback(() => {
        setIsRunning(false)
    }, [])

    const handleReset = useCallback(() => {
        setIsRunning(false)
        setIsBreak(false)
        setIsOvertime(false)
        setTimeLeft(settings.workDuration * 60)
    }, [settings.workDuration, setIsBreak])

    const handleSkip = useCallback(() => {
        setIsRunning(false)
        if (!isBreak) {
            let duration = 0
            if (isOvertime) {
                duration = (settings.workDuration * 60) + Math.abs(timeLeft)
            } else {
                duration = (settings.workDuration * 60) - timeLeft
            }

            if (duration > 60) {
                onSessionComplete(duration, "interrupted")
            }
            setIsBreak(true)
            setIsOvertime(false)
            setTimeLeft(settings.breakDuration * 60)
        } else {
            setIsBreak(false)
            setIsOvertime(false)
            setTimeLeft(settings.workDuration * 60)
        }
    }, [isBreak, timeLeft, settings, onSessionComplete, isOvertime, setIsBreak])

    return {
        timeLeft,
        progress,
        isRunning,
        isBreak,
        isOvertime,
        handleStart,
        handlePause,
        handleReset,
        handleSkip,
        finishSession,
        totalTime
    }
}
