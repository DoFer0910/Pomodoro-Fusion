import { type Session, type Settings, DEFAULT_SETTINGS, type Project, type Todo } from "./types"
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

// セッションは複数の操作（addSession / syncClaude / updateSession / deleteSessions /
// deleteProject）がいずれも「全件を読む → 加工 → 全件を上書き保存」する read-modify-write。
// これらが並行すると、片方が相手の保存前の古いスナップショットを起点に全件上書きし、
// 相手の変更を消してしまう（lost update）。特にタイマー完了の addSession と
// Claude Code 同期が重なると履歴が消える症状が出る。
// そこで read+modify+write を不可分な単位として 1 本のキューで直列化する。
let sessionWriteChain: Promise<unknown> = Promise.resolve()

/**
 * 現在のセッション全件を読み、mutator で次の状態を作り、保存する一連の処理を
 * 他のセッション書き込みと直列化して実行する。read と write の間に他の書き込みが
 * 割り込まないことを保証するため、lost update を防げる。
 * mutator が返した配列を保存し、その配列を呼び出し元へも返す（state 反映用）。
 */
export async function mutateSessions(
  mutator: (current: Session[]) => Session[] | Promise<Session[]>,
): Promise<Session[]> {
  const run = sessionWriteChain.then(async () => {
    const current = await getSessions()
    const next = await mutator(current)
    await saveSessions(next)
    return next
  })
  // チェーン自体は失敗を握りつぶして次の処理へ進ませ、結果（と例外）は呼び出し元へ返す。
  sessionWriteChain = run.catch(() => {})
  return run
}

export async function getTodos(): Promise<Todo[]> {
  const storage = getStorage()
  const data = await storage.get<Todo[]>(TODOS_KEY)
  return data || []
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  const storage = getStorage()
  await storage.set(TODOS_KEY, todos)
}

export async function addSession(session: Session): Promise<void> {
  await mutateSessions((current) => [session, ...current])
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
  // セッションの読み書きは他操作と直列化する（lost update 防止）。
  await mutateSessions((sessions) =>
    sessions.map((session) =>
      session.projectId === id ? { ...session, projectId: undefined } : session,
    ),
  )

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

