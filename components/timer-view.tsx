"use client"

import { Play, Pause, RotateCcw, SkipForward, Check, DollarSign, Zap } from "lucide-react"
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
import type { Todo } from "@/lib/types"
import { useProjects } from "@/hooks/use-projects"

interface TimerViewProps {
  settings: Settings
  isBillable: boolean
  onSessionComplete: (duration: number, status: "completed" | "interrupted", todoId?: string, todoTitle?: string, projectId?: string) => void
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
    selectedProjectId,
    setSelectedProjectId,
  } = useTimerContext()

  const { projects } = useProjects()

  // Determine current project (either selected or from todo)
  const currentProject = projects.find(p => p.id === selectedProjectId)

  // Real-time Earning Calculation
  const hourlyRate = currentProject ? currentProject.hourlyRate : settings.defaultHourlyRate
  const workDurationSeconds = settings.workDuration * 60
  const elapsedSeconds = isBreak ? 0 : Math.max(0, workDurationSeconds - timeLeft)
  const currentEarnings = Math.floor((elapsedSeconds / 3600) * hourlyRate)

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
    ? "bg-muted-foreground/20"
    : isOvertime
      ? "bg-amber-500/20"
      : "bg-primary/20"

  const ModeIcon = isBreak ? Check : isBillable ? DollarSign : Zap

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-8 relative">
      {/* Background Ambient Glow */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl -z-10 transition-colors duration-1000 opacity-50",
          glowColor
        )}
      />

      <div className="w-full max-w-xs z-10 space-y-2">
        {/* Todo Selector */}
        <Select
          value={selectedTodoId || "none"}
          onValueChange={(val) => setSelectedTodoId(val === "none" ? undefined : val)}
          disabled={isRunning}
        >
          <SelectTrigger className="w-full bg-background/50 backdrop-blur-md border-border/50 shadow-sm">
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

        {/* Project Selector */}
        <Select
          value={selectedProjectId || "none"}
          onValueChange={(val) => setSelectedProjectId(val === "none" ? undefined : val)}
          disabled={isRunning || (!!selectedTodoId && !!todos.find(t => t.id === selectedTodoId)?.projectId)}
        >
          <SelectTrigger className="w-full bg-background/50 backdrop-blur-md border-border/50 shadow-sm text-xs h-8">
            <SelectValue placeholder={t.selectProject} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.noProject}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timer Ring Container */}
      <div className="relative w-80 h-80">
        {/* SVG Ring */}
        <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 300 300">
          {/* Background ring */}
          <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
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
              stroke: currentProject ? currentProject.color : undefined
            }}
          />
        </svg>

        {/* Timer Display Information */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Mode Icon & Label */}
          <div className={cn(
            "flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm border border-border/10",
            isBreak ? "text-muted-foreground" : isOvertime ? "text-amber-500" : "text-foreground"
          )}>
            <ModeIcon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBreak ? t.break : isOvertime ? t.overtime : isBillable ? t.billableMode : t.focusMode}
            </span>
          </div>

          {/* Time */}
          <span className={cn(
            "text-7xl font-mono font-bold tabular-nums tracking-tighter drop-shadow-sm",
            isOvertime ? "text-amber-500" : "text-foreground"
          )}>
            {formatTime(timeLeft)}
          </span>

          {/* Revenue Display (Only in Earn/Billable Mode) */}
          <div className="h-8 flex items-center justify-center mt-2">
            {isBillable && !isBreak && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-1 text-emerald-500 font-medium">
                  <span className="text-xl">
                    ¥{currentEarnings.toLocaleString()}
                  </span>
                </div>
                {currentProject && (
                  <span className="text-[10px] text-muted-foreground">
                    {currentProject.name} (¥{hourlyRate}/h)
                  </span>
                )}
              </div>
            )}
            {!isBillable && !isBreak && (
              <span className="text-sm text-muted-foreground/50 italic">
                {t.focusMode}
              </span>
            )}
            {isBreak && (
              <span className="text-sm text-muted-foreground/50 italic">
                {t.break}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          className="w-14 h-14 rounded-full bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-300"
        >
          <RotateCcw className="w-6 h-6 text-muted-foreground" />
        </Button>

        {isOvertime ? (
          <Button
            size="lg"
            onClick={finishSession}
            className={cn(
              "w-24 h-24 rounded-full shadow-lg shadow-amber-500/20",
              "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
            )}
          >
            <Check className="w-10 h-10" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={isRunning ? handlePause : handleStart}
            className={cn(
              "w-24 h-24 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              isRunning && "shadow-primary/25"
            )}
            style={{ backgroundColor: currentProject && isRunning ? currentProject.color : undefined }}
          >
            {isRunning ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={handleSkip}
          className="w-14 h-14 rounded-full bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-300"
        >
          <SkipForward className="w-6 h-6 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}
