"use client"

import { useMemo } from "react"
import { TrendingUp, Target, Clock } from "lucide-react"
import type { Session, Settings } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HeatmapCalendar } from "./heatmap-calendar"

interface StatsViewProps {
  sessions: Session[]
  settings: Settings
  isBillable: boolean
  t: Record<string, string>
}

export function StatsView({ sessions, settings, isBillable, t }: StatsViewProps) {
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    const monthlySessions = sessions.filter((s) => s.timestamp >= startOfMonth && s.status === "completed")

    const billableSessions = monthlySessions.filter((s) => s.isBillable)
    const focusSessions = monthlySessions.filter((s) => !s.isBillable)

    const totalBillableTime = billableSessions.reduce((acc, s) => acc + s.duration, 0)
    const totalFocusTime = focusSessions.reduce((acc, s) => acc + s.duration, 0)
    const totalTime = monthlySessions.reduce((acc, s) => acc + s.duration, 0)

    const totalEarnings = Math.round((totalBillableTime / 3600) * settings.hourlyRate)
    const progress = Math.min((totalEarnings / settings.goalAmount) * 100, 100)

    const remainingAmount = settings.goalAmount - totalEarnings
    const remainingHours = remainingAmount > 0 ? Math.ceil(remainingAmount / settings.hourlyRate) : 0

    return {
      totalEarnings,
      totalBillableTime,
      totalFocusTime,
      totalTime,
      progress,
      remainingHours,
      sessionCount: monthlySessions.length,
    }
  }, [sessions, settings])

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
      <h2 className="text-xl font-semibold text-foreground">{t.thisMonth}</h2>

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
                {formatDuration(monthlyStats.totalBillableTime)} · {monthlyStats.sessionCount} {t.sessions}
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
              <p className="text-3xl font-bold text-primary">{formatDuration(monthlyStats.totalTime)}</p>
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
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                {t.goal}: ¥{settings.goalAmount.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.progress}</span>
                <span className="font-medium text-foreground">{Math.round(monthlyStats.progress)}%</span>
              </div>
              <Progress value={monthlyStats.progress} className="h-2" />
              {monthlyStats.remainingHours > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t.remaining}: {monthlyStats.remainingHours} {t.hours}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Heatmap Calendar */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapCalendar sessions={sessions} isBillable={isBillable} />
        </CardContent>
      </Card>
    </div>
  )
}
