import { type Session, type Settings, DEFAULT_SETTINGS } from "./types"

const SESSIONS_KEY = "pomodoro_sessions"
const SETTINGS_KEY = "pomodoro_settings"

export function getSessions(): Session[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(SESSIONS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function addSession(session: Session): void {
  const sessions = getSessions()
  sessions.unshift(session)
  saveSessions(sessions)
}

export function deleteSessions(ids: string[]): void {
  const sessions = getSessions()
  const filtered = sessions.filter((s) => !ids.includes(s.id))
  saveSessions(filtered)
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const data = localStorage.getItem(SETTINGS_KEY)
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
