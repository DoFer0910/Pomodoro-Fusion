import { type Session, type Settings, DEFAULT_SETTINGS } from "./types"
import { getSessions, getSettings, saveSessions, saveSettings } from "./storage"

export interface AppData {
    settings: Settings
    sessions: Session[]
    version: number
    exportedAt: number
}

const CURRENT_VERSION = 1

export function exportData(): string {
    const data: AppData = {
        settings: getSettings(),
        sessions: getSessions(),
        version: CURRENT_VERSION,
        exportedAt: Date.now(),
    }
    return JSON.stringify(data, null, 2)
}

export function importData(jsonString: string): { success: boolean; error?: string } {
    try {
        const data = JSON.parse(jsonString) as AppData

        // Basic validation
        if (!data.settings || !data.sessions || !Array.isArray(data.sessions)) {
            return { success: false, error: "Invalid data format" }
        }

        // Merge settings (keep existing keys if missing in imported data, though unlikely)
        const newSettings = { ...DEFAULT_SETTINGS, ...data.settings }

        // Save data
        saveSettings(newSettings)
        saveSessions(data.sessions)

        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to parse JSON" }
    }
}

export function exportCSV(): string {
    const sessions = getSessions()
    const settings = getSettings()

    // CSV Header
    const headers = [
        "Date",
        "Time",
        "Duration (min)",
        "Status",
        "Type",
        "Earnings (¥)"
    ]

    const rows = sessions.map(session => {
        const date = new Date(session.timestamp)
        const dateStr = date.toLocaleDateString()
        const timeStr = date.toLocaleTimeString()
        const durationMin = Math.round(session.duration / 60)

        let earnings = 0
        if (session.status === "completed" && session.isBillable) {
            earnings = Math.round((session.duration / 3600) * settings.hourlyRate)
        }

        return [
            dateStr,
            timeStr,
            durationMin.toString(),
            session.status,
            session.isBillable ? "Billable" : "Non-Billable",
            earnings.toString()
        ].join(",")
    })

    return [headers.join(","), ...rows].join("\n")
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
