"use client"

import * as React from "react"
import { useMemo } from "react"
import { DayButton, DayPicker } from "react-day-picker"
import { ja, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { Session, Settings } from "@/lib/types"

interface ActivityCalendarProps {
    sessions: Session[]
    isBillable: boolean
    currentDate: Date
    onMonthChange: (date: Date) => void
    settings: Settings
}

export function ActivityCalendar({
    sessions,
    isBillable,
    currentDate,
    onMonthChange,
    settings,
}: ActivityCalendarProps) {
    // 日ごとのデータを集計
    const dailyStats = useMemo(() => {
        const stats = new Map<string, number>()

        sessions.forEach(session => {
            // 完了したセッションまたは設定で有効な中断セッションのみ集計
            if (session.status === "completed" || (settings.countInterruptedSessions && session.status === "interrupted")) {
                const dateKey = new Date(session.timestamp).toDateString()
                const currentVal = stats.get(dateKey) || 0
                stats.set(dateKey, currentVal + session.duration)
            }
        })

        return stats
    }, [sessions, settings.countInterruptedSessions])

    const formatValue = (duration: number) => {
        if (duration === 0) return null

        if (isBillable) {
            const earnings = Math.round((duration / 3600) * settings.hourlyRate)
            return `¥${earnings.toLocaleString()}`
        } else {
            const hours = Math.floor(duration / 3600)
            const mins = Math.floor((duration % 3600) / 60)
            if (hours > 0) {
                return `${hours}h ${mins}m`
            }
            return `${mins}m`
        }
    }

    // カレンダーのロケール設定
    const locale = settings.language === "ja" ? ja : enUS

    return (
        <div className="p-3">
            <DayPicker
                mode="single"
                month={currentDate}
                onMonthChange={onMonthChange}
                locale={locale}
                showOutsideDays={false}
                className={cn("w-full")}
                classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 w-full",
                    caption: "flex justify-center pt-1 relative items-center hidden", // 親コンポーネントで月を表示しているので隠す
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: cn(
                        buttonVariants({ variant: "outline" }),
                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                    ),
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    weekdays: "flex",
                    weekday: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                    week: "flex w-full mt-2",
                    day: "h-20 w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day_button: cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-20 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground items-start justify-start flex flex-col border border-border/50"
                    ),
                    day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_hidden: "invisible",
                }}
                components={{
                    DayButton: (props: React.ComponentProps<typeof DayButton>) => {
                        const { day, ...rest } = props
                        const dateKey = day.date.toDateString()
                        const duration = dailyStats.get(dateKey) || 0
                        const value = formatValue(duration)

                        // props.children contains the day number usually
                        const dayNumber = day.date.getDate()

                        return (
                            <button {...rest} className={props.className}>
                                <div className="w-full h-full p-1 flex flex-col items-start justify-between">
                                    <span className="text-xs font-semibold ml-1 mt-1">{dayNumber}</span>
                                    {value && (
                                        <div className="w-full text-center mb-1">
                                            <span className={cn(
                                                "text-xs px-1.5 py-0.5 rounded-full inline-block w-[90%] truncate",
                                                isBillable
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                                            )}>
                                                {value}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    }
                }}
            />
        </div>
    )
}
