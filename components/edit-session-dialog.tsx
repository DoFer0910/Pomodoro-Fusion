"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useProjects } from "@/hooks/use-projects"
import { format } from "date-fns"
import type { Session } from "@/lib/types"

interface EditSessionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: Session | null
    onUpdateSession: (
        id: string,
        updates: {
            duration: number
            projectId?: string
            timestamp: number
            isBillable: boolean,
            status: "completed" | "interrupted"
        }
    ) => void
    t: Record<string, string>
}

export function EditSessionDialog({ open, onOpenChange, session, onUpdateSession, t }: EditSessionDialogProps) {
    const { projects } = useProjects()

    // Form State
    const [projectId, setProjectId] = useState<string>("none")
    const [date, setDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [isBillable, setIsBillable] = useState(true)
    const [status, setStatus] = useState<"completed" | "interrupted">("completed")

    // Validation State
    const [error, setError] = useState<string | null>(null)
    const [durationDisplay, setDurationDisplay] = useState("")

    useEffect(() => {
        if (open && session) {
            // Initialize form with session data
            const sessionDate = new Date(session.timestamp)
            setDate(format(sessionDate, "yyyy-MM-dd"))
            setStartTime(format(sessionDate, "HH:mm"))

            const endDate = new Date(session.timestamp + session.duration * 1000)
            setEndTime(format(endDate, "HH:mm"))

            setProjectId(session.projectId || "none")
            setIsBillable(session.isBillable)
            setStatus(session.status)
            setError(null)
        }
    }, [open, session])

    // Calculate duration whenever times change
    useEffect(() => {
        if (!startTime || !endTime || !date) {
            setDurationDisplay("")
            return
        }

        const start = new Date(`${date}T${startTime}`)
        const end = new Date(`${date}T${endTime}`)

        // Handle overnight sessions? 
        // For simplicity, if end < start, assume error for now as typical pomodoro sessions are short.
        let diff = (end.getTime() - start.getTime()) / 1000 // seconds

        if (diff <= 0) {
            setDurationDisplay("Invalid time range")
            setError(t.invalidTimeRange || "End time must be after start time")
        } else {
            setError(null)
            const hours = Math.floor(diff / 3600)
            const minutes = Math.floor((diff % 3600) / 60)
            setDurationDisplay(`${hours}h ${minutes}m`)
        }
    }, [startTime, endTime, date, t])

    const handleSave = () => {
        if (error || !session) return

        const start = new Date(`${date}T${startTime}`)
        const end = new Date(`${date}T${endTime}`)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            setError("Invalid date or time")
            return
        }

        let diff = (end.getTime() - start.getTime()) / 1000
        if (diff <= 0) {
            setError(t.invalidTimeRange || "End time must be after start time")
            return
        }

        onUpdateSession(session.id, {
            duration: diff,
            projectId: projectId === "none" ? undefined : projectId,
            timestamp: start.getTime(),
            isBillable,
            status
        })

        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t.editSession || "Edit Session"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    {/* Project Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="edit-project">{t.project || "Project"}</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger id="edit-project">
                                <SelectValue placeholder={t.selectProject || "Select a project"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t.noProject || "No Project"}</SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                            {p.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="edit-date">{t.date || "Date"}</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-startTime">{t.startTime || "Start"}</Label>
                            <Input
                                id="edit-startTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-endTime">{t.endTime || "End"}</Label>
                            <Input
                                id="edit-endTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Duration Display */}
                    <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                        <span className="text-sm text-muted-foreground">{t.duration || "Duration"}:</span>
                        <span className={`font-mono font-medium ${error ? "text-destructive" : ""}`}>
                            {durationDisplay}
                        </span>
                    </div>

                    {/* Mode Switch */}
                    <div className="flex items-center justify-between space-x-2 py-2">
                        <Label htmlFor="edit-billable-mode" className="flex flex-col space-y-1">
                            <span>{isBillable ? (t.billableMode || "Billable Mode") : (t.focusMode || "Focus Mode")}</span>
                        </Label>
                        <Switch
                            id="edit-billable-mode"
                            checked={isBillable}
                            onCheckedChange={setIsBillable}
                        />
                    </div>

                    {/* Status Selection (Optional but good for correction) */}
                    <div className="grid gap-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                            <SelectTrigger id="edit-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="interrupted">Interrupted</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={!!error}>{t.save || "Save"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
