"use client"

import { Play, Pause, RotateCcw, SkipForward, Check, DollarSign, Zap, Maximize2, Minimize2 } from "lucide-react" // Added icons
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
  isCompactMode?: boolean
  toggleCompactMode?: () => void
}

export function TimerView({ settings, isBillable, onSessionComplete, sessions, todos, t, isCompactMode = false, toggleCompactMode }: TimerViewProps) {
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

  const ringRadius = isCompactMode ? 100 : 140
  const strokeWidth = isCompactMode ? 6 : 8
  const viewBoxSize = isCompactMode ? 220 : 300
  const centerValue = viewBoxSize / 2

  const strokeDasharray = 2 * Math.PI * ringRadius
  const strokeDashoffset = strokeDasharray * (1 - progress / 100)


  // Visual state for Overtime
  const ringColor = isBreak
    ? "text-muted-foreground"
    : isOvertime
      ? "text-purple-500 animate-pulse"
      : "text-primary"

  const glowColor = isBreak
    ? "bg-muted-foreground/20"
    : isOvertime
      ? "bg-purple-500/30"
      : "bg-primary/20"

  const ModeIcon = isBreak ? Check : isBillable ? DollarSign : Zap

  return (
    <div className={cn(
      "flex flex-col items-center justify-center relative",
      isCompactMode ? "space-y-4 app-region-drag select-none" : "py-6 space-y-8"
    )}>

      {/* Background Ambient Glow (Standard Mode Only) */}
      {!isCompactMode && (
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl -z-10 transition-colors duration-1000 opacity-50",
            glowColor
          )}
        />
      )}

      {/* Inputs (Standard Mode Only) */}
      {!isCompactMode && (
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
      )}

      {/* Timer Ring Container */}
      <div className={cn("relative transition-all duration-300", isCompactMode ? "w-48 h-48" : "w-80 h-80")}>
        {/* Compact Mode Toggle Button (Only visible in Compact Mode for restoring) */}
        {isCompactMode && (
          <div className="absolute -top-2 -right-2 z-20 app-region-no-drag">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCompactMode}
              className="rounded-full bg-background/20 hover:bg-background/50 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-all w-6 h-6"
              title={t.expand}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* SVG Ring */}
        <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* Background ring */}
          <circle cx={centerValue} cy={centerValue} r={ringRadius} fill="none" stroke="currentColor" strokeWidth={strokeWidth / 2} className="text-muted/20" />
          {/* Progress ring */}
          <circle
            cx={centerValue}
            cy={centerValue}
            r={ringRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
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
          {/* Custom Drag Area for Compact Mode since center is non-interactive usually? No, full container is drag in compact mode */}

          {/* Mode Icon & Label (Simplified for Compact) */}
          {!isCompactMode && (
            <div className={cn(
              "flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm border border-border/10",
              isBreak ? "text-muted-foreground" : isOvertime ? "text-purple-500 bg-purple-500/10 border-purple-500/20" : "text-foreground"
            )}>
              <ModeIcon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isBreak ? t.break : isOvertime ? t.overtime : isBillable ? t.billableMode : t.focusMode}
              </span>
            </div>
          )}

          {/* Time */}
          <span className={cn(
            "font-mono font-bold tabular-nums tracking-tighter drop-shadow-sm transition-colors duration-300",
            isOvertime ? "text-purple-500" : "text-foreground",
            isCompactMode ? "text-4xl" : "text-7xl"
          )}>
            {formatTime(timeLeft)}
          </span>

          {/* Revenue Display (Only in Earn/Billable Mode) */}
          <div className="h-8 flex items-center justify-center mt-2 group">
            {isBillable && !isBreak && (
              <div
                className={cn(
                  "flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500 transition-opacity duration-300",
                  settings.hideMoneyCount && "opacity-0 group-hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-1 text-emerald-500 font-medium">
                  <span className={cn("text-xl", isCompactMode && "text-base")}>
                    ¥{currentEarnings.toLocaleString()}
                  </span>
                </div>
                {!isCompactMode && currentProject && (
                  <span className="text-[10px] text-muted-foreground">
                    {currentProject.name} (¥{hourlyRate}/h)
                  </span>
                )}
              </div>
            )}
            {!isBillable && !isBreak && !isCompactMode && (
              <span className="text-sm text-muted-foreground/50 italic">
                {t.focusMode}
              </span>
            )}
            {isBreak && !isCompactMode && (
              <span className="text-sm text-muted-foreground/50 italic">
                {t.break}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={cn("flex items-center z-10 app-region-no-drag", isCompactMode ? "gap-4 scale-75" : "gap-6")}>
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
