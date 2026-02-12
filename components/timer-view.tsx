"use client"

import { Play, Pause, RotateCcw, SkipForward, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Settings, Session } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTimerContext } from "./timer-context"
import type { Todo } from "@/hooks/use-todo"

interface TimerViewProps {
  settings: Settings
  isBillable: boolean
  onSessionComplete: (duration: number, status: "completed" | "interrupted") => void
  sessions: Session[]
  todos: Todo[]
  t: Record<string, string>
}

export function TimerView({ settings, isBillable, onSessionComplete, sessions, todos, t }: TimerViewProps) {
  const {
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
    selectedTodoId,
    setSelectedTodoId,
  } = useTimerContext()

  // Real-time Earning Calculation
  // Elapsed time = (Original Work Duration in Seconds) - (Time Left in Seconds)
  // Note: timeLeft counts DOWN. So (Total - Current) = Elapsed.
  // Exception: Overtime. In overtime, timeLeft is negative.
  // Logic:
  // If not Overtime: Elapsed = (workDuration * 60) - timeLeft
  // If Overtime: Elapsed = (workDuration * 60) + Math.abs(timeLeft)
  // Simplified: (workDuration * 60) - timeLeft (because timeLeft is negative, subtracting it adds the value! ...Wait.
  // Standard: 25:00 (1500s). timeLeft=1500. Elapsed=0.
  // Standard: 24:59 (1499s). Elapsed=1.
  // Overtime: -0:01 (-1s). Elapsed = 1500 - (-1) = 1501.
  // YES. The formula (DURATION - TIMELEFT) works universally if timeLeft goes negative.

  const workDurationSeconds = settings.workDuration * 60
  const elapsedSeconds = isBreak ? 0 : Math.max(0, workDurationSeconds - timeLeft)

  const currentEarnings = Math.floor((elapsedSeconds / 3600) * settings.hourlyRate)

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    return `${isOvertime ? "+" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const strokeDasharray = 2 * Math.PI * 140
  const strokeDashoffset = strokeDasharray * (1 - progress / 100)

  // Visual state for Overtime
  const ringColor = isBreak
    ? "text-muted-foreground"
    : isOvertime
      ? "text-amber-500"
      : "text-primary"

  const glowColor = isBreak
    ? "text-muted-foreground/30"
    : isOvertime
      ? "text-amber-500/30"
      : "text-primary/30"

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-6">
      {/* Todo Selector */}
      <div className="w-full max-w-xs z-10">
        <Select
          value={selectedTodoId || "none"}
          onValueChange={(val) => setSelectedTodoId(val === "none" ? undefined : val)}
          disabled={isRunning}
        >
          <SelectTrigger className="w-full bg-background/50 backdrop-blur-sm border-border">
            <SelectValue placeholder={t.selectTask} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.noTaskSelected}</SelectItem>
            {todos.filter(t => !t.completed).map((todo) => (
              <SelectItem key={todo.id} value={todo.id}>
                {todo.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            className={cn("transition-all duration-1000", ringColor)}
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
              className={cn("animate-pulse-ring blur-sm", glowColor)}
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
              isBreak ? "text-muted-foreground" : isOvertime ? "text-amber-500 font-bold" : "text-primary",
            )}
          >
            {isBreak ? t.break : isOvertime ? t.overtime : t.focus}
          </span>
          <span className={cn(
            "text-6xl font-mono font-bold tabular-nums",
            isOvertime ? "text-amber-500" : "text-foreground"
          )}>
            {formatTime(timeLeft)}
          </span>
          {isBillable && !isBreak && (
            <span className="text-sm text-muted-foreground mt-2">
              ¥{currentEarnings.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={handleReset} className="w-12 h-12 rounded-full bg-transparent">
          <RotateCcw className="w-5 h-5" />
        </Button>

        {isOvertime ? (
          <Button
            size="lg"
            onClick={finishSession}
            className={cn(
              "w-20 h-20 rounded-full text-lg font-medium",
              "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
            )}
          >
            <Check className="w-8 h-8" />
          </Button>
        ) : (
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
        )}

        <Button variant="outline" size="icon" onClick={handleSkip} className="w-12 h-12 rounded-full bg-transparent">
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Session info */}
      <p className="text-sm text-muted-foreground mt-4">{isRunning ? (isBreak ? t.break : t.focus) : t.start}</p>
    </div>
  )
}
