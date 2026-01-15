"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Session } from "@/lib/types"

interface HeatmapCalendarProps {
  sessions: Session[]
  isBillable: boolean
}

export function HeatmapCalendar({ sessions, isBillable }: HeatmapCalendarProps) {
  const calendarData = useMemo(() => {
    const now = new Date()
    const weeks: { date: Date; level: number }[][] = []

    // Get sessions grouped by date
    const sessionsByDate = new Map<string, number>()
    sessions.forEach((session) => {
      const date = new Date(session.timestamp).toDateString()
      const current = sessionsByDate.get(date) || 0
      sessionsByDate.set(date, current + session.duration)
    })

    // Find max for normalization
    const maxDuration = Math.max(...Array.from(sessionsByDate.values()), 1)

    // Generate 12 weeks of data
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 83) // 12 weeks back
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

    let currentWeek: { date: Date; level: number }[] = []

    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const duration = sessionsByDate.get(date.toDateString()) || 0
      const level = duration === 0 ? 0 : Math.ceil((duration / maxDuration) * 4)

      currentWeek.push({ date, level: Math.min(level, 4) })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    return weeks
  }, [sessions])

  const getLevelClass = (level: number) => {
    switch (level) {
      case 0:
        return "bg-[var(--heatmap-0)]"
      case 1:
        return "bg-[var(--heatmap-1)]"
      case 2:
        return "bg-[var(--heatmap-2)]"
      case 3:
        return "bg-[var(--heatmap-3)]"
      case 4:
        return "bg-[var(--heatmap-4)]"
      default:
        return "bg-[var(--heatmap-0)]"
    }
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const days = ["", "Mon", "", "Wed", "", "Fri", ""]

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-fit">
        {/* Month labels */}
        <div className="flex gap-1 ml-8 mb-1">
          {calendarData.map((week, i) => {
            const firstDayOfWeek = week[0]?.date
            const showMonth = firstDayOfWeek && firstDayOfWeek.getDate() <= 7
            return (
              <div key={i} className="w-3 text-[10px] text-muted-foreground">
                {showMonth ? months[firstDayOfWeek.getMonth()] : ""}
              </div>
            )
          })}
        </div>

        {/* Calendar grid */}
        <div className="flex gap-2">
          {/* Day labels */}
          <div className="flex flex-col gap-1">
            {days.map((day, i) => (
              <div key={i} className="w-6 h-3 text-[10px] text-muted-foreground leading-3">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex gap-1">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn("w-3 h-3 rounded-sm transition-colors", getLevelClass(day.level))}
                    title={`${day.date.toLocaleDateString()}: Level ${day.level}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={cn("w-3 h-3 rounded-sm", getLevelClass(level))} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
