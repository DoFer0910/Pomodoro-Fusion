import { describe, it, expect } from "vitest"
import {
  computeActiveSeconds,
  normalizePath,
  matchProjectId,
  mergeClaudeSessions,
  getProjectRepoPaths,
  CLAUDE_IDLE_GAP_SECONDS,
  type ClaudeScanResult,
} from "./claude-sync"
import type { Project, Session } from "./types"

const MIN = 60 * 1000 // 1分（ミリ秒）

describe("computeActiveSeconds", () => {
  it("イベントが2件未満なら0を返す", () => {
    expect(computeActiveSeconds([])).toBe(0)
    expect(computeActiveSeconds([1000])).toBe(0)
  })

  it("ギャップが閾値未満の連続イベントは全区間を加算する", () => {
    // 0, 1分, 2分 → 連続2分
    const ts = [0, 1 * MIN, 2 * MIN]
    expect(computeActiveSeconds(ts)).toBe(120)
  })

  it("閾値以上のギャップは離席として除外する", () => {
    // 0→1分（加算60s）、1分→10分（9分=540s 開くため除外）、10分→11分（加算60s）
    const ts = [0, 1 * MIN, 10 * MIN, 11 * MIN]
    expect(computeActiveSeconds(ts)).toBe(120)
  })

  it("閾値ちょうど（5分）は除外する（境界）", () => {
    // gapMs = 300s。delta が gapMs 未満のときのみ加算する仕様なので 300s ちょうどは除外
    const ts = [0, CLAUDE_IDLE_GAP_SECONDS * 1000]
    expect(computeActiveSeconds(ts)).toBe(0)
  })

  it("閾値直前（4分59秒）は加算する（境界）", () => {
    const ts = [0, (CLAUDE_IDLE_GAP_SECONDS - 1) * 1000]
    expect(computeActiveSeconds(ts)).toBe(CLAUDE_IDLE_GAP_SECONDS - 1)
  })

  it("順不同で渡してもソートして計算する", () => {
    const ts = [2 * MIN, 0, 1 * MIN]
    expect(computeActiveSeconds(ts)).toBe(120)
  })
})

describe("normalizePath", () => {
  it("バックスラッシュ・大文字・末尾スラッシュを正規化する", () => {
    expect(normalizePath("D:\\Dev\\MyProject\\")).toBe("d:/dev/myproject")
    expect(normalizePath("D:/Dev/MyProject")).toBe("d:/dev/myproject")
  })

  it("異なる表記でも同一パスは一致する", () => {
    expect(normalizePath("d:\\Dev\\x")).toBe(normalizePath("D:/Dev/X/"))
  })
})

const makeProject = (id: string, repoPaths?: string[]): Project => ({
  id,
  name: id,
  hourlyRate: 3000,
  color: "#000",
  createdAt: 0,
  updatedAt: 0,
  repoPaths,
})

const makeResult = (overrides: Partial<ClaudeScanResult>): ClaudeScanResult => ({
  claudeSessionId: "sess-1",
  repoPath: "d:\\Dev\\x",
  startTimestamp: 1000,
  durationSeconds: 600,
  ...overrides,
})

describe("matchProjectId", () => {
  const projects = [makeProject("p1", ["D:/Dev/X"]), makeProject("p2")]

  it("正規化比較で repoPath が一致する Project の id を返す", () => {
    const r = makeResult({ repoPath: "d:\\Dev\\x" })
    expect(matchProjectId(r, projects)).toBe("p1")
  })

  it("repoPath が null のスキャン結果はマッチしない", () => {
    const r = makeResult({ repoPath: null })
    expect(matchProjectId(r, projects)).toBeUndefined()
  })

  it("一致する Project が無ければ undefined", () => {
    const r = makeResult({ repoPath: "d:\\Dev\\other" })
    expect(matchProjectId(r, projects)).toBeUndefined()
  })

  it("複数の repoPaths のいずれかに一致すればマッチする", () => {
    const multi = [makeProject("p1", ["D:/Dev/A", "D:/Dev/B", "D:/Dev/C"])]
    expect(matchProjectId(makeResult({ repoPath: "d:\\Dev\\a" }), multi)).toBe("p1")
    expect(matchProjectId(makeResult({ repoPath: "d:\\Dev\\b" }), multi)).toBe("p1")
    expect(matchProjectId(makeResult({ repoPath: "d:\\Dev\\c" }), multi)).toBe("p1")
    expect(matchProjectId(makeResult({ repoPath: "d:\\Dev\\d" }), multi)).toBeUndefined()
  })

  it("旧形式の repoPath（単一）にも後方互換でマッチする", () => {
    const legacy: Project = {
      id: "legacy",
      name: "legacy",
      hourlyRate: 3000,
      color: "#000",
      createdAt: 0,
      updatedAt: 0,
      repoPath: "D:/Dev/Legacy", // 旧フィールドのみ
    }
    expect(matchProjectId(makeResult({ repoPath: "d:\\Dev\\legacy" }), [legacy])).toBe("legacy")
  })
})

