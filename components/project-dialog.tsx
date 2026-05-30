"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { Project } from "@/lib/types"

interface ProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project?: Project
    onSave: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => void
    defaultHourlyRate: number
    t: Record<string, string>
}

const COLORS = [
    "#ef4444", // red-500
    "#f97316", // orange-500
    "#eab308", // yellow-500
    "#22c55e", // green-500
    "#06b6d4", // cyan-500
    "#3b82f6", // blue-500
    "#8b5cf6", // violet-500
    "#d946ef", // fuchsia-500
    "#64748b", // slate-500
]

export function ProjectDialog({ open, onOpenChange, project, onSave, defaultHourlyRate, t }: ProjectDialogProps) {
    const [name, setName] = useState("")
    const [clientName, setClientName] = useState("")
    const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate)
    const [color, setColor] = useState(COLORS[0])
    // 複数リポジトリパス。常に末尾に空欄を1つ持たせて追加入力しやすくする。
    const [repoPaths, setRepoPaths] = useState<string[]>([""])

    useEffect(() => {
        if (open) {
            if (project) {
                setName(project.name)
                setClientName(project.clientName || "")
                setHourlyRate(project.hourlyRate)
                setColor(project.color)
                // 新形式 repoPaths と旧形式 repoPath を統合して読み込む（後方互換）
                const existing = [
                    ...(project.repoPaths || []),
                    ...(project.repoPath ? [project.repoPath] : []),
                ].filter((p) => p.trim().length > 0)
                const unique = Array.from(new Set(existing))
                setRepoPaths(unique.length > 0 ? [...unique, ""] : [""])
            } else {
                setName("")
                setClientName("")
                setHourlyRate(defaultHourlyRate)
                setColor(COLORS[Math.floor(Math.random() * COLORS.length)])
                setRepoPaths([""])
            }
        }
    }, [open, project, defaultHourlyRate])

    const updateRepoPath = (index: number, value: string) => {
        setRepoPaths((prev) => prev.map((p, i) => (i === index ? value : p)))
    }

    const addRepoPath = () => {
        setRepoPaths((prev) => [...prev, ""])
    }

    const removeRepoPath = (index: number) => {
        setRepoPaths((prev) => {
            const next = prev.filter((_, i) => i !== index)
            return next.length > 0 ? next : [""]
        })
    }

    const handleSave = () => {
        if (!name.trim()) return
        // 空欄・重複を除いて保存。1件も無ければ undefined。
        const cleaned = Array.from(
            new Set(repoPaths.map((p) => p.trim()).filter((p) => p.length > 0)),
        )
        onSave({
            name,
            clientName: clientName.trim() || undefined,
            hourlyRate,
            color,
            repoPaths: cleaned.length > 0 ? cleaned : undefined,
            // 旧形式は保存しない（repoPaths に統一）。既存データの repoPath は読込時に取り込み済み。
            repoPath: undefined,
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{project ? t.editProject : t.addProject}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t.projectName}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="clientName">{t.clientName}</Label>
                        <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="hourlyRate">{t.hourlyRate} (¥)</Label>
                        <Input
                            id="hourlyRate"
                            type="number"
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(Number(e.target.value))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t.repoPath || "Repository Path"}</Label>
                        <div className="space-y-2">
                            {repoPaths.map((path, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={path}
                                        onChange={(e) => updateRepoPath(index, e.target.value)}
                                        placeholder="e.g. d:\\Dev\\my-project"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeRepoPath(index)}
                                        disabled={repoPaths.length === 1 && !path.trim()}
                                        title={t.removeRepoPath || "削除"}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={addRepoPath}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                {t.addRepoPath || "リポジトリを追加"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t.repoPathHint || "Claude Code の作業時間をこのプロジェクトに紐づけます"}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t.projectColor}</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-foreground scale-110" : "border-transparent"
                                        }`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave}>{t.save}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
