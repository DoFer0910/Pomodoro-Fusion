import { describe, expect, it } from "vitest"
import { createRequire } from "node:module"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
const require = createRequire(import.meta.url)
const { scanAgentDirectory, parseAgentContent, scanAgentDirectoryAsync, shutdownAgentScanner } = require("../electron/agent-scanner.cjs")
function cleanup(dir: string) {
  if (resolve(dirname(dir)) !== resolve(tmpdir()) || !dir.startsWith(join(tmpdir(), "yield-"))) throw new Error("Unexpected cleanup path")
  rmSync(dir, { recursive: true, force: true })
}

describe("実際のAIログファイルのスキャン", () => {
  it("実ファイルを読み、ギャップを潰さず区間を返し、追記後にキャッシュを更新する", () => {
    const dir = mkdtempSync(join(tmpdir(), "yield-scan-"))
    try {
      mkdirSync(join(dir, "2026"))
      const file = join(dir, "2026", "rollout-ai.jsonl")
      const meta = { type: "session_meta", payload: { cwd: "D:\\repo", source: "cli" }, timestamp: "2026-10-10T09:00:00Z" }
      let content = [meta, { timestamp: "2026-10-10T09:01:00Z" }, { timestamp: "2026-10-10T10:00:00Z" }].map(e => JSON.stringify(e)).join("\n")
      writeFileSync(file, content)
      let result = scanAgentDirectory(dir, "codex")[0]
      expect(result.durationSeconds).toBe(60)
      expect(result.activityIntervals).toHaveLength(2)
      expect(result.lastTimestamp).toBe(Date.parse("2026-10-10T10:00:00Z"))
      content += '\n{"timestamp":"2026-10-10T10:01:00Z"}\n{"timestamp":'
      writeFileSync(file, content)
      result = scanAgentDirectory(dir, "codex")[0]
      expect(result.durationSeconds).toBe(120)
      expect(result.activityIntervals[1].end).toBe(Date.parse("2026-10-10T10:01:00Z"))
      expect(result.repoPath).toBe("D:\\repo")
    } finally { cleanup(dir) }
  })

  it("単一イベントを返し、サブエージェントは除く", () => {
    const event = { type: "session_meta", payload: { cwd: "D:/repo", source: "cli" }, timestamp: "2026-10-10T09:00:00Z" }
    expect(parseAgentContent(JSON.stringify(event), "codex", "one").durationSeconds).toBe(0)
    expect(parseAgentContent(JSON.stringify({ ...event, payload: { ...event.payload, source: { subagent: {} } } }), "codex", "child")).toBeNull()
  })

  it("未インストールと、読めないスキャン対象を区別する", () => {
    const dir = mkdtempSync(join(tmpdir(), "yield-error-"))
    try {
      expect(scanAgentDirectory(join(dir, "absent"), "codex")).toEqual([])
      const file = join(dir, "not-directory")
      writeFileSync(file, "x")
      expect(() => scanAgentDirectory(file, "codex")).toThrow()
    } finally { cleanup(dir) }
  })

  it("非同期ワーカーから実区間を返し、読取り失敗を呼出し元へ伝える", async () => {
    const dir = mkdtempSync(join(tmpdir(), "yield-worker-"))
    try {
      const file = join(dir, "session.jsonl")
      writeFileSync(file, '{"cwd":"D:/repo","timestamp":"2026-10-10T09:00:00Z"}')
      expect(await scanAgentDirectoryAsync(dir, "claude-code")).toHaveLength(1)
      await expect(scanAgentDirectoryAsync(file, "claude-code")).rejects.toThrow()
    } finally { shutdownAgentScanner(); cleanup(dir) }
  })
})
