import { test, expect, _electron as electron } from "@playwright/test"
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs"
import path from "node:path"
const require = createRequire(path.resolve("package.json"))

test("本人用ProはPrismでGitHub契約を検証し、非公開ビルドを一度だけ依頼して完成後に認証付きで取得する", async ({}, info) => {
  test.setTimeout(90_000)
  mkdirSync(info.outputDir, { recursive: true })
  const root = mkdtempSync(path.join(info.outputDir, "private-update-"))
  const version: string = JSON.parse(readFileSync("package.json", "utf8")).version
  const parts = version.split(".").map(Number), nextVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "yield-private-e2e", version, main: path.resolve("e2e/electron-fixture.cjs") }))
  writeFileSync(path.join(root, "initial.json"), JSON.stringify({ "pomodoro-settings": { language: "ja" }, "yield-license-key": "preserve-private-key" }))
  writeFileSync(path.join(root, "github-phase"), "public-target")
  const payload = Buffer.from("Private Pro update fixture\n"), hash = createHash("sha512").update(payload).digest("base64")
  const credentials: string[] = []
  const files = createServer((request, response) => {
    credentials.push(String(request.headers.authorization))
    if (request.url === "/latest.yml") response.end(`version: ${nextVersion}\nfiles:\n  - url: Yield-Test.exe\n    sha512: ${hash}\n    size: ${payload.length}\npath: Yield-Test.exe\nsha512: ${hash}\nreleaseDate: '2026-10-12T00:00:00Z'\n`)
    else if (request.url === "/Yield-Test.exe") response.end(payload)
    else { response.writeHead(404); response.end() }
  })
  await new Promise<void>(resolve => files.listen(0, "127.0.0.1", resolve))
  const filesURL = `http://127.0.0.1:${(files.address() as { port: number }).port}`
  const reservation = createServer()
  await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve))
  const prismPort = (reservation.address() as { port: number }).port
  await new Promise<void>(resolve => reservation.close(() => resolve()))
  const githubURL = `http://127.0.0.1:${prismPort}`
  const { githubUpdatesContract } = require("./e2e/github-updates-contract.cjs")
  const contract = JSON.stringify(githubUpdatesContract({ version, nextVersion, filesURL }))
  const contractPath = path.join(root, "github.openapi.json")
  writeFileSync(contractPath, contract)
  const prism = spawn(process.execPath, [require.resolve("@stoplight/prism-cli/dist/index.js"), "mock", contractPath, "--errors", "--host", "127.0.0.1", "--port", String(prismPort)], { windowsHide: true })
  let prismLogs = ""
  prism.stdout.on("data", chunk => { prismLogs += chunk.toString() })
  prism.stderr.on("data", chunk => { prismLogs += chunk.toString() })
  let app: Awaited<ReturnType<typeof electron.launch>> | undefined
  try {
    await expect.poll(async () => { try { return (await fetch(`${githubURL}/repos/personal/yield`)).status } catch { return 0 } }, { timeout: 20_000 }).toBe(200)
    app = await electron.launch({ args: [root], env: { ...process.env,
      GH_TOKEN: "gho_NOT_A_REAL_TEST_TOKEN", YIELD_E2E_DIR: root, YIELD_E2E_UPDATE_URL: filesURL, YIELD_E2E_GITHUB_URL: githubURL,
    } })
    const page = await app.firstWindow()
    await page.getByRole("button", { name: "設定", exact: true }).click()
    const check = page.getByRole("button", { name: "更新を確認", exact: true })
    await check.click()
    await expect(page.getByText("更新できませんでした。接続を確認して「更新を確認」で再試行してください。", { exact: true })).toBeVisible()
    const requests = () => readFileSync(path.join(root, "github-requests"), "utf8").trim().split("\n").map(line => JSON.parse(line))
    expect(requests().filter(item => item.post)).toHaveLength(0)
    writeFileSync(path.join(root, "github-phase"), "building")
    await check.click()
    await expect(page.getByText("本人用Proの新版を準備中です。完成後に自動で取得します。", { exact: true })).toBeVisible()
    await expect(check).toBeEnabled()
    expect(requests().filter(item => item.post)).toHaveLength(1)
    writeFileSync(path.join(root, "github-phase"), "queued")
    const previousRevision = await app.evaluate(() => (globalThis as any).testUpdates.getStatus().revision)
    await check.click()
    await expect.poll(async () => app!.evaluate((_electron, revision) => {
      const status = (globalThis as any).testUpdates.getStatus()
      return status.revision > revision && status.status === "building"
    }, previousRevision)).toBe(true)
    await expect(page.getByText("本人用Proの新版を準備中です。完成後に自動で取得します。", { exact: true })).toBeVisible()
    await expect(check).toBeEnabled()
    expect(requests().filter(item => item.post)).toHaveLength(1)
    writeFileSync(path.join(root, "github-phase"), "failed")
    await app.evaluate(() => (globalThis as any).testUpdates.check())
    await expect(page.getByText("更新できませんでした。接続を確認して「更新を確認」で再試行してください。", { exact: true })).toBeVisible()
    expect(requests().filter(item => item.post)).toHaveLength(1)
    await check.click()
    await expect(page.getByText("本人用Proの新版を準備中です。完成後に自動で取得します。", { exact: true })).toBeVisible()
    await expect(check).toBeEnabled()
    expect(requests().filter(item => item.post)).toHaveLength(2)
    writeFileSync(path.join(root, "github-phase"), "ready")
    await check.click()
    await expect(page.getByText("更新の準備ができました。アプリ終了時に適用します。", { exact: true })).toBeVisible()
    expect(credentials.length).toBeGreaterThanOrEqual(2)
    expect(credentials.every(value => value === "token gho_NOT_A_REAL_TEST_TOKEN")).toBe(true)
    expect(await app.evaluate(() => (globalThis as any).testStore.get("yield-license-key"))).toBe("preserve-private-key")
    await page.locator('[data-slot="card"]').filter({ hasText: "アプリの更新" }).screenshot({ path: info.outputPath("private-update-ready.png") })
  } finally {
    await app?.close()
    prism.kill()
    writeFileSync(info.outputPath("prism.log"), prismLogs)
    await new Promise<void>((resolve, reject) => files.close(error => error ? reject(error) : resolve()))
    await info.attach("Prism GitHub契約ログ", { body: prismLogs, contentType: "text/plain" })
  }
})
