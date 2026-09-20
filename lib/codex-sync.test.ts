import { describe, it, expect } from "vitest"
import { mergeCodexSessions, type CodexScanResult } from "./codex-sync"
import { mergeAgentSessions } from "./agent-sync"
import { resolveSessionOverlaps } from "./session-overlap"
import type { ClaudeScanResult } from "./claude-sync"
import type { Project, Session } from "./types"

const MIN = 60 * 1000 // 1分（ミリ秒）

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Project 1",
    hourlyRate: 3000,
    color: "#000000",
    createdAt: 0,
    updatedAt: 0,
    repoPaths: ["D:\\Dev\\sample"],
    ...overrides,
  }
}

function codexResult(overrides: Partial<CodexScanResult> = {}): CodexScanResult {
  return {
    codexSessionId: "rollout-2026-09-20T18-30-12-abc",
    repoPath: "D:\\Dev\\sample",
    startTimestamp: 1_000_000,
    durationSeconds: 600,
    ...overrides,
  }
}

describe("mergeCodexSessions", () => {
  it("登録リポジトリに一致する結果を source: codex の新規セッションとして追加する", () => {
    const { sessions, summary } = mergeCodexSessions([codexResult()], [project()], [])

    expect(summary).toEqual({ added: 1, updated: 0, unmatched: 0 })
    expect(sessions).toHaveLength(1)
    expect(sessions[0].source).toBe("codex")
    expect(sessions[0].codexSessionId).toBe("rollout-2026-09-20T18-30-12-abc")
    expect(sessions[0].projectId).toBe("p1")
    expect(sessions[0].duration).toBe(600)
  })

  it("パス区切りと大文字小文字が違っても同じリポジトリとして照合する", () => {
    const results = [codexResult({ repoPath: "d:/dev/SAMPLE/" })]
    const { summary } = mergeCodexSessions(results, [project()], [])

    expect(summary.added).toBe(1)
    expect(summary.unmatched).toBe(0)
  })

  it("未登録リポジトリは取り込まず unmatched に計上する", () => {
    const results = [codexResult({ repoPath: "D:\\Dev\\other" })]
    const { sessions, summary } = mergeCodexSessions(results, [project()], [])

    expect(summary).toEqual({ added: 0, updated: 0, unmatched: 1 })
    expect(sessions).toHaveLength(0)
  })

  it("repoPath が無い結果は unmatched に計上する", () => {
    const { summary } = mergeCodexSessions([codexResult({ repoPath: null })], [project()], [])
    expect(summary.unmatched).toBe(1)
  })

  it("同じ codexSessionId を再同期しても重複追加せず更新する（冪等）", () => {
    const first = mergeCodexSessions([codexResult()], [project()], [])
    // セッションが伸びた状態で再スキャンした想定
    const second = mergeCodexSessions(
      [codexResult({ durationSeconds: 900 })],
      [project()],
      first.sessions,
    )

    expect(second.summary).toEqual({ added: 0, updated: 1, unmatched: 0 })
    expect(second.sessions).toHaveLength(1)
    expect(second.sessions[0].duration).toBe(900)
    // id は既存のものを維持する（履歴側の参照が切れないように）
    expect(second.sessions[0].id).toBe(first.sessions[0].id)
  })

  it("作業時間 0 秒のセッションは記録しない", () => {
    const { sessions, summary } = mergeCodexSessions(
      [codexResult({ durationSeconds: 0 })],
      [project()],
      [],
    )

    expect(sessions).toHaveLength(0)
    expect(summary).toEqual({ added: 0, updated: 0, unmatched: 0 })
  })

  it("repoBillableMap で収益指定されたリポジトリは isBillable: true になる", () => {
    const p = project({ repoBillableMap: { "d:/dev/sample": true } })
    const { sessions } = mergeCodexSessions([codexResult()], [p], [])

    expect(sessions[0].isBillable).toBe(true)
  })

  it("repoBillableMap 未設定のリポジトリは没頭モード（isBillable: false）になる", () => {
    const { sessions } = mergeCodexSessions([codexResult()], [project()], [])
    expect(sessions[0].isBillable).toBe(false)
  })

  it("再同期時にリポジトリの収益区分の変更を既存セッションへ反映する", () => {
    const first = mergeCodexSessions([codexResult()], [project()], [])
    expect(first.sessions[0].isBillable).toBe(false)

    const p = project({ repoBillableMap: { "d:/dev/sample": true } })
    const second = mergeCodexSessions([codexResult()], [p], first.sessions)

    expect(second.sessions[0].isBillable).toBe(true)
  })

  it("claudeSessionId しか持たない既存セッションを Codex 側が上書きしない", () => {
    // 冪等キーが別系統であることの確認。
    // 同じ ID 文字列が両方に現れても、互いのセッションを取り違えてはいけない。
    const existing: Session[] = [
      {
        id: "s1",
        timestamp: 500,
        duration: 300,
        status: "completed",
        isBillable: false,
        projectId: "p1",
        source: "claude-code",
        claudeSessionId: "rollout-2026-09-20T18-30-12-abc",
      },
    ]

    const { sessions, summary } = mergeCodexSessions([codexResult()], [project()], existing)

    expect(summary.added).toBe(1)
    expect(sessions).toHaveLength(2)
    // 既存の Claude セッションは無傷
    const claude = sessions.find((s) => s.source === "claude-code")
    expect(claude?.duration).toBe(300)
  })
})

