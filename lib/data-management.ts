import { type Session, type Settings, DEFAULT_SETTINGS, type Project } from "./types"
import { getSessions, getSettings, saveSessions, saveSettings, getProjects, saveProjects } from "./storage"

export interface AppData {
    settings: Settings
    sessions: Session[]
    projects: Project[]
    version: number
    exportedAt: number
}

const CURRENT_VERSION = 1

export async function exportData(): Promise<string> {
    const data: AppData = {
        settings: await getSettings(),
        sessions: await getSessions(),
        projects: await getProjects(),
        version: CURRENT_VERSION,
        exportedAt: Date.now(),
    }
    return JSON.stringify(data, null, 2)
}

export async function importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        const data = JSON.parse(jsonString) as AppData

        // Basic validation
        if (!data.settings || !data.sessions || !Array.isArray(data.sessions)) {
            return { success: false, error: "Invalid data format" }
        }

        // Merge settings (keep existing keys if missing in imported data, though unlikely)
        const newSettings = { ...DEFAULT_SETTINGS, ...data.settings }

        // Save data
        await saveSettings(newSettings)
        await saveSessions(data.sessions)
        if (data.projects && Array.isArray(data.projects)) {
            await saveProjects(data.projects)
        }

        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to parse JSON" }
    }
}

export async function exportCSV(): Promise<string> {
    const sessions = await getSessions()
    const settings = await getSettings()
    const projects = await getProjects()
    const projectMap = new Map(projects.map(p => [p.id, p]))

    // CSV Header
    const headers = [
        "Date",
        "Project Name",
        "Client Name",
        "Status",
        "Type",
        "Start Time",
        "End Time",
        "Duration (min)",
        "Break Time (min)",
        "Hourly Rate (¥)",
        "Earnings (¥)"
    ]

    const rows = sessions.map(session => {
        const dateObj = new Date(session.timestamp)
        const dateStr = dateObj.toLocaleDateString()

        // Start Time
        const startTimeStr = dateObj.toLocaleTimeString()

        // End Time (Approximate: Start + Duration)
        const endTimeObj = new Date(session.timestamp + session.duration * 1000)
        const endTimeStr = endTimeObj.toLocaleTimeString()

        // Duration in minutes
        const durationMin = Math.round(session.duration / 60)

        // Break Time (Estimated based on settings if completed)
        // Note: This is a simplification as actual break time isn't tracked per session in current model
        const breakTime = session.status === "completed" ? settings.breakDuration : 0

        const project = session.projectId ? projectMap.get(session.projectId) : undefined
        const hourlyRate = project ? project.hourlyRate : settings.defaultHourlyRate

        let earnings = 0
        if (session.status === "completed" && session.isBillable) {
            earnings = Math.round((session.duration / 3600) * hourlyRate)
        }

        // Helper to escape CSV fields
        const escape = (field: string | number | undefined) => {
            if (field === undefined || field === null) return ""
            const str = String(field)
            if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }

        return [
            escape(dateStr),
            escape(project?.name || "No Project"),
            escape(project?.clientName || ""),
            escape(session.status),
            escape(session.isBillable ? "Billable" : "Non-Billable"),
            escape(startTimeStr),
            escape(endTimeStr),
            escape(durationMin),
            escape(breakTime),
            escape(hourlyRate),
            escape(earnings)
        ].join(",")
    })

    // Add BOM for Excel compatibility
    return "\uFEFF" + [headers.join(","), ...rows].join("\n")
}

export function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
