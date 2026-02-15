import { useState, useMemo } from "react"
import { TrendingUp, Target, Clock, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react"
import type { Session, Settings } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button" // Added Button import
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { HeatmapCalendar } from "./heatmap-calendar"
import { ActivityCalendar } from "./activity-calendar"

interface StatsViewProps {
  sessions: Session[]
  settings: Settings
  isBillable: boolean
  t: Record<string, string>
  onSettingsChange: (settings: Settings) => void
}

export function StatsView({ sessions, settings, isBillable, t, onSettingsChange }: StatsViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [tempGoal, setTempGoal] = useState("")

  // Filter sessions based on current mode (billable vs focus)
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => s.isBillable === isBillable)
  }, [sessions, isBillable])

  const monthlyStats = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()

    const startOfMonth = new Date(year, month, 1).getTime()
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).getTime()

    const monthlySessions = filteredSessions.filter((s) =>
      s.timestamp >= startOfMonth &&
      s.timestamp <= endOfMonth &&
      (s.status === "completed" || (settings.countInterruptedSessions && s.status === "interrupted"))
    )

    const totalDuration = monthlySessions.reduce((acc, s) => acc + s.duration, 0)

    // For earning mode
    const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`
    const monthlyGoal = settings.monthlyGoals?.[currentMonthKey] ?? settings.goalAmount

    const totalEarnings = Math.round((totalDuration / 3600) * settings.hourlyRate)
    const progress = Math.min((totalEarnings / monthlyGoal) * 100, 100)

    const remainingAmount = monthlyGoal - totalEarnings
    const remainingHours = remainingAmount > 0 ? Math.ceil(remainingAmount / settings.hourlyRate) : 0

    // Calculate remaining days in the month
    const now = new Date()
    const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    let remainingDays = 0
    if (isCurrentMonth) {
      remainingDays = Math.max(0, daysInMonth - now.getDate() + 1)
    } else if (selectedDate > now) {
      // Only if the selected month is fully in the future
      if (new Date(year, month, 1) > now) {
        remainingDays = daysInMonth
      }
    }

    const dailyRemainingHours = remainingDays > 0 && remainingHours > 0
      ? (remainingHours / remainingDays).toFixed(1)
      : "0"

    return {
      totalEarnings,
      totalDuration,
      progress,
      remainingHours,
      dailyRemainingHours,
      sessionCount: monthlySessions.length,
      monthlyGoal,
    }
  }, [filteredSessions, settings, selectedDate])

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal, 10)
    if (!isNaN(newGoal) && newGoal > 0) {
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth()
      const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`

      onSettingsChange({
        ...settings,
        monthlyGoals: {
          ...settings.monthlyGoals,
          [currentMonthKey]: newGoal
        }
      })
    }
    setIsEditingGoal(false)
  }

  const startEditingGoal = () => {
    setTempGoal(monthlyStats.monthlyGoal.toString())
    setIsEditingGoal(true)
  }

  const navigateMonth = (direction: -1 | 1) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setSelectedDate(newDate)
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleString(settings.language === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long" })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}${t.hours} ${mins}${t.minutes}`
    }
    return `${mins}${t.minutes}`
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{t.thisMonth || "Statistics"}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium">
            {formatMonth(selectedDate)}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} disabled={new Date() < new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4">
        {isBillable ? (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t.totalEarnings}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">¥{monthlyStats.totalEarnings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDuration(monthlyStats.totalDuration)} · {monthlyStats.sessionCount} {t.sessions}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t.totalTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{formatDuration(monthlyStats.totalDuration)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {monthlyStats.sessionCount} {t.sessions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Goal Progress (Billable only) */}
        {isBillable && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t.goal || "Goal"}
                </CardTitle>
                {isEditingGoal ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      className="h-8 w-24"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveGoal()
                        if (e.key === "Escape") setIsEditingGoal(false)
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveGoal}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingGoal(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">¥{monthlyStats.monthlyGoal.toLocaleString()}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-50 hover:opacity-100" onClick={startEditingGoal}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.progress}</span>
                <span className="font-medium text-foreground">{Math.round(monthlyStats.progress)}%</span>
              </div>
              <Progress value={monthlyStats.progress} className="h-2" />
              {monthlyStats.remainingHours > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t.remaining}: {monthlyStats.remainingHours} {t.hours}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.dailyRemaining}: {monthlyStats.dailyRemainingHours} {t.hours}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Heatmap Calendar */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Activity Map</CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapCalendar sessions={filteredSessions} isBillable={isBillable} />
        </CardContent>
      </Card>

      {/* Monthly Detail Calendar */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t.thisMonth || "Monthly Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityCalendar
            sessions={filteredSessions}
            isBillable={isBillable}
            currentDate={selectedDate}
            onMonthChange={setSelectedDate}
            settings={settings}
          />
        </CardContent>
      </Card>
    </div>
  )
}
