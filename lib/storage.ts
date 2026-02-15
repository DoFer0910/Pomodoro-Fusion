import { type Session, type Settings, DEFAULT_SETTINGS, type Project } from "./types"
import { getStorage } from "./storage/adapter"

const SESSIONS_KEY = "pomodoro-sessions"
const SETTINGS_KEY = "pomodoro-settings"
const PROJECTS_KEY = "pomodoro-projects"
const TODOS_KEY = "pomodoro-todos"

export async function getSessions(): Promise<Session[]> {
  const storage = getStorage()
  const data = await storage.get<Session[]>(SESSIONS_KEY)
  return data || []
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  const storage = getStorage()
  await storage.set(SESSIONS_KEY, sessions)
}

export async function addSession(session: Session): Promise<void> {
  const sessions = await getSessions()
  sessions.unshift(session)
  await saveSessions(sessions)
}

export async function getSettings(): Promise<Settings> {
  const storage = getStorage()
  const data = await storage.get<Settings>(SETTINGS_KEY)
  return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS
}

export async function saveSettings(settings: Settings): Promise<void> {
  const storage = getStorage()
  await storage.set(SETTINGS_KEY, settings)
}

export async function getProjects(): Promise<Project[]> {
  const storage = getStorage()
  const data = await storage.get<Project[]>(PROJECTS_KEY)
  return data || []
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const storage = getStorage()
  await storage.set(PROJECTS_KEY, projects)
}

export async function addProject(project: Project): Promise<void> {
  const projects = await getProjects()
  projects.push(project)
  await saveProjects(projects)
}

export async function updateProject(project: Project): Promise<void> {
  const projects = await getProjects()
  const index = projects.findIndex((p) => p.id === project.id)
  if (index !== -1) {
    projects[index] = project
    await saveProjects(projects)
  }
}

export async function deleteProject(id: string): Promise<void> {
  // 1. Anonymize sessions (unlink from project)
  const sessions = await getSessions()
  let sessionsChanged = false
  const updatedSessions = sessions.map(session => {
    if (session.projectId === id) {
      sessionsChanged = true
      return { ...session, projectId: undefined }
    }
    return session
  })

  if (sessionsChanged) {
    await saveSessions(updatedSessions)
  }

  // 2. Anonymize or delete todos linked to project?
  // Current requirement only mentioned sessions, but todos should probably be kept or deleted.
  // Reviewing implementation plan: "Update sessions where projectId === id to set projectId = undefined."
  // I will check if todos need similar treatment. The user request mentioned "Session History".
  // I'll stick to sessions for now as critical data.
  // Actually, let's also unlink todos to be safe, so they don't point to non-existent project.
  // But todo hook manages its own state usually. I need to check if todos are stored in a separate key.
  // Yes, use-todo.ts uses "pomodoro-todos".
  // I should probably expose getTodos/saveTodos in storage.ts or refactor use-todo.ts to use this file.
  // For now, I will just handle sessions as requested.

  // 3. Delete Project
  const projects = await getProjects()
  const filtered = projects.filter((p) => p.id !== id)
  await saveProjects(filtered)
}

// Helper for generic storage access if needed
export async function getStorageItem<T>(key: string): Promise<T | null> {
  const storage = getStorage()
  return storage.get<T>(key)
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  const storage = getStorage()
  await storage.set(key, value)
}

