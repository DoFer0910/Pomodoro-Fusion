"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface TimerViewProps {
  settings: Settings
  isBillable: boolean
  onSessionComplete: (duration: number, status: "completed" | "interrupted") => void
  t: Record<string, string>
}

export function TimerView({ settings, isBillable, onSessionComplete, t }: TimerViewProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60)
  const [totalSessionTime, setTotalSessionTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const totalTime = isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  useEffect(() => {
    if (!isBreak) {
      setTimeLeft(settings.workDuration * 60)
    } else {
      setTimeLeft(settings.breakDuration * 60)
    }
  }, [settings.workDuration, settings.breakDuration, isBreak])

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
  }, [isRunning, isBreak, settings, onSessionComplete, timeLeft])

  const handleStart = useCallback(() => {
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

  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(settings.workDuration * 60)
    setTotalSessionTime(0)
  }, [settings.workDuration])

  const handleSkip = useCallback(() => {
    setIsRunning(false)
    if (!isBreak) {
      const elapsedTime = totalTime - timeLeft
      if (elapsedTime > 60) {
        onSessionComplete(elapsedTime, "interrupted")
      }
      setIsBreak(true)
      setTimeLeft(settings.breakDuration * 60)
    } else {
      setIsBreak(false)
      setTimeLeft(settings.workDuration * 60)
    }
  }, [isBreak, totalTime, timeLeft, settings, onSessionComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const strokeDasharray = 2 * Math.PI * 140
  const strokeDashoffset = strokeDasharray * (1 - progress / 100)

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Timer Ring */}
      <div className="relative w-80 h-80 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
          {/* Background ring */}
          <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          {/* Progress ring */}
          <circle
            cx="150"
            cy="150"
            r="140"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn("transition-all duration-1000", isBreak ? "text-muted-foreground" : "text-primary")}
            style={{
              strokeDasharray,
              strokeDashoffset,
            }}
          />
          {/* Glow effect when running */}
          {isRunning && (
            <circle
              cx="150"
              cy="150"
              r="140"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              strokeLinecap="round"
              className={cn("animate-pulse-ring blur-sm", isBreak ? "text-muted-foreground/30" : "text-primary/30")}
              style={{
                strokeDasharray,
                strokeDashoffset,
              }}
            />
          )}
        </svg>

        {/* Timer Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-sm font-medium mb-2 uppercase tracking-wider",
              isBreak ? "text-muted-foreground" : "text-primary",
            )}
          >
            {isBreak ? t.break : t.focus}
          </span>
          <span className="text-6xl font-mono font-bold text-foreground tabular-nums">{formatTime(timeLeft)}</span>
          {isBillable && !isBreak && (
            <span className="text-sm text-muted-foreground mt-2">
              ¥{Math.round(((totalTime - timeLeft) / 3600) * settings.hourlyRate).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={handleReset} className="w-12 h-12 rounded-full bg-transparent">
          <RotateCcw className="w-5 h-5" />
        </Button>

        <Button
          size="lg"
          onClick={isRunning ? handlePause : handleStart}
          className={cn(
            "w-20 h-20 rounded-full text-lg font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </Button>

        <Button variant="outline" size="icon" onClick={handleSkip} className="w-12 h-12 rounded-full bg-transparent">
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Session info */}
      <p className="text-sm text-muted-foreground mt-8">{isRunning ? (isBreak ? t.break : t.focus) : t.start}</p>
    </div>
  )
}
