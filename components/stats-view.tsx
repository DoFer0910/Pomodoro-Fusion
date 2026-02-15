import { useState, useMemo } from "react"
import { TrendingUp, Target, Clock, ChevronLeft, ChevronRight, Pencil, Check, X, Calendar as CalendarIcon, History } from "lucide-react"
import type { Session, Settings } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
// import { HeatmapCalendar } from "./heatmap-calendar" // Removing Heatmap as requested or replacing logic? Stick to plan: Bento UI. The request didn't explicitly say delete heatmap but "Stats TabをRechartsとBento UIで構築". Let's keep Heatmap in Bento grid if fits, or assuming Recharts replaces visual aspects. 
// User said: "チャート: Recharts を使用し... AreaChart または BarChart". 
// User also said: "レイアウト: grid-cols-4 ... パズル状に配置".
// I will keep Heatmap as one of the blocks if it makes sense, or replace it. The prompt implies a redesign. Let's use Recharts for the main stats.
// Actually, let's keep Heatmap as a block in the Bento grid because it provides valuable data.
import { HeatmapCalendar } from "./heatmap-calendar"
import { ActivityCalendar } from "./activity-calendar"
import { cn } from "@/lib/utils"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface StatsViewProps {
  sessions: Session[]
  settings: Settings
  isBillable: boolean
  t: Record<string, string>
  onSettingsChange: (settings: Settings) => void
}

import { useProjects } from "@/hooks/use-projects"

export function StatsView({ sessions, settings, isBillable, t, onSettingsChange }: StatsViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [tempGoal, setTempGoal] = useState("")
  const { projects } = useProjects()

  // Filter sessions based on current mode
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => s.isBillable === isBillable)
  }, [sessions, isBillable])

  const calculateSessionEarnings = (session: Session) => {
    let rate = settings.defaultHourlyRate
    if (session.projectId) {
      const project = projects.find(p => p.id === session.projectId)
      if (project) {
        rate = project.hourlyRate
      }
    }
    return Math.round((session.duration / 3600) * rate)
  }

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
    const totalEarnings = monthlySessions.reduce((acc, s) => acc + calculateSessionEarnings(s), 0)

    // Calculate daily data for Recharts
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const date = new Date(year, month, day)
      const daySessions = monthlySessions.filter(s => {
        const sDate = new Date(s.timestamp)
        return sDate.getDate() === day
      })

      const dayDuration = daySessions.reduce((acc, s) => acc + s.duration, 0)
      const dayEarnings = daySessions.reduce((acc, s) => acc + calculateSessionEarnings(s), 0)
      const dayHours = parseFloat((dayDuration / 3600).toFixed(1))

      return {
        day: day,
        date: date.toLocaleDateString(settings.language === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" }),
        earnings: dayEarnings,
        hours: dayHours,
        duration: dayDuration
      }
    })

    // Goal calculations
    const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`
    const monthlyGoal = settings.monthlyGoals?.[currentMonthKey] ?? settings.goalAmount
    const progress = Math.min((totalEarnings / monthlyGoal) * 100, 100)
    const remainingAmount = monthlyGoal - totalEarnings
    const remainingHours = remainingAmount > 0 ? Math.ceil(remainingAmount / settings.defaultHourlyRate) : 0 // Use default rate for remaining estimation

    // Remaining days
    const now = new Date()
    const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth()

    let remainingDays = 0
    if (isCurrentMonth) {
      remainingDays = Math.max(0, daysInMonth - now.getDate() + 1)
    } else if (selectedDate > now) {
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
      dailyData
    }
  }, [filteredSessions, settings, selectedDate, projects])

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
    if (hours > 0) return `${hours}${t.hours} ${mins}${t.minutes}`
    return `${mins}${t.minutes}`
  }

  return (
    <div className="py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">{t.thisMonth || t.stats}</h2>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8 hover:bg-background/80">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium text-sm">
            {formatMonth(selectedDate)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth(1)}
            disabled={new Date() < new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)}
            className="h-8 w-8 hover:bg-background/80"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Main Stat Card - Earnings/Time (Span 2) */}
        <Card className="col-span-1 lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {isBillable ? <TrendingUp className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
              {isBillable ? t.totalEarnings : t.totalTime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <span className="text-4xl font-bold tracking-tighter text-foreground">
                {isBillable
                  ? `¥${monthlyStats.totalEarnings.toLocaleString()}`
                  : formatDuration(monthlyStats.totalDuration)
                }
              </span>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {monthlyStats.sessionCount} {t.sessions}
                </span>
                {isBillable && (
                  <span className="text-xs">
                    {formatDuration(monthlyStats.totalDuration)}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Goal Card (Span 2) - Billable Only */}
        {isBillable ? (
          <Card className="col-span-1 lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  {t.goal}
                </CardTitle>
                {isEditingGoal ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      className="h-7 w-20 text-xs bg-background/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveGoal()
                        if (e.key === "Escape") setIsEditingGoal(false)
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveGoal}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingGoal(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-2 text-muted-foreground hover:text-foreground px-2"
                    onClick={startEditingGoal}
                  >
                    <span className="text-xs">{t.edit}</span>
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(monthlyStats.progress)}%
                  </span>
                  <span className="text-sm font-medium text-muted-foreground mb-1">
                    / ¥{monthlyStats.monthlyGoal.toLocaleString()}
                  </span>
                </div>
                <Progress value={monthlyStats.progress} className="h-2 bg-secondary" indicatorClassName="bg-blue-500" />
              </div>
              {monthlyStats.remainingHours > 0 ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-background/40 rounded-md p-2 border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.remaining}</p>
                    <p className="text-sm font-medium">{monthlyStats.remainingHours} {t.hours}</p>
                  </div>
                  <div className="bg-background/40 rounded-md p-2 border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.dailyRemaining}</p>
                    <p className="text-sm font-medium">{monthlyStats.dailyRemainingHours} {t.hours}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-2 text-green-500 bg-green-500/10 rounded-md">
                  <Check className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">{t.goalAchieved}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Placeholder for focus mode if goal card is not shown (Span 2)
          <Card className="col-span-1 lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50 shadow-sm flex items-center justify-center">
            <p className="text-muted-foreground text-sm">{t.focusModeNoGoal}</p>
          </Card>
        )}

        {/* Chart (Span 4) */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card/50 backdrop-blur-xl border-border/50 shadow-sm min-h-[300px]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isBillable ? t.dailyEarnings : t.dailyFocusTime}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {isBillable ? (
                  <AreaChart data={monthlyStats.dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      dy={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      tickFormatter={(value) => `¥${value.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--popover)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                      formatter={(value: number) => [`¥${value.toLocaleString()}`, "Earnings"]}
                      labelFormatter={(label) => `${selectedDate.getMonth() + 1}/${label}`}
                      cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="var(--primary)"
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                      strokeWidth={2}
                      activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--primary)' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyStats.dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)' }}
                      contentStyle={{ backgroundColor: 'var(--popover)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                      formatter={(value: number) => [`${value} hours`, "Focus Time"]}
                      labelFormatter={(label) => `${selectedDate.getMonth() + 1}/${label}`}
                    />
                    <Bar
                      dataKey="hours"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap (Span 4) */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card/50 backdrop-blur-xl border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {t.activityMap}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapCalendar sessions={filteredSessions} isBillable={isBillable} />
          </CardContent>
        </Card>

        {/* Calendar Detail (Span 4) */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card/50 backdrop-blur-xl border-border/50 shadow-sm h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.dailyDetails}</CardTitle>
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
    </div>
  )
}

