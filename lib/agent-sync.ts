import { type Project, type Session } from "./types"
import {
  mergeClaudeSessions,
  scanClaudeSessions,
  type ClaudeScanResult,
  type SyncSummary,
} from "./claude-sync"
import { mergeCodexSessions, scanCodexSessions, type CodexScanResult } from "./codex-sync"

/**
 * AI エージェント（Claude Code / Codex）の同期結果。
 * added / updated / unmatched は両方を足した合計で、
 * 記録元ごとの内訳は claude / codex に入る。
 * 合計をトップレベルに置くことで、内訳を使わない呼び出し側は
 * これまでどおり summary.added だけを見れば済む。
 */
export interface AgentSyncSummary extends SyncSummary {
  claude: SyncSummary
  codex: SyncSummary
}

export interface AgentSyncOutcome {
  sessions: Session[]
  summary: AgentSyncSummary
}

export const EMPTY_AGENT_SUMMARY: AgentSyncSummary = {
  added: 0,
  updated: 0,
  unmatched: 0,
  claude: { added: 0, updated: 0, unmatched: 0 },
  codex: { added: 0, updated: 0, unmatched: 0 },
}

/**
 * Claude Code と Codex のスキャン結果を、まとめて既存セッションへマージする純粋関数。
 *
 * Claude を先に、その結果へ続けて Codex をマージする。それぞれ冪等キーが
 * claudeSessionId / codexSessionId で独立しているため、順序は結果に影響しない。
 * 1 回の呼び出しでまとめてマージするのは、保存（mutateSessions）を 1 回で済ませ、
 * 途中状態が永続化されないようにするため。
 *
 * 注意: 同じ時間帯に Claude Code と Codex を並行稼働させていた場合、
 * どちらの稼働時間も独立したセッションとして記録される。タイマー計測との
 * 二重計上は lib/session-overlap.ts が相殺するが、AI 同士の重なりは
 * 「それぞれが実際に動いていた時間」として残す。
 */
export function mergeAgentSessions(
  claudeResults: ClaudeScanResult[],
  codexResults: CodexScanResult[],
  projects: Project[],
  existingSessions: Session[],
): AgentSyncOutcome {
  const claudeOutcome = mergeClaudeSessions(claudeResults, projects, existingSessions)
  const codexOutcome = mergeCodexSessions(codexResults, projects, claudeOutcome.sessions)

  return {
    sessions: codexOutcome.sessions,
    summary: {
      added: claudeOutcome.summary.added + codexOutcome.summary.added,
      updated: claudeOutcome.summary.updated + codexOutcome.summary.updated,
      unmatched: claudeOutcome.summary.unmatched + codexOutcome.summary.unmatched,
      claude: claudeOutcome.summary,
      codex: codexOutcome.summary,
    },
  }
}

/**
 * Electron main プロセスへ両方のログスキャンを依頼する。
 * 片方が失敗しても、もう片方の結果は取り込めるようにする
 * （例: Codex 未インストールでハンドラが落ちても Claude Code は同期される）。
 */
export async function scanAgentSessions(): Promise<{
  claude: ClaudeScanResult[]
  codex: CodexScanResult[]
}> {
  const [claude, codex] = await Promise.all([
    scanClaudeSessions().catch((err) => {
      console.error("[scanAgentSessions] Claude Code scan failed:", err)
      return [] as ClaudeScanResult[]
    }),
    scanCodexSessions().catch((err) => {
      console.error("[scanAgentSessions] Codex scan failed:", err)
      return [] as CodexScanResult[]
    }),
  ])
  return { claude, codex }
}
