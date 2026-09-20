import { type Project, type Session } from "./types"
import { matchProject, type SyncOutcome, type SyncSummary } from "./claude-sync"

/**
 * Codex の各イベント間隔がこの秒数以上開いたら「離席」とみなし作業時間から除外する。
 * Claude Code 側（CLAUDE_IDLE_GAP_SECONDS）と同じ 5 分。
 * 別定数にしているのは、将来どちらか片方だけ閾値を変えたくなったときに
 * もう一方へ意図せず影響させないため。
 */
export const CODEX_IDLE_GAP_SECONDS = 300 // 5分

/**
 * main プロセス（electron/main.js の codex:scan-sessions）が返すスキャン結果。
 * 1 件 = Codex の 1 セッション（rollout-*.jsonl ファイル 1 つ）。
 */
export interface CodexScanResult {
  /** rollout ファイル名から拡張子を除いたもの。冪等同期のキー */
  codexSessionId: string
  /** このセッションが属する作業ディレクトリの絶対パス（取得できた場合） */
  repoPath: string | null
  /** セッション最初のイベントの timestamp（ミリ秒） */
  startTimestamp: number
  /** ギャップ除外後の累積作業秒数 */
  durationSeconds: number
}

/**
 * スキャン結果を既存セッションへ冪等にマージする純粋関数。
 * mergeClaudeSessions と同じ方針だが、冪等キーが codexSessionId で
 * source が "codex" になる点が異なる。
 * - codexSessionId で既存を探し、あれば duration / timestamp / projectId / isBillable を更新
 * - なければ新規 Session を追加（source: "codex"）
 * - isBillable はリポジトリの収益区分（repoBillableMap）に従う。未設定リポジトリは没頭（false）。
 * - 登録 Project に紐づかない結果（projectId 無し）はスキップして unmatched に計上
 *
 * window や electron に依存しないため、そのままユニットテストできる。
 */
export function mergeCodexSessions(
  results: CodexScanResult[],
  projects: Project[],
  existingSessions: Session[],
): SyncOutcome {
  const sessions = [...existingSessions]
  const indexByCodexId = new Map<string, number>()
  sessions.forEach((s, i) => {
    if (s.codexSessionId) indexByCodexId.set(s.codexSessionId, i)
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

    const existingIndex = indexByCodexId.get(result.codexSessionId)
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
        source: "codex",
        codexSessionId: result.codexSessionId,
      }
      sessions.unshift(newSession)
      summary.added++
    }
  }

  return { sessions, summary }
}

/**
 * Electron main プロセスへ Codex ログのスキャンを依頼し、結果を返す。
 * window.electron.scanCodexSessions が無い環境（ブラウザ、および
 * この機能より前のバージョンの Electron 本体）では空配列。
 * スキャン（IPC）とマージ（純粋関数）を分離しておくことで、呼び出し側は
 * 「スキャン結果を、保存直前の最新セッションへマージする」直列化が可能になる。
 */
export async function scanCodexSessions(): Promise<CodexScanResult[]> {
  const electron = (typeof window !== "undefined" && (window as any).electron) || null
  if (!electron || typeof electron.scanCodexSessions !== "function") {
    return []
  }
  const results: CodexScanResult[] = await electron.scanCodexSessions()
  return results || []
}
