import { test, expect, _electron as electron } from "@playwright/test"
import { createServer } from "node:http"
import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs"
import path from "node:path"
const version: string = JSON.parse(readFileSync(path.resolve("package.json"), "utf8")).version
const versionParts = version.split(".").map(Number)
const updateVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`
function writeAppManifest(root: string) {
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "yield-update-e2e", version, main: path.resolve("e2e/electron-fixture.cjs") }))
}

test("Webではデスクトップの更新操作を表示しない", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "設定", exact: true }).click()
  await expect(page.getByText("アプリの更新", { exact: true })).toHaveCount(0)
})

test("Electron開発起動ではバージョンを表示して更新を無効にする", async ({}, info) => {
  mkdirSync(info.outputDir, { recursive: true })
  const root = mkdtempSync(path.join(info.outputDir, "electron-"))
  writeAppManifest(root)
  writeFileSync(path.join(root, "initial.json"), JSON.stringify({ "pomodoro-settings": { language: "ja" } }))
  const app = await electron.launch({ args: [root], env: { ...process.env, YIELD_E2E_DIR: root } })
  try {
    const page = await app.firstWindow()
    await page.getByRole("button", { name: "設定", exact: true }).click()
    await expect(page.getByText("開発起動では自動更新しません。", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "更新を確認", exact: true })).toHaveCount(0)
  } finally { await app.close() }
})

test("実際の更新ライブラリで取得・適用開始の失敗を再試行し、タイマーを守ってボタンから再起動する", async ({}, info) => {
  test.setTimeout(60_000)
  mkdirSync(info.outputDir, { recursive: true })
  const root = mkdtempSync(path.join(info.outputDir, "electron-"))
  writeAppManifest(root)
  const original = { "pomodoro-settings": { language: "ja" }, "yield-license-key": "preserve-key", "pomodoro-sessions": [] }
  writeFileSync(path.join(root, "initial.json"), JSON.stringify(original))
  // NSIS実行は別の配布物確認で扱う。ここでは更新サービスのHTTP取得・SHA検証を保証する。
  const payload = Buffer.from("Yield update download fixture\n")
  const checksum = createHash("sha512").update(payload).digest("base64")
  let mode: "offline" | "corrupt" | "ready" = "offline"
  let downloads = 0
  const server = createServer((request, response) => {
    if (mode === "offline") { response.writeHead(503); response.end("unavailable"); return }
    if (request.url?.startsWith("/latest.yml")) {
      response.setHeader("Content-Type", "text/yaml")
      response.end(`version: ${updateVersion}\nfiles:\n  - url: Yield-Test.exe\n    sha512: ${checksum}\n    size: ${payload.length}\npath: Yield-Test.exe\nsha512: ${checksum}\nreleaseDate: '2026-10-12T00:00:00.000Z'\n`)
    } else if (request.url?.startsWith("/Yield-Test.exe")) {
      downloads++
      response.end(mode === "corrupt" ? Buffer.from("corrupt") : payload)
    } else { response.writeHead(404); response.end() }
  })
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  const port = (server.address() as { port: number }).port
  let app: Awaited<ReturnType<typeof electron.launch>> | undefined
  let updateLogs = ""
  try {
    app = await electron.launch({ args: [root], env: { ...process.env, YIELD_E2E_DIR: root, YIELD_E2E_RESTART: '1', YIELD_E2E_UPDATE_URL: `http://127.0.0.1:${port}` } })
    app.process().stdout?.on("data", chunk => { updateLogs += chunk.toString() })
    app.process().stderr?.on("data", chunk => { updateLogs += chunk.toString() })
    const page = await app.firstWindow()
    await page.getByRole("button", { name: "没頭", exact: true }).click()
    await page.getByRole("button", { name: "スタート", exact: true }).click()
    await page.getByRole("button", { name: "設定", exact: true }).click()
    const check = page.getByRole("button", { name: "更新を確認", exact: true })
    const restart = page.getByRole("button", { name: "再起動して更新", exact: true })
    await expect(restart).toHaveCount(0)
    await check.click()
    await expect(page.getByText("更新できませんでした。接続を確認して「更新を確認」で再試行してください。", { exact: true })).toBeVisible()
    mode = "corrupt"
    await check.click()
    await expect.poll(() => downloads, { message: "更新取得が始まらない場合は添付のElectronログを確認" }).toBe(1)
    await expect.poll(async () => app!.evaluate(() => (globalThis as any).testUpdates.getStatus().status)).toBe("error")
    expect(downloads).toBe(1)
    mode = "ready"
    await check.click()
    await expect(page.getByText("更新の準備ができました。アプリ終了時に適用します。", { exact: true })).toBeVisible()
    await expect(check).toBeDisabled()
    await expect(restart).toBeDisabled()
    await expect(page.getByText("タイマー動作中は再起動できません。計測の区切りで更新してください。", { exact: true })).toBeVisible()
    // UIだけでなく、計測中のIPC要求もメイン側で拒否する。
    expect((await page.evaluate(() => (window as any).electron.restartForUpdate())).status).toBe('downloaded')
    expect(existsSync(path.join(root, 'install-request.json'))).toBe(false)
    expect(downloads).toBe(2)
    const cachedPath = await app.evaluate(() => (globalThis as any).testUpdates.getStatus())
    expect(cachedPath.updateVersion).toBe(updateVersion)
    expect(readFileSync(path.join(root, "update-cache", "e2e-updates", "pending", "Yield-Test.exe"))).toEqual(payload)
    for (const [key, value] of Object.entries(original)) {
      expect(await app.evaluate((_electron, key) => (globalThis as any).testStore.get(key), key)).toEqual(value)
    }
    await page.locator('[data-slot="card"]').filter({ hasText: "アプリの更新" }).screenshot({ path: info.outputPath("update-ready.png") })
    await page.getByRole("button", { name: "タイマー", exact: true }).click()
    await expect(page.getByRole("button", { name: "一時停止", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "一時停止", exact: true }).click()
    await page.getByRole("button", { name: "設定", exact: true }).click()
    await expect(restart).toBeEnabled()
    await expect(page.getByText("再起動後にアプリが自動で開きます。一時停止中のタイマーはリセットされます。", { exact: true })).toBeVisible()
    await page.locator('[data-slot="card"]').filter({ hasText: "アプリの更新" }).screenshot({ path: info.outputPath("restart-update-ready.png") })
    writeFileSync(path.join(root, 'fail-install'), '')
    await restart.click()
    await expect(page.getByText("更新できませんでした。接続を確認して「更新を確認」で再試行してください。", { exact: true })).toBeVisible()
    expect(existsSync(path.join(root, 'install-request.json'))).toBe(false)
    unlinkSync(path.join(root, 'fail-install'))
    await check.click()
    await expect(restart).toBeEnabled()
    const closed = app.waitForEvent('close')
    await restart.click()
    await closed
    expect(JSON.parse(readFileSync(path.join(root, 'install-request.json'), 'utf8'))).toMatchObject({ isSilent: true, isForceRunAfter: true })
    await expect.poll(() => existsSync(path.join(root, 'restarted.json'))).toBe(true)
    const reopened = JSON.parse(readFileSync(path.join(root, 'restarted.json'), 'utf8'))
    for (const [key, value] of Object.entries(original)) expect(reopened.data[key]).toEqual(value)
    app = undefined
  } finally {
    await info.attach("Electron更新ログ", { body: updateLogs, contentType: "text/plain" })
    await app?.close()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
