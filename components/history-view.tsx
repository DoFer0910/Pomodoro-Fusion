"use client"

import { useState, useMemo } from "react"
import { Trash2, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Session, Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useProjects } from "@/hooks/use-projects"

interface HistoryViewProps {
  sessions: Session[]
  settings: Settings
  onDeleteSessions: (ids: string[]) => void
  t: Record<string, string>
  isBillable: boolean
}

export function HistoryView({ sessions, settings, onDeleteSessions, t, isBillable }: HistoryViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const maxItems = 100
  const { projects } = useProjects()

  // Filter and sort sessions - Global list (up to maxItems)
  const displaySessions = useMemo(() => {
    return sessions
      .filter((s) => s.isBillable === isBillable) // Filter by current mode
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems)
  }, [sessions, isBillable])

  // Pagination logic
  const totalPages = Math.ceil(displaySessions.length / itemsPerPage)
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return displaySessions.slice(start, start + itemsPerPage)
  }, [displaySessions, currentPage])

  // Reset page if out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    // Select all displayed on CURRENT PAGE
    const pageIds = new Set(paginatedSessions.map(s => s.id))
    const allSelected = paginatedSessions.every(s => selectedIds.has(s.id))

    if (allSelected) {
      // Deselect current page items
      const newSelected = new Set(selectedIds)
      paginatedSessions.forEach(s => newSelected.delete(s.id))
      setSelectedIds(newSelected)
    } else {
      // Select current page items
      const newSelected = new Set(selectedIds)
      paginatedSessions.forEach(s => newSelected.add(s.id))
      setSelectedIds(newSelected)
    }
  }

  const handleDeleteSelected = () => {
    if (window.confirm(`${t.deleteSelected}? (${selectedIds.size})`)) {
      onDeleteSessions(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, "0")
    const mins = date.getMinutes().toString().padStart(2, "0")
    return `${month}/${day} ${hours}:${mins}`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins}${t.minutes}`
  }

  const calculateEarnings = (session: Session) => {
    let rate = settings.defaultHourlyRate
    if (session.projectId) {
      const project = projects.find(p => p.id === session.projectId)
      if (project) {
        rate = project.hourlyRate
      }
    }
    return Math.round((session.duration / 3600) * rate)
  }

  const getProjectDetails = (projectId?: string) => {
    if (!projectId) return null
    return projects.find(p => p.id === projectId)
  }

  return (
    <div className="py-6 space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-semibold text-foreground">{t.history}</h2>

        {paginatedSessions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-muted-foreground">
              {paginatedSessions.every(s => selectedIds.has(s.id)) ? (
                <CheckSquare className="w-4 h-4 mr-1" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              {t.selectAll}
            </Button>

            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-1" />
                {t.deleteSelected} ({selectedIds.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {paginatedSessions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t.noHistory}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-2">
            {paginatedSessions.map((session) => {
              const project = getProjectDetails(session.projectId)
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                    selectedIds.has(session.id)
                      ? "bg-primary/5 border-primary/50"
                      : "bg-card hover:bg-accent/50 border-border hover:border-border/80 hover:shadow-sm",
                  )}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleSelect(session.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {selectedIds.has(session.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {session.todoTitle && (
                        <div className="text-xs font-semibold text-primary/90 truncate max-w-[200px]" title={session.todoTitle}>
                          {session.todoTitle}
                        </div>
                      )}
                      {project && (
                        <div className="flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground border border-border">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                          <span className="truncate max-w-[100px]">{project.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{formatDate(session.timestamp)}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border",
                          session.isBillable
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
                        )}
                      >
                        {session.isBillable ? t.billableMode : t.focusMode}
                      </span>
                      {session.status === "interrupted" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                          中断
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        Duration: {formatDuration(session.duration)}
                      </span>
                      {session.isBillable && (
                        <span className="text-xs font-semibold text-primary">
                          +¥{calculateEarnings(session).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteSessions([session.id])}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls - Fixed at bottom */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground mx-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
