import { test, expect, _electron as electron, type ElectronApplication, type Page } from "@playwright/test"
import { mkdirSync, mkdtempSync, writeFileSync, appendFileSync, unlinkSync } from "node:fs"
import path from "node:path"

function stamp(offset: number) { return new Date(Date.now() + offset).toISOString() }
const repoPath = "D:/yield-fixture"

async function launch(outputDir: string): Promise<{ app: ElectronApplication; page: Page; root: string }> {
  mkdirSync(outputDir, { recursive: true })
  const root = mkdtempSync(path.join(outputDir, "electron-"))
  mkdirSync(path.join(root, "codex")); mkdirSync(path.join(root, "claude")); mkdirSync(path.join(root, "user-data"))
  writeFileSync(path.join(root, "initial.json"), JSON.stringify({
    "pomodoro-projects": [{ id: "p", name: "ZECT 開発案件", repoPaths: [repoPath], hourlyRate: 2500, color: "#22c55e", createdAt: 1, updatedAt: 1 }],
    "pomodoro-settings": { language: "ja", alarmSound: "none" },
  }))
  const app = await electron.launch({ args: [path.resolve("e2e/electron-fixture.cjs")], env: { ...process.env, YIELD_E2E_DIR: root, TZ: "Asia/Tokyo" } })
  const page = await app.firstWindow()
  await expect(page.getByRole("button", { name: "勤務開始", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "勤務記録", exact: true }).click()
  await expect(page.getByRole("button", { name: "AI履歴を再確認" })).toBeEnabled()
  return { app, page, root }
}

test("実ログ→Electron IPC→開始忘れ候補→本人確認→勤務記録へ追加し、無操作でも計測を続ける", async ({}, info) => {
  const { app, page, root } = await launch(info.outputDir)
  try {
    const file = path.join(root, "codex", "rollout-new.jsonl")
    writeFileSync(file, JSON.stringify({ type: "session_meta", payload: { cwd: repoPath, source: "cli" }, timestamp: stamp(-120000) }) + "\n" + JSON.stringify({ timestamp: stamp(-60000) }))
    await page.getByRole("button", { name: "AI履歴を再確認" }).click()
    await expect(page.getByRole("heading", { name: "勤務の開始忘れかもしれません" })).toBeVisible()
    await expect(page.getByTestId("daily-work-time")).toHaveText("0:00:00")
    await page.getByRole("button", { name: "この時刻から勤務開始" }).click()
    await expect(page.getByRole("button", { name: "勤務終了", exact: true })).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send("idle:detected", 300))
    expect(await app.evaluate(() => (globalThis as any).testStore.get("yield-attendance").records[0].end)).toBeNull()
    await page.getByRole("button", { name: "勤務終了", exact: true }).click()
    await page.getByRole("button", { name: "この日の記録を確定" }).click()
    await expect(page.getByRole("button", { name: "この日の記録を確定" })).toBeDisabled()
    const confirmed = await app.evaluate(() => (globalThis as any).testStore.get("yield-attendance"))
    expect(confirmed.records).toHaveLength(1)
    expect(confirmed.records[0].end - confirmed.records[0].start).toBeGreaterThanOrEqual(120000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: "test-results/work-records-ai.png" })
    await page.reload()
    await page.getByRole("button", { name: "勤務記録", exact: true }).click()
    await expect(page.getByRole("button", { name: "この日の記録を確定" })).toBeDisabled()
  } finally { await app.close() }
})

test("候補を勤務外にすると再読込後も保持し、保存失敗では入力を失わず再試行できる", async ({}, info) => {
  const { app, page, root } = await launch(info.outputDir)
  try {
    writeFileSync(path.join(root, "claude", "session-new.jsonl"), JSON.stringify({ cwd: repoPath, timestamp: stamp(-180000) }) + "\n" + JSON.stringify({ timestamp: stamp(-120000) }))
    await page.getByRole("button", { name: "AI履歴を再確認" }).click()
    await expect(page.getByRole("heading", { name: "勤務の開始忘れかもしれません" })).toBeVisible()
    await page.getByRole("region", { name: "勤務の開始忘れかもしれません" }).getByRole("button", { name: "勤務に含めない" }).click()
    await expect(page.getByText("記録・判断済み")).toBeVisible()
    await page.reload()
    await page.getByRole("button", { name: "勤務記録", exact: true }).click()
    await expect(page.getByText("記録・判断済み")).toBeVisible()
    await expect(page.getByRole("heading", { name: "勤務の開始忘れかもしれません" })).toHaveCount(0)
    await page.getByRole("button", { name: "勤務外の判断を取り消す" }).click()
    await expect(page.getByRole("button", { name: "時刻を確認して追加" })).toBeVisible()
    await page.getByRole("button", { name: "勤務に含めない", exact: true }).click()
    await expect(page.getByText("記録・判断済み")).toBeVisible()
    await page.getByRole("button", { name: "勤務・休憩を追加" }).click()
    writeFileSync(path.join(root, "fail-write"), "1")
    const input = await page.getByLabel("開始日時", { exact: true }).inputValue()
    await page.getByRole("button", { name: "保存", exact: true }).click()
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(/保存できませんでした/)
    await expect(page.getByLabel("開始日時", { exact: true })).toHaveValue(input)
    unlinkSync(path.join(root, "fail-write"))
    await page.getByRole("button", { name: "保存", exact: true }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByTestId("work-record")).toHaveCount(1)
  } finally { await app.close() }
})

test("スキャン失敗で前回の参考履歴を残し、実ログ修復後に再試行できる", async ({}, info) => {
  const { app, page, root } = await launch(info.outputDir)
  try {
    const file = path.join(root, "codex", "rollout-old.jsonl")
    writeFileSync(file, JSON.stringify({ type: "session_meta", payload: { cwd: repoPath, source: "cli" }, timestamp: stamp(-240000) }))
    await page.getByRole("button", { name: "AI履歴を再確認" }).click()
    await expect(page.getByTestId("ai-reference")).toHaveCount(1)
    // Replace the directory with a file so the real scanner rejects it (no mocked scanner results).
    const fs = await import("node:fs")
    for (const target of [path.join(root, "codex"), path.join(root, "codex-saved")]) {
      if (path.dirname(path.resolve(target)) !== path.resolve(root)) throw new Error("Unexpected test move path")
    }
    fs.renameSync(path.join(root, "codex"), path.join(root, "codex-saved"))
    writeFileSync(path.join(root, "codex"), "not a directory")
    await page.getByRole("button", { name: "AI履歴を再確認" }).click()
    await expect(page.getByText(/AI履歴の取得に失敗しました/)).toBeVisible()
    await expect(page.getByTestId("ai-reference")).toHaveCount(1)
    unlinkSync(path.join(root, "codex"))
    fs.renameSync(path.join(root, "codex-saved"), path.join(root, "codex"))
    appendFileSync(file, "\n" + JSON.stringify({ timestamp: stamp(-180000) }))
    await page.getByRole("button", { name: "AI履歴を再確認" }).click()
    await expect(page.getByText(/AI履歴の取得に失敗しました/)).toHaveCount(0)
  } finally { await app.close() }
})
