"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useProjects } from "@/hooks/use-projects"
import { format, addMinutes, differenceInMinutes, parse } from "date-fns"

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
    const [durationHours, setDurationHours] = useState("1")
    const [durationMinutes, setDurationMinutes] = useState("0")
    const [isBillable, setIsBillable] = useState(true)

    // Validation State
    const [error, setError] = useState<string | null>(null)

    // To prevent infinite loops during sync
    const [lastEditedField, setLastEditedField] = useState<"time" | "duration">("time")

    useEffect(() => {
        if (open) {
            // Reset form on open
            setProjectId("none")
            setDate(format(new Date(), "yyyy-MM-dd"))
            setStartTime("10:00")
            setEndTime("11:00")
            setDurationHours("1")
            setDurationMinutes("0")
            setIsBillable(true)
            setError(null)
            setLastEditedField("time")
        }
    }, [open])

    // Sync logic: Times -> Duration
    useEffect(() => {
        if (lastEditedField !== "time" || !startTime || !endTime) return

        const start = parse(startTime, "HH:mm", new Date())
        const end = parse(endTime, "HH:mm", new Date())

        const diffMinutes = differenceInMinutes(end, start)

        if (diffMinutes <= 0) {
            setError(t.invalidTimeRange || "End time must be after start time")
        } else {
            setError(null)
            const hours = Math.floor(diffMinutes / 60)
            const mins = diffMinutes % 60
            setDurationHours(hours.toString())
            setDurationMinutes(mins.toString())
        }
    }, [startTime, endTime, lastEditedField, t])

    // Sync logic: Duration -> End Time
    useEffect(() => {
        if (lastEditedField !== "duration" || !startTime) return

        const start = parse(startTime, "HH:mm", new Date())
        const hours = parseInt(durationHours) || 0
        const mins = parseInt(durationMinutes) || 0
        
        const totalAddMinutes = (hours * 60) + mins

        if (totalAddMinutes <= 0) {
            setError(t.invalidDuration || "Duration must be greater than 0")
        } else {
            setError(null)
            const newEnd = addMinutes(start, totalAddMinutes)
            setEndTime(format(newEnd, "HH:mm"))
        }
    }, [startTime, durationHours, durationMinutes, lastEditedField, t])

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
            // Simple approach for now (assumes same day)
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

    // Helper functions for input handlers
    const handleTimeChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setLastEditedField("time")
        setter(value)
    }

    const handleDurationChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setLastEditedField("duration")
        setter(value)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t.addManualSession || "Add Manual Session"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-5 py-4">

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

                    {/* Time & Duration Section */}
                    <div className="bg-muted/30 p-4 rounded-lg space-y-4 border">
                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime">{t.startTime || "Start Time"}</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => handleTimeChange(setStartTime, e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime">{t.endTime || "End Time"}</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => handleTimeChange(setEndTime, e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Duration Input */}
                        <div className="grid gap-2 pt-2 border-t">
                            <Label>{t.duration || "Duration"}</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={durationHours}
                                        onChange={(e) => handleDurationChange(setDurationHours, e.target.value)}
                                        className="text-right"
                                    />
                                    <span className="text-sm font-medium text-muted-foreground mr-2">h</span>
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={durationMinutes}
                                        onChange={(e) => handleDurationChange(setDurationMinutes, e.target.value)}
                                        className="text-right"
                                    />
                                    <span className="text-sm font-medium text-muted-foreground">m</span>
                                </div>
                            </div>
                            {error && (
                                <p className="text-sm text-destructive mt-1">{error}</p>
                            )}
                        </div>
                    </div>

                    {/* Mode Switch */}
                    <div className="flex items-center justify-between space-x-2">
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

