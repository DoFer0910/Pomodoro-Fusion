"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    const [repoPath, setRepoPath] = useState("")

    useEffect(() => {
        if (open) {
            if (project) {
                setName(project.name)
                setClientName(project.clientName || "")
                setHourlyRate(project.hourlyRate)
                setColor(project.color)
                setRepoPath(project.repoPath || "")
            } else {
                setName("")
                setClientName("")
                setHourlyRate(defaultHourlyRate)
                setColor(COLORS[Math.floor(Math.random() * COLORS.length)])
                setRepoPath("")
            }
        }
    }, [open, project, defaultHourlyRate])

    const handleSave = () => {
        if (!name.trim()) return
        onSave({
            name,
            clientName: clientName.trim() || undefined,
            hourlyRate,
            color,
            repoPath: repoPath.trim() || undefined,
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
                        <Label htmlFor="repoPath">{t.repoPath || "Repository Path"}</Label>
                        <Input
                            id="repoPath"
                            value={repoPath}
                            onChange={(e) => setRepoPath(e.target.value)}
                            placeholder="e.g. d:\\Dev\\my-project"
                        />
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
