"use client"

import { useState, useMemo, useEffect } from "react"
import { Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Session, Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProjects } from "@/hooks/use-projects"
import { ManualEntryDialog } from "./manual-entry-dialog"
import { EditSessionDialog } from "./edit-session-dialog"

interface HistoryViewProps {
  sessions: Session[]
  settings: Settings
  onDeleteSessions: (ids: string[]) => void
  addSession: (duration: number, status: "completed", todoId: undefined, todoTitle: undefined, projectId: string | undefined, customTimestamp: number, customIsBillable: boolean) => void
  updateSession: (id: string, updates: any) => void
  t: Record<string, string>
  isBillable: boolean
}

export function HistoryView({ sessions, settings, onDeleteSessions, addSession, updateSession, t, isBillable }: HistoryViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  // 選択中の月を "YYYY-MM" 形式で保持する（null = まだ初期化前）
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  // 選択中のプロジェクト（"all" = すべて, "none" = プロジェクトなし, それ以外は projectId）
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all")
  const itemsPerPage = 10
  const { projects } = useProjects()

  // timestamp から "YYYY-MM" のキーを作る
  const toMonthKey = (timestamp: number) => {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }

  // 現在のモードに該当するセッションを新しい順にソート
  const modeSessions = useMemo(() => {
    return sessions
      .filter((s) => s.isBillable === isBillable) // 現在のモードで絞り込み
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [sessions, isBillable])

  // プロジェクトでも絞り込む（月の算出・表示の基準にする）
  // "all" は全件、"none" はプロジェクト未設定、それ以外は projectId 一致
  const filteredSessions = useMemo(() => {
    if (selectedProjectFilter === "all") return modeSessions
    if (selectedProjectFilter === "none") return modeSessions.filter((s) => !s.projectId)
    return modeSessions.filter((s) => s.projectId === selectedProjectFilter)
  }, [modeSessions, selectedProjectFilter])

  // フィルタUIに出すプロジェクト一覧：現在のモードのセッションに実際に登場するものだけ
  const projectsInScope = useMemo(() => {
    const ids = new Set<string>()
    let hasNoProject = false
    for (const s of modeSessions) {
      if (s.projectId) ids.add(s.projectId)
      else hasNoProject = true
    }
    const list = projects.filter((p) => ids.has(p.id))
    return { list, hasNoProject }
  }, [modeSessions, projects])

  // セッションが存在する月キーの一覧（新しい順）— プロジェクト絞り込み後を基準にする
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    for (const s of filteredSessions) {
      set.add(toMonthKey(s.timestamp))
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [filteredSessions])

  // 初期月の決定 / 選択中の月がデータから消えた場合の補正
  useEffect(() => {
    if (availableMonths.length === 0) {
      // データが無い月でも今月を表示できるよう、現在月を設定
      const now = new Date()
      const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      if (selectedMonth !== nowKey) setSelectedMonth(nowKey)
      return
    }
    // 未初期化、または選択中の月にデータが無い場合は最新月へ
    if (selectedMonth === null || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, selectedMonth])

  // 選択中の月のセッションだけを抽出（件数上限なし）。プロジェクト絞り込み後を基準にする
  const displaySessions = useMemo(() => {
    if (!selectedMonth) return []
    return filteredSessions.filter((s) => toMonthKey(s.timestamp) === selectedMonth)
  }, [filteredSessions, selectedMonth])

  // 前月・翌月へ移動できるか（データのある月だけ辿れる）
  const monthIndex = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1
  // availableMonths は新しい順なので、index+1 がより古い月、index-1 がより新しい月
  const canGoOlder = monthIndex >= 0 && monthIndex < availableMonths.length - 1
  const canGoNewer = monthIndex > 0

  const goOlderMonth = () => {
    if (canGoOlder) setSelectedMonth(availableMonths[monthIndex + 1])
  }
  const goNewerMonth = () => {
    if (canGoNewer) setSelectedMonth(availableMonths[monthIndex - 1])
  }

  // 月・プロジェクト切替時はページと選択をリセット
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [selectedMonth, selectedProjectFilter])

  // 表示用の "YYYY年M月" / "Month YYYY" ラベル
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number)
    if (settings.language === "ja") {
      return `${year}年${month}月`
    }
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

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
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">{t.history}</h2>
          <Button variant="outline" size="sm" onClick={() => setIsManualEntryOpen(true)} className="gap-1 h-8">
            <Plus className="w-4 h-4" />
            {t.addSession || "Add"}
          </Button>
        </div>

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

      {/* 月の切替バー：データのある月だけを前後の矢印で辿る */}
      <div className="flex items-center justify-center gap-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={goOlderMonth}
          disabled={!canGoOlder}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-foreground min-w-[110px] text-center tabular-nums">
          {selectedMonth ? formatMonthLabel(selectedMonth) : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={goNewerMonth}
          disabled={!canGoNewer}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* プロジェクトフィルタ：このモードに実際に登場するプロジェクトがある場合のみ表示 */}
      {(projectsInScope.list.length > 0 || projectsInScope.hasNoProject) && (
        <div className="flex items-center justify-center shrink-0">
          <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
            <SelectTrigger className="h-8 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allProjects || "All Projects"}</SelectItem>
              {projectsInScope.hasNoProject && (
                <SelectItem value="none">{t.noProject || "No Project"}</SelectItem>
              )}
              {projectsInScope.list.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ManualEntryDialog
        open={isManualEntryOpen}
        onOpenChange={setIsManualEntryOpen}
        onAddSession={addSession}
        t={t}
      />

      <EditSessionDialog
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
        session={editingSession}
        onUpdateSession={updateSession}
        t={t}
      />

      {paginatedSessions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t.noHistoryThisMonth || t.noHistory}</p>
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

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSession(session)}
                      className="text-muted-foreground hover:text-primary h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteSessions([session.id])}
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
