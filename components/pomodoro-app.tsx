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
import { TimerProvider } from "./timer-context"
import { TimerMeta } from "./timer-meta"

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

  // Use TimerProvider to persist state across view changes
  return (
    <TimerProvider settings={settings} sessions={sessions} onSessionComplete={addSession}>
      <PomodoroAppContent
        settings={settings}
        sessions={sessions}
        isBillable={isBillable}
        setIsBillable={setIsBillable}
        updateSettings={updateSettings}
        addSession={addSession}
        deleteSessions={deleteSessions}
        mounted={mounted}
        earnedAmount={earnedAmount}
        showMoneyOverlay={showMoneyOverlay}
        currentView={currentView}
        setCurrentView={setCurrentView}
        t={t}
      />
    </TimerProvider>
  )
}

// Extract content to separate component to keep main clear and because we might want to access context here later
function PomodoroAppContent({
  settings,
  sessions,
  isBillable,
  setIsBillable,
  updateSettings,
  addSession,
  deleteSessions,
  mounted,
  earnedAmount,
  showMoneyOverlay,
  currentView,
  setCurrentView,
  t
}: {
  settings: any
  sessions: any[]
  isBillable: boolean
  setIsBillable: (v: boolean) => void
  updateSettings: (s: any) => void
  addSession: (d: number, s: "completed" | "interrupted") => void
  deleteSessions: (ids: string[]) => void
  mounted: boolean
  earnedAmount: number
  showMoneyOverlay: boolean
  currentView: View
  setCurrentView: (v: View) => void
  t: any
}) {
  const navItems = [
    { id: "timer" as const, icon: Timer, label: t.timer },
    { id: "stats" as const, icon: BarChart3, label: t.stats },
    { id: "history" as const, icon: History, label: t.history },
    { id: "settings" as const, icon: SettingsIcon, label: t.settings },
  ]

  return (
    <div className={cn("min-h-screen bg-background", !isBillable && "focus-mode")}>
      <TimerMeta t={t} />
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
          <TimerView
            settings={settings}
            isBillable={isBillable}
            onSessionComplete={addSession}
            sessions={sessions}
            t={t}
          />
        )}
        {currentView === "stats" && <StatsView sessions={sessions} settings={settings} isBillable={isBillable} t={t} />}
        {currentView === "history" && (
          <HistoryView
            sessions={sessions}
            settings={settings}
            onDeleteSessions={deleteSessions}
            t={t}
            isBillable={isBillable}
          />
        )}
        {currentView === "settings" && (
          <SettingsView
            settings={settings}
            onSettingsChange={updateSettings}
            t={t}
            isBillable={isBillable}
          />
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
