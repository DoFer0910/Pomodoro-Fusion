import { type Project, type Session } from "./types"

/** Claude Code の各イベント間隔がこの秒数以上開いたら「離席」とみなし作業時間から除外する */
export const CLAUDE_IDLE_GAP_SECONDS = 300 // 5分

/**
 * main プロセス（electron/main.js の claude:scan-sessions）が返すスキャン結果。
 * 1 件 = Claude Code の 1 セッション（jsonl ファイル 1 つ）。
 */
export interface ClaudeScanResult {
  /** jsonl ファイル名から拡張子を除いた sessionId。冪等同期のキー */
  claudeSessionId: string
  /** このセッションが属する git リポジトリの絶対パス（取得できた場合） */
  repoPath: string | null
  /** セッション最初のイベントの timestamp（ミリ秒） */
  startTimestamp: number
  /** ギャップ除外後の累積作業秒数 */
  durationSeconds: number
}

export interface SyncSummary {
  /** 新規に追加した Claude Code セッション数 */
  added: number
  /** 既存を更新した数 */
  updated: number
  /** repoPath が登録 Project と一致せずスキップした数 */
  unmatched: number
}

export interface SyncOutcome {
  sessions: Session[]
  summary: SyncSummary
}

/**
 * パスを正規化して比較可能にする。
 * - 小文字化（Windows は大文字小文字を区別しない）
 * - バックスラッシュをスラッシュに統一
 * - 末尾のスラッシュを除去
 */
export function normalizePath(p: string): string {
  return p
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase()
}

/**
 * 昇順に並んだイベント timestamp（ミリ秒）の配列から、
 * ギャップ（CLAUDE_IDLE_GAP_SECONDS 以上の間隔）を除外した累積作業秒数を算出する。
 *
 * 例: [0, 60s, 120s, 600s, 660s] でギャップ閾値 300s の場合、
 *   0→60→120 は連続（120s 加算）、120→600 は 480s 開くため除外、
 *   600→660 は連続（60s 加算）。合計 180s。
 */
export function computeActiveSeconds(
  timestampsMs: number[],
  idleGapSeconds: number = CLAUDE_IDLE_GAP_SECONDS,
): number {
  if (timestampsMs.length < 2) return 0

  const sorted = [...timestampsMs].sort((a, b) => a - b)
  const gapMs = idleGapSeconds * 1000
  let activeMs = 0

  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i] - sorted[i - 1]
    if (delta > 0 && delta < gapMs) {
      activeMs += delta
    }
  }

  return Math.round(activeMs / 1000)
}

/**
 * Project に紐づくリポジトリパスを、新形式 repoPaths と旧形式 repoPath の
 * 両方からまとめて返す（後方互換）。空・重複は除いた正規化済みの集合。
 */
export function getProjectRepoPaths(project: Project): string[] {
  const raw = [...(project.repoPaths || []), ...(project.repoPath ? [project.repoPath] : [])]
  const normalized = raw
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => normalizePath(p))
  return Array.from(new Set(normalized))
}

/**
 * スキャン結果 1 件を、登録済み Project に正規化パスで照合して projectId を返す。
 * Project の repoPaths / repoPath のいずれかに一致すればマッチ。
 * パスを持たない Project、repoPath が null のスキャン結果はマッチしない。
 */
export function matchProjectId(
  result: ClaudeScanResult,
  projects: Project[],
): string | undefined {
  return matchProject(result, projects)?.projectId
}

export interface ProjectMatch {
  /** マッチした Project の id */
  projectId: string
  /** このリポジトリを収益（billable）として計上するか。未設定リポジトリは false（没頭モード） */
  isBillable: boolean
}

/**
 * スキャン結果を Project に照合し、projectId と収益区分（isBillable）を返す。
 * 区分は Project.repoBillableMap[正規化パス] を参照し、未設定なら没頭モード（false）。
 * matchProjectId と異なり、収益/没頭の判定まで含めて返す。
 */