describe("getProjectRepoPaths", () => {
  it("repoPaths と旧 repoPath を正規化して統合する", () => {
    const p: Project = {
      id: "p",
      name: "p",
      hourlyRate: 0,
      color: "#000",
      createdAt: 0,
      updatedAt: 0,
      repoPaths: ["D:/Dev/A", "  ", "D:\\Dev\\B"],
      repoPath: "D:/Dev/C",
    }
    expect(getProjectRepoPaths(p)).toEqual(["d:/dev/a", "d:/dev/b", "d:/dev/c"])
  })

  it("repoPaths と旧 repoPath が同一パスを指す場合は重複を除く", () => {
    const p: Project = {
      id: "p",
      name: "p",
      hourlyRate: 0,
      color: "#000",
      createdAt: 0,
      updatedAt: 0,
      repoPaths: ["D:/Dev/X"],
      repoPath: "d:\\Dev\\X",
    }
    expect(getProjectRepoPaths(p)).toEqual(["d:/dev/x"])
  })

  it("パスが無ければ空配列", () => {
    expect(getProjectRepoPaths(makeProject("p"))).toEqual([])
  })
})

describe("mergeClaudeSessions", () => {
  const projects = [makeProject("p1", ["D:/Dev/X"])]

  it("マッチする新規セッションを claude-code / billable で追加する", () => {
    const results = [makeResult({ claudeSessionId: "s1", durationSeconds: 600 })]
    const { sessions, summary } = mergeClaudeSessions(results, projects, [])
    expect(summary).toEqual({ added: 1, updated: 0, unmatched: 0 })
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      source: "claude-code",
      claudeSessionId: "s1",
      isBillable: true,
      projectId: "p1",
      duration: 600,
      status: "completed",
    })
  })

  it("未登録リポジトリは unmatched に計上しスキップする", () => {
    const results = [makeResult({ repoPath: "d:\\Dev\\unknown" })]
    const { sessions, summary } = mergeClaudeSessions(results, projects, [])
    expect(summary.unmatched).toBe(1)
    expect(sessions).toHaveLength(0)
  })

  it("durationSeconds が 0 以下のセッションは記録しない", () => {
    const results = [makeResult({ durationSeconds: 0 })]
    const { sessions, summary } = mergeClaudeSessions(results, projects, [])
    expect(summary).toEqual({ added: 0, updated: 0, unmatched: 0 })
    expect(sessions).toHaveLength(0)
  })

  it("同じスキャン結果を2回適用しても重複しない（冪等）", () => {
    const results = [makeResult({ claudeSessionId: "s1", durationSeconds: 600 })]
    const first = mergeClaudeSessions(results, projects, [])
    const second = mergeClaudeSessions(results, projects, first.sessions)
    expect(second.sessions).toHaveLength(1)
    expect(second.summary).toEqual({ added: 0, updated: 1, unmatched: 0 })
  })

  it("既存 claude セッションの duration 変化を更新で反映する", () => {
    const existing: Session[] = [
      {
        id: "fixed-id",
        timestamp: 500,
        duration: 300,
        status: "completed",
        isBillable: true,
        projectId: "p1",
        source: "claude-code",
        claudeSessionId: "s1",
      },
    ]
    const results = [makeResult({ claudeSessionId: "s1", durationSeconds: 900, startTimestamp: 700 })]
    const { sessions, summary } = mergeClaudeSessions(results, projects, existing)
    expect(summary.updated).toBe(1)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe("fixed-id") // 既存 id を保持
    expect(sessions[0].duration).toBe(900)
    expect(sessions[0].timestamp).toBe(700)
  })

  it("既存のポモドーロセッションには影響しない", () => {
    const existing: Session[] = [
      {
        id: "pomo-1",
        timestamp: 100,
        duration: 1500,
        status: "completed",
        isBillable: true,
      },
    ]
    const results = [makeResult({ claudeSessionId: "s1" })]
    const { sessions } = mergeClaudeSessions(results, projects, existing)
    expect(sessions.find((s) => s.id === "pomo-1")).toBeDefined()
    expect(sessions).toHaveLength(2)
  })
})
