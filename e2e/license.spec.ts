import { test, expect, _electron as electron } from "@playwright/test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import path from "node:path"

const projects = Array.from({ length: 3 }, (_, i) => ({
  id: `project-${i}`, name: `開発案件${i + 1}`, hourlyRate: 2500,
  color: "#22c55e", createdAt: 1, updatedAt: 1,
}))

for (const surface of ["Web", "Electron"] as const) {
  test(`${surface}で起動モードに応じて4件目のプロジェクト作成とCSV出力を切り替える`, async ({ page: browserPage }, info) => {
    const developmentPro = info.project.name === "development-pro"
    let page = browserPage
    let app: Awaited<ReturnType<typeof electron.launch>> | undefined
    if (surface === "Electron") {
      mkdirSync(info.outputDir, { recursive: true })
      const root = mkdtempSync(path.join(info.outputDir, "electron-"))
      for (const dir of ["codex", "claude", "user-data", "downloads"]) mkdirSync(path.join(root, dir))
      writeFileSync(path.join(root, "initial.json"), JSON.stringify({
        "pomodoro-projects": projects, "pomodoro-settings": { language: "ja" },
        "yield-license-key": "development-pro",
      }))
      app = await electron.launch({
        acceptDownloads: true,
        args: [path.resolve("e2e/electron-fixture.cjs")],
        env: { ...process.env, YIELD_E2E_DIR: root, YIELD_E2E_URL: String(info.project.use.baseURL) },
      })
      page = await app.firstWindow()
    }
    const projectCount = () => app
      ? app.evaluate(() => (globalThis as any).testStore.get("pomodoro-projects").length)
      : page.evaluate(() => JSON.parse(localStorage.getItem("pomodoro-projects")!).length)
    try {
      await page.addInitScript((projects) => {
        localStorage.setItem("pomodoro-settings", JSON.stringify({ language: "ja" }))
        localStorage.setItem("pomodoro-projects", JSON.stringify(projects))
        // 保存値やURLによる開発用の解放は許可しない。
        localStorage.setItem("yield-license-key", "development-pro")
        localStorage.setItem("NEXT_PUBLIC_YIELD_DEV_PLAN", "pro")
      }, projects)
      await page.goto(`${info.project.use.baseURL}/?NEXT_PUBLIC_YIELD_DEV_PLAN=pro`)
      await page.getByRole("button", { name: "設定", exact: true }).click()
      if (developmentPro) {
        await expect(page.getByText("開発用：Pro機能を解放中", { exact: true })).toBeVisible()
        await expect(page.getByRole("button", { name: "解除", exact: true })).toHaveCount(0)
      } else {
        await expect(page.getByText("開発用：Pro機能を解放中", { exact: true })).toHaveCount(0)
        await expect(page.getByText("開発案件3", { exact: true })).toBeVisible()
      }
      await page.getByRole("button", { name: "プロジェクトを追加" }).click()
      if (developmentPro) {
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible()
        await dialog.getByLabel("プロジェクト名", { exact: true }).fill("4件目の開発案件")
        await dialog.getByRole("button", { name: "保存", exact: true }).click()
        await expect(page.getByText("4件目の開発案件", { exact: true })).toBeVisible()
        expect(await projectCount()).toBe(4)
        const downloadPromise = page.waitForEvent("download")
        await page.getByRole("button", { name: "CSV出力", exact: true }).click()
        expect((await downloadPromise).suggestedFilename()).toMatch(/^pomodoro-history-.*\.csv$/)
      } else {
        await expect(page.getByText("無料プランのプロジェクトは3件までです。Proにアップグレードすると無制限に作成できます。", { exact: true })).toBeVisible()
        await expect(page.getByRole("dialog")).toHaveCount(0)
        const downloads: string[] = []
        page.on("download", download => downloads.push(download.suggestedFilename()))
        await page.getByRole("button", { name: "CSV出力", exact: true }).click()
        await expect(page.getByText("CSV出力はPro機能です。ライセンスを有効化すると確定申告・日報・請求向けのCSVを書き出せます。", { exact: true })).toBeVisible()
        expect(downloads).toEqual([])
        expect(await projectCount()).toBe(3)
      }
      const screenshot = await page.screenshot({ path: info.outputPath("settings.png"), fullPage: true })
      await info.attach("設定画面", { body: screenshot, contentType: "image/png" })
      const licenseCard = page.locator('[data-slot="card"]').filter({
        has: page.locator('[data-slot="card-title"]').filter({ hasText: /^ライセンス/ }),
      })
      await licenseCard.evaluate(element => element.scrollIntoView({ block: "center" }))
      await licenseCard.screenshot({ path: info.outputPath("license.png") })
    } finally {
      await app?.close()
    }
  })
}
