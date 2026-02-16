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

interface ManualEntryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAddSession: (
        duration: number,
        status: "completed",
        todoId: undefined, // No todo for manual entry usually
        todoTitle: undefined,
        projectId: string | undefined,
        customTimestamp: number,
        customIsBillable: boolean
    ) => void
    t: Record<string, string>
}

export function ManualEntryDialog({ open, onOpenChange, onAddSession, t }: ManualEntryDialogProps) {
    const { projects } = useProjects()

    // Form State
    const [projectId, setProjectId] = useState<string>("none")
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [startTime, setStartTime] = useState("10:00")
    const [endTime, setEndTime] = useState("11:00")
    const [isBillable, setIsBillable] = useState(true)

    // Validation State
    const [error, setError] = useState<string | null>(null)

    // Calculated Duration Display
    const [durationDisplay, setDurationDisplay] = useState("")

    useEffect(() => {
        if (open) {
            // Reset form on open
            setProjectId("none")
            setDate(format(new Date(), "yyyy-MM-dd"))
            setStartTime("10:00")
            setEndTime("11:00")
            setIsBillable(true)
            setError(null)
        }
    }, [open])

    // Calculate duration whenever times change
    useEffect(() => {
        if (!startTime || !endTime) {
            setDurationDisplay("")
            return
        }

        const start = new Date(`2000-01-01T${startTime}`)
        const end = new Date(`2000-01-01T${endTime}`)

        // Handle overnight logic simply for now: if end < start, assume next day? 
        // Or just show error? Let's show error for simplicity first as typical work session.
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
    }, [startTime, endTime, t])

    const handleSave = () => {
        if (error) return // Prevent save if validation failed

        const start = new Date(`${date}T${startTime}`)
        const end = new Date(`${date}T${endTime}`)

        // Safety check for date parsing
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            setError("Invalid date or time")
            return
        }

        let diff = (end.getTime() - start.getTime()) / 1000
        if (diff <= 0) {
            // Handle overnight if we want to support it, 
            // but simpler to enforce same-day for manual entry UI for now.
            setError(t.invalidTimeRange || "End time must be after start time")
            return
        }

        onAddSession(
            diff,
            "completed",
            undefined,
            undefined,
            projectId === "none" ? undefined : projectId,
            start.getTime(),
            isBillable
        )

        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t.addManualSession || "Add Manual Session"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    {/* Project Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="project">{t.project || "Project"}</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger>
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
                        <Label htmlFor="date">{t.date || "Date"}</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="startTime">{t.startTime || "Start"}</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="endTime">{t.endTime || "End"}</Label>
                            <Input
                                id="endTime"
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
                        <Label htmlFor="billable-mode" className="flex flex-col space-y-1">
                            <span>{isBillable ? (t.billableMode || "Billable Mode") : (t.focusMode || "Focus Mode")}</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                {isBillable ? (t.billableDescription || "Tracks earnings") : (t.focusDescription || "Tracks time only")}
                            </span>
                        </Label>
                        <Switch
                            id="billable-mode"
                            checked={isBillable}
                            onCheckedChange={setIsBillable}
                        />
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
