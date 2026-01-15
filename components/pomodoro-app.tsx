"use client"

import { useState } from "react"
import { Timer, BarChart3, History, SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"
// import { type Settings, DEFAULT_SETTINGS, type Session } from "@/lib/types" // handled by hook
import { useTranslation } from "@/lib/i18n"
import { TimerView } from "./timer-view"
import { StatsView } from "./stats-view"
import { HistoryView } from "./history-view"
import { SettingsView } from "./settings-view"
import { MoneyOverlay } from "./money-overlay"
import { usePomodoro } from "@/hooks/use-pomodoro"

type View = "timer" | "stats" | "history" | "settings"

export function PomodoroApp() {
  const {
    settings,
    sessions,
    isBillable,
    setIsBillable,
    updateSettings,
    addSession,
    deleteSessions,
    mounted,
    earnedAmount,
    showMoneyOverlay
  } = usePomodoro()

  const [currentView, setCurrentView] = useState<View>("timer")
  const t = useTranslation(settings.language)

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const navItems = [
    { id: "timer" as const, icon: Timer, label: t.timer },
    { id: "stats" as const, icon: BarChart3, label: t.stats },
    { id: "history" as const, icon: History, label: t.history },
    { id: "settings" as const, icon: SettingsIcon, label: t.settings },
  ]

  return (
    <div className={cn("min-h-screen bg-background", !isBillable && "focus-mode")}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{t.appName}</h1>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBillable(true)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-all",
                isBillable ? "bg-gold/20 text-gold font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.billableMode}
            </button>
            <button
              onClick={() => setIsBillable(false)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-all",
                !isBillable ? "bg-green/20 text-green font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.focusMode}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-24">
        {currentView === "timer" && (
          <TimerView settings={settings} isBillable={isBillable} onSessionComplete={addSession} t={t} />
        )}
        {currentView === "stats" && <StatsView sessions={sessions} settings={settings} isBillable={isBillable} t={t} />}
        {currentView === "history" && (
          <HistoryView sessions={sessions} settings={settings} onDeleteSessions={deleteSessions} t={t} />
        )}
        {currentView === "settings" && (
          <SettingsView settings={settings} onSettingsChange={updateSettings} t={t} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
                  currentView === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Money Overlay */}
      {showMoneyOverlay && <MoneyOverlay amount={earnedAmount} />}
    </div>
  )
}
