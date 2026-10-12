import { afterEach, describe, expect, it, vi } from "vitest"
import { createRequire } from "node:module"
import { EventEmitter } from "node:events"
const require = createRequire(import.meta.url)
const { createUpdateService, updatePolicy } = require("../electron/updates.cjs")

afterEach(() => vi.useRealTimers())
function setup(checkForUpdates = vi.fn(async () => ({})), enabled = true) {
  const app = Object.assign(new EventEmitter(), { getVersion: () => "1.2.0" })
  const updater = Object.assign(new EventEmitter(), { checkForUpdates })
  const handlers = new Map<string, () => unknown>()
  const send = vi.fn()
  const service = createUpdateService({ app, updater, enabled,
    ipcMain: { handle: (key: string, callback: () => unknown) => handlers.set(key, callback), removeHandler: (key: string) => handlers.delete(key) },
    getWindow: () => ({ isDestroyed: () => false, webContents: { send } }), logger: { error: vi.fn() },
  })
  return { service, updater, app, handlers, send }
}
describe("アプリの自動更新", () => {
  it("起動後と定期確認で更新を取得し、開発起動では通信しない", async () => {
    vi.useFakeTimers()
    const active = setup()
    const disabled = setup(vi.fn(), false)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(active.updater.checkForUpdates).toHaveBeenCalledTimes(1)
    active.updater.emit("update-not-available", { version: "1.2.0" })
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(active.updater.checkForUpdates).toHaveBeenCalledTimes(2)
    expect(disabled.updater.checkForUpdates).not.toHaveBeenCalled()
    active.service.dispose(); disabled.service.dispose()
  })
  it("並行確認を抑止し、ダウンロード済みの更新を再確認で消さない", async () => {
    let resolve!: (value: {}) => void
    const active = setup(vi.fn(() => new Promise(done => { resolve = done })))
    const first = active.service.check()
    await Promise.resolve()
    await active.service.check()
    expect(active.updater.checkForUpdates).toHaveBeenCalledTimes(1)
    active.updater.emit("update-available", { version: "1.2.1" })
    active.updater.emit("update-downloaded", { version: "1.2.1" })
    resolve({})
    await first
    await active.service.check()
    expect(active.updater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(active.service.getStatus()).toMatchObject({ status: "downloaded", version: "1.2.0", updateVersion: "1.2.1" })
    expect((active.updater as any).autoInstallOnAppQuit).toBe(true)
    expect((active.updater as any).allowDowngrade).toBe(false)
    active.service.dispose()
  })
  it("同期例外と自動ダウンロード失敗を捕捉し、次の確認で復帰できる", async () => {
    const check = vi.fn().mockImplementationOnce(() => { throw new Error("offline") })
      .mockImplementationOnce(() => ({ downloadPromise: Promise.reject(new Error("download failed")) }))
      .mockImplementationOnce(async () => ({}))
    const active = setup(check)
    await active.service.check()
    expect(active.service.getStatus().status).toBe("error")
    await active.service.check()
    expect(active.service.getStatus().status).toBe("error")
    await active.service.check()
    expect(check).toHaveBeenCalledTimes(3)
    active.service.dispose()
    expect(() => active.updater.emit("error", new Error("install failed"))).not.toThrow()
  })
  it("公開配布版だけを既定で更新し、ProとDevProを無料版へ置き換えない", () => {
    const base = { packaged: true, platform: "win32", development: false, edition: "free" }
    expect(updatePolicy(base).enabled).toBe(true)
    for (const change of [{ packaged: false }, { development: true }, { platform: "darwin" }, { edition: "dev-pro" }, { edition: "pro" }, { edition: undefined }, { edition: "pro", repository: "DoFer0910/Pomodoro-Fusion" }]) {
      expect(updatePolicy({ ...base, ...change }).enabled).toBe(false)
    }
    expect(updatePolicy({ ...base, edition: "pro", repository: "DoFer0910/yield-pro-releases" }).enabled).toBe(true)
  })
})
