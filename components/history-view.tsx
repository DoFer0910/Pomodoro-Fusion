"use client"

import { useState, useMemo } from "react"
import { Trash2, CheckSquare, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Session, Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
    // Select all displayed on CURRENT PAGE, or perhaps all generally? 
    // Usually "Select All" in pagination context means "Select All on Page". 
    // Let's stick to current page for usability, or maybe all visible?
    // User request: "一ページに10件ずつ表示" so let's select current page items.
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

  const calculateEarnings = (duration: number) => {
    return Math.round((duration / 3600) * settings.hourlyRate)
  }

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
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
        <div className="space-y-4">
          <div className="space-y-2">
            {paginatedSessions.map((session) => (
              <Card
                key={session.id}
                className={cn(
                  "bg-card border-border transition-colors",
                  selectedIds.has(session.id) && "border-primary/50 bg-primary/5",
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSelect(session.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedIds.has(session.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{formatDate(session.timestamp)}</span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            session.isBillable ? "bg-gold/20 text-gold" : "bg-green/20 text-green",
                          )}
                        >
                          {session.isBillable ? t.billableMode : t.focusMode}
                        </span>
                        {session.status === "interrupted" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                            中断
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-muted-foreground">{formatDuration(session.duration)}</span>
                        {session.isBillable && (
                          <span className="text-sm font-medium text-primary">
                            +¥{calculateEarnings(session.duration).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteSessions([session.id])}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                &gt;
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
