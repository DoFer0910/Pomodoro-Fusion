"use client"

import { useState } from "react"
import { Timer, BarChart3, History, SettingsIcon, CheckSquare, Pin, PinOff, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
// import { type Settings, DEFAULT_SETTINGS, type Session } from "@/lib/types" // handled by hook
import { useTranslation } from "@/lib/i18n"
import { TimerView } from "./timer-view"
import { StatsView } from "./stats-view"
import { HistoryView } from "./history-view"
import { SettingsView } from "./settings-view"
import { TodoView } from "./todo-view"
import { MoneyOverlay } from "./money-overlay"
import { usePomodoro } from "@/hooks/use-pomodoro"
import { useTodo } from "@/hooks/use-todo"
import { TimerProvider } from "./timer-context"
import { TimerMeta } from "./timer-meta"

type View = "timer" | "stats" | "history" | "settings" | "todo"

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

  const { todos, addTodo, toggleTodo, deleteTodo, error } = useTodo()

  const [currentView, setCurrentView] = useState<View>("timer")
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [isCompactMode, setIsCompactMode] = useState(false)
  const t = useTranslation(settings.language)

  const toggleAlwaysOnTop = async () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const newState = !isAlwaysOnTop
      await (window as any).electron.setAlwaysOnTop(newState)
      setIsAlwaysOnTop(newState)
    }
  }

  const toggleCompactMode = async () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const newState = !isCompactMode

      // Update UI state immediately for responsiveness
      setIsCompactMode(newState)
      if (newState) {
        setIsAlwaysOnTop(true)
        setCurrentView("timer") // Force switch to Timer view
      }

      // Then notify main process
      await (window as any).electron.setCompactMode(newState)
    }
  }

  // Use TimerProvider to persist state across view changes
  return (
    <TimerProvider settings={settings} sessions={sessions} todos={todos} onSessionComplete={addSession}>
      <PomodoroAppContent
        settings={settings}
        sessions={sessions}
        isBillable={isBillable}
        setIsBillable={setIsBillable}
        updateSettings={updateSettings}
        addSession={addSession}
        deleteSessions={deleteSessions}
        todos={todos}
        addTodo={addTodo}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
        error={error}
        mounted={mounted}
        earnedAmount={earnedAmount}
        showMoneyOverlay={showMoneyOverlay}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isAlwaysOnTop={isAlwaysOnTop}
        toggleAlwaysOnTop={toggleAlwaysOnTop}
        isCompactMode={isCompactMode}
        toggleCompactMode={toggleCompactMode}
        t={t}
      />
    </TimerProvider>
  )
}

import { TitleBar } from "./title-bar"

// Extract content to separate component to keep main clear and because we might want to access context here later
function PomodoroAppContent({
  settings,
  sessions,
  isBillable,
  setIsBillable,
  updateSettings,
  addSession,
  deleteSessions,
  todos,
  addTodo,
  toggleTodo,
  deleteTodo,
  error,
  mounted,
  earnedAmount,
  showMoneyOverlay,
  currentView,
  setCurrentView,
  isAlwaysOnTop,
  toggleAlwaysOnTop,
  isCompactMode,
  toggleCompactMode,
  t
}: {
  settings: any
  sessions: any[]
  isBillable: boolean
  setIsBillable: (v: boolean) => void
  updateSettings: (s: any) => void
  addSession: (d: number, s: "completed" | "interrupted", todoId?: string, todoTitle?: string, projectId?: string) => void
  deleteSessions: (ids: string[]) => void
  todos: any[]
  addTodo: (t: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  error?: string | null
  mounted: boolean
  earnedAmount: number
  showMoneyOverlay: boolean
  currentView: View
  setCurrentView: (v: View) => void
  isAlwaysOnTop: boolean
  toggleAlwaysOnTop: () => void
  isCompactMode: boolean
  toggleCompactMode: () => void
  t: any
}) {
  const navItems = [
    { id: "timer" as const, icon: Timer, label: t.timer },
    { id: "todo" as const, icon: CheckSquare, label: t.todo },
    { id: "stats" as const, icon: BarChart3, label: t.stats },
    { id: "history" as const, icon: History, label: t.history },
    { id: "settings" as const, icon: SettingsIcon, label: t.settings },
  ]

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-500 ease-in-out flex flex-col",
        isCompactMode ? "bg-transparent" : "bg-background"
      )}
      data-mode={isBillable ? "earn" : "immerse"}
    >
      <MoneyOverlay amount={earnedAmount} show={showMoneyOverlay && !isCompactMode} />

      {/* Custom Title Bar (Standard Mode Only) */}
      {!isCompactMode && <TitleBar />}

      {/* Header (Standard Mode Only) */}
      {!isCompactMode && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="text-lg font-black text-foreground">{t.appName}</h1>

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

              {/* Always on Top Toggle (Electron Only) */}
              {(typeof window !== 'undefined' && (window as any).electron) && (
                <>
                  <button
                    onClick={toggleAlwaysOnTop}
                    className={cn(
                      "p-2 rounded-lg transition-all ml-2",
                      isAlwaysOnTop
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    title={t.alwaysOnTop || "Always on Top"}
                  >
                    {isAlwaysOnTop ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                  </button>
                  {/* Compact Mode toggle moved to TimerView */}
                </>
              )}
            </div>        </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        !isCompactMode && "max-w-2xl mx-auto px-4 pb-24 w-full",
        isCompactMode && "flex items-center justify-center p-4"
      )}>
        {currentView === "timer" && (
          <TimerView
            settings={settings}
            isBillable={isBillable}
            onSessionComplete={addSession}
            sessions={sessions}
            todos={todos}
            t={t}
            isCompactMode={isCompactMode}
            toggleCompactMode={toggleCompactMode}
          />
        )}
        {!isCompactMode && currentView === "stats" && <StatsView sessions={sessions} settings={settings} isBillable={isBillable} t={t} onSettingsChange={updateSettings} />}
        {!isCompactMode && currentView === "history" && (
          <HistoryView
            sessions={sessions}
            settings={settings}
            onDeleteSessions={deleteSessions}
            t={t}
            isBillable={isBillable}
          />
        )}
        {!isCompactMode && currentView === "todo" && (
          <TodoView
            todos={todos}
            addTodo={addTodo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
            error={error}
            t={t}
          />
        )}
        {!isCompactMode && currentView === "settings" && (
          <SettingsView
            settings={settings}
            onSettingsChange={updateSettings}
            t={t}
            isBillable={isBillable}
          />
        )}
      </main>

      {/* Bottom Navigation (Standard Mode Only) */}
      {!isCompactMode && (
        <nav className="fixed bottom-8 left-0 right-0 mx-4 border border-border bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg z-50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-around h-16">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-300",
                    currentView === item.id
                      ? "text-primary scale-110 opacity-100"
                      : "text-muted-foreground hover:text-foreground opacity-70 scale-100",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

    </div>
  )
}