export function matchProject(
  result: ClaudeScanResult,
  projects: Project[],
): ProjectMatch | undefined {
  if (!result.repoPath) return undefined
  const target = normalizePath(result.repoPath)
  const matched = projects.find((p) => getProjectRepoPaths(p).includes(target))
  if (!matched) return undefined
  // デフォルトは没頭モード。明示的に true のときだけ収益扱い。
  const isBillable = matched.repoBillableMap?.[target] === true
  return { projectId: matched.id, isBillable }
}

/**
 * スキャン結果を既存セッションへ冪等にマージする純粋関数。
 * - claudeSessionId で既存を探し、あれば duration / timestamp / projectId / isBillable を更新
 * - なければ新規 Session を追加（source: "claude-code"）
 * - isBillable はリポジトリの収益区分（repoBillableMap）に従う。未設定リポジトリは没頭（false）。
 *   既存セッションも再同期時に区分の変更を反映するため上書きする。
 * - 登録 Project に紐づかない結果（projectId 無し）はスキップして unmatched に計上
 *
 * window や electron に依存しないため、そのままユニットテストできる。
 */
export function mergeClaudeSessions(
  results: ClaudeScanResult[],
  projects: Project[],
  existingSessions: Session[],
): SyncOutcome {
  const sessions = [...existingSessions]
  const indexByClaudeId = new Map<string, number>()
  sessions.forEach((s, i) => {
    if (s.claudeSessionId) indexByClaudeId.set(s.claudeSessionId, i)
  })

  const summary: SyncSummary = { added: 0, updated: 0, unmatched: 0 }

  for (const result of results) {
    const match = matchProject(result, projects)
    if (!match) {
      summary.unmatched++
      continue
    }
    const { projectId, isBillable } = match
    if (result.durationSeconds <= 0) {
      // 作業時間 0 のセッション（イベント 1 件以下など）は記録しない
      continue
    }

    const existingIndex = indexByClaudeId.get(result.claudeSessionId)
    if (existingIndex !== undefined) {
      const prev = sessions[existingIndex]
      sessions[existingIndex] = {
        ...prev,
        duration: result.durationSeconds,
        timestamp: result.startTimestamp,
        projectId,
        // リポジトリ側の区分変更を既存セッションにも反映する
        isBillable,
      }
      summary.updated++
    } else {
      const newSession: Session = {
        id: crypto.randomUUID(),
        timestamp: result.startTimestamp,
        duration: result.durationSeconds,
        status: "completed",
        isBillable,
        projectId,
        source: "claude-code",
        claudeSessionId: result.claudeSessionId,
      }
      sessions.unshift(newSession)
      summary.added++
    }
  }

  return { sessions, summary }
}

/**
 * Electron main プロセスへ Claude Code ログのスキャンを依頼し、結果を返す。
 * window.electron.scanClaudeSessions が無い環境（ブラウザ）では空配列。
 * スキャン（IPC）とマージ（純粋関数）を分離しておくことで、呼び出し側は
 * 「スキャン結果を、保存直前の最新セッションへマージする」直列化が可能になる。
 */
export async function scanClaudeSessions(): Promise<ClaudeScanResult[]> {
  const electron = (typeof window !== "undefined" && (window as any).electron) || null
  if (!electron || typeof electron.scanClaudeSessions !== "function") {
    return []
  }
  const results: ClaudeScanResult[] = await electron.scanClaudeSessions()
  return results || []
}

/**
 * Electron main プロセスへスキャンを依頼し、結果を既存セッションへマージする。
 * window.electron.scanClaudeSessions が無い環境（ブラウザ）では何もしない。
 */
export async function syncClaudeSessions(
  projects: Project[],
  existingSessions: Session[],
): Promise<SyncOutcome> {
  const results = await scanClaudeSessions()
  if (results.length === 0) {
    return {
      sessions: existingSessions,
      summary: { added: 0, updated: 0, unmatched: 0 },
    }
  }
  return mergeClaudeSessions(results, projects, existingSessions)
}