describe("mergeAgentSessions", () => {
  const claudeResult: ClaudeScanResult = {
    claudeSessionId: "claude-1",
    repoPath: "D:\\Dev\\sample",
    startTimestamp: 2_000_000,
    durationSeconds: 300,
  }

  it("Claude Code と Codex の結果を 1 回でマージし、合計と内訳を返す", () => {
    const { sessions, summary } = mergeAgentSessions(
      [claudeResult],
      [codexResult()],
      [project()],
      [],
    )

    expect(sessions).toHaveLength(2)
    expect(summary.added).toBe(2)
    expect(summary.claude).toEqual({ added: 1, updated: 0, unmatched: 0 })
    expect(summary.codex).toEqual({ added: 1, updated: 0, unmatched: 0 })
  })

  it("未マッチ件数は両方を合算する", () => {
    const { summary } = mergeAgentSessions(
      [{ ...claudeResult, repoPath: "D:\\Dev\\other" }],
      [codexResult({ repoPath: null })],
      [project()],
      [],
    )

    expect(summary.unmatched).toBe(2)
    expect(summary.added).toBe(0)
  })

  it("片方だけ実績があっても、もう片方の内訳は 0 のまま壊れない", () => {
    const { summary } = mergeAgentSessions([], [codexResult()], [project()], [])

    expect(summary.added).toBe(1)
    expect(summary.claude).toEqual({ added: 0, updated: 0, unmatched: 0 })
    expect(summary.codex.added).toBe(1)
  })

  it("両方を再同期しても重複せず、それぞれが更新扱いになる", () => {
    const first = mergeAgentSessions([claudeResult], [codexResult()], [project()], [])
    const second = mergeAgentSessions(
      [claudeResult],
      [codexResult()],
      [project()],
      first.sessions,
    )

    expect(second.sessions).toHaveLength(2)
    expect(second.summary.added).toBe(0)
    expect(second.summary.updated).toBe(2)
  })
})

describe("resolveSessionOverlaps との組み合わせ", () => {
  it("Codex セッションと重なるポモドーロ時間が相殺される", () => {
    const sessions: Session[] = [
      {
        id: "codex-1",
        timestamp: 0,
        duration: 10 * 60, // 0分〜10分
        status: "completed",
        isBillable: false,
        source: "codex",
        codexSessionId: "c1",
      },
      {
        id: "pomo-1",
        timestamp: 5 * MIN, // 5分〜15分（前半5分が重なる）
        duration: 10 * 60,
        status: "completed",
        isBillable: false,
      },
    ]

    const resolved = resolveSessionOverlaps(sessions)
    const pomo = resolved.find((s) => s.id === "pomo-1")

    // 10分のうち重なった5分を差し引いて5分になる
    expect(pomo?.duration).toBe(5 * 60)
  })

  it("Claude と Codex が同時稼働していても、ポモドーロから重複して差し引かない", () => {
    // 両方が同じ 0〜10 分を記録している場合、差し引く区間は 10 分であって 20 分ではない。
    // 20 分引かれると、実際には作業していたポモドーロ時間まで消えてしまう。
    const sessions: Session[] = [
      {
        id: "claude-1",
        timestamp: 0,
        duration: 10 * 60,
        status: "completed",
        isBillable: false,
        source: "claude-code",
        claudeSessionId: "c1",
      },
      {
        id: "codex-1",
        timestamp: 0,
        duration: 10 * 60,
        status: "completed",
        isBillable: false,
        source: "codex",
        codexSessionId: "x1",
      },
      {
        id: "pomo-1",
        timestamp: 0,
        duration: 20 * 60, // 0分〜20分
        status: "completed",
        isBillable: false,
      },
    ]

    const resolved = resolveSessionOverlaps(sessions)
    const pomo = resolved.find((s) => s.id === "pomo-1")

    expect(pomo?.duration).toBe(10 * 60)
  })
})
