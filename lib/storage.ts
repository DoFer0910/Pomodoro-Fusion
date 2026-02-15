import { type Session, type Settings, DEFAULT_SETTINGS } from "./types"

const SESSIONS_KEY = "pomodoro-sessions"
const SETTINGS_KEY = "pomodoro-settings"

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

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const data = localStorage.getItem(SETTINGS_KEY)
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
const PROJECTS_KEY = "pomodoro-projects"

export function getProjects(): import("./types").Project[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(PROJECTS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveProjects(projects: import("./types").Project[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export function addProject(project: import("./types").Project): void {
  const projects = getProjects()
  projects.push(project)
  saveProjects(projects)
}

export function updateProject(project: import("./types").Project): void {
  const projects = getProjects()
  const index = projects.findIndex((p) => p.id === project.id)
  if (index !== -1) {
    projects[index] = project
    saveProjects(projects)
  }
}

export function deleteProject(id: string): void {
  const projects = getProjects()
  const filtered = projects.filter((p) => p.id !== id)
  saveProjects(filtered)
}
