"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useProjects } from "@/hooks/use-projects"
import { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FolderOpen, RefreshCw } from "lucide-react"
import { ProjectDialog } from "./project-dialog"
import type { SyncSummary } from "@/lib/claude-sync"
import { useLicense } from "@/hooks/use-license"
import { FREE_PROJECT_LIMIT } from "@/lib/pro-limits"

interface ProjectListProps {
    defaultHourlyRate: number
    t: Record<string, string>
    /** Claude Code ログ同期。Electron 環境でのみ渡される */
    onSyncClaude?: () => Promise<SyncSummary>
}

export function ProjectList({ defaultHourlyRate, t, onSyncClaude }: ProjectListProps) {
    const { projects, addProject, updateProject, deleteProject } = useProjects()
    const { isPro } = useLicense()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
    const [isSyncing, setIsSyncing] = useState(false)

    const isElectron = typeof window !== "undefined" && (window as any).electron

    const handleSyncClaude = async () => {
        if (!onSyncClaude || isSyncing) return
        setIsSyncing(true)
        try {
            const summary = await onSyncClaude()
            const base = (t.claudeSyncResult || "Claude Code: 新規 {added} 件 / 更新 {updated} 件")
                .replace("{added}", String(summary.added))
                .replace("{updated}", String(summary.updated))
            if (summary.unmatched > 0) {
                const unmatchedMsg = (t.claudeSyncUnmatched || "（未登録リポジトリ {unmatched} 件）")
                    .replace("{unmatched}", String(summary.unmatched))
                toast.success(base + unmatchedMsg)
            } else {
                toast.success(base)
            }
        } catch (err) {
            console.error("[handleSyncClaude] sync error:", err)
            toast.error(t.claudeSyncFailed || "Claude Code の同期に失敗しました")
        } finally {
            setIsSyncing(false)
        }
    }

    const handleAdd = () => {
        // 無料プランはプロジェクト新規作成を FREE_PROJECT_LIMIT 件までに制限する。
        // 既存分の遡及削除はしない方針なので、上限以上のときに「新規作成」だけを止める。
        if (!isPro && projects.length >= FREE_PROJECT_LIMIT) {
            toast.error((t.projectLimitReached || "").replace("{limit}", String(FREE_PROJECT_LIMIT)))
            return
        }
        setEditingProject(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (project: Project) => {
        setEditingProject(project)
        setIsDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        if (confirm(t.deleteSelected ? t.deleteSelected + "?" : "Are you sure?")) {
            deleteProject(id)
        }
    }

    const handleSave = (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
        if (editingProject) {
            updateProject(editingProject.id, data)
        } else {
            addProject(data)
        }
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    {t.projects}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {isElectron && onSyncClaude && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSyncClaude}
                            disabled={isSyncing}
                            title={t.claudeSyncHint || "Claude Code の作業時間を取り込みます"}
                        >
                            <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                            {t.syncClaude || "Claude Code 同期"}
                        </Button>
                    )}
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="w-4 h-4 mr-1" />
                        {t.addProject}
                        {!isPro && projects.length >= FREE_PROJECT_LIMIT && (
                            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                {t.proBadge}
                            </span>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {projects.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        {t.noProject}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: project.color }}
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">{project.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {project.clientName ? `${project.clientName} • ` : ""}
                                            ¥{project.hourlyRate.toLocaleString()}/h
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleEdit(project)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(project.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <ProjectDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    project={editingProject}
                    onSave={handleSave}
                    defaultHourlyRate={defaultHourlyRate}
                    t={t}
                />
            </CardContent>
        </Card>
    )
}
