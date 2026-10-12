import { afterEach, describe, it, expect, vi } from "vitest"
import {
  LICENSE_ACTIVATION_AVAILABLE,
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  isPro,
  verifyLicenseKey,
} from "./license"

// public スタブの約束事。配布版（public 単体ビルド）は鍵を検証できないので、
// 鍵入力欄を出さず、どんな鍵でも Pro にならないことを保証する。
describe("license (public スタブ)", () => {
  afterEach(() => vi.unstubAllEnvs())
  it("鍵を検証できないビルドとして振る舞う（設定画面に鍵入力欄を出さない）", () => {
    expect(LICENSE_ACTIVATION_AVAILABLE).toBe(false)
  })

  it("どんな鍵を渡しても Pro にならない", async () => {
    const key = "eyJ2IjoxfQ.c2lnbmF0dXJl"
    expect(await verifyLicenseKey(key)).toBeNull()
    expect((await activateLicense(key)).isPro).toBe(false)
    expect((await getLicenseStatus()).isPro).toBe(false)
    expect(await isPro()).toBe(false)
  })

  it.each([undefined, "pro"])("通常開発では全機能を解放する（設定=%s）", async (plan) => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_YIELD_DEV_PLAN", plan)
    expect(await getLicenseStatus()).toEqual({ isPro: true, payload: { v: 1, plan: "dev" } })
    expect(await isPro()).toBe(true)
    // 鍵の検証・永続化は行わず、起動設定だけで解放する。
    expect(await verifyLicenseKey("invalid")).toBeNull()
    expect((await activateLicense("invalid")).isPro).toBe(true)
    await deactivateLicense()
    expect(await isPro()).toBe(true)
    vi.stubEnv("NEXT_PUBLIC_YIELD_DEV_PLAN", "free")
    expect(await getLicenseStatus()).toEqual({ isPro: false, payload: null })
  })

  it.each(["free", "invalid", ""])("無料版確認・不明な設定では開発中も無料（設定=%s）", async (plan) => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_YIELD_DEV_PLAN", plan)
    expect(await isPro()).toBe(false)
    expect((await activateLicense("invalid")).isPro).toBe(false)
  })

  it.each(["production", "test"])("開発用設定が残っていても%sでは解放しない", async (nodeEnv) => {
    vi.stubEnv("NODE_ENV", nodeEnv)
    vi.stubEnv("NEXT_PUBLIC_YIELD_DEV_PLAN", "pro")
    expect(await isPro()).toBe(false)
    expect((await getLicenseStatus()).payload).toBeNull()
    expect((await activateLicense("invalid")).isPro).toBe(false)
  })
})
