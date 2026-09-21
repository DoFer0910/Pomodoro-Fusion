import { describe, it, expect } from "vitest"
import {
  LICENSE_ACTIVATION_AVAILABLE,
  activateLicense,
  getLicenseStatus,
  isPro,
  verifyLicenseKey,
} from "./license"

// public スタブの約束事。配布版（public 単体ビルド）は鍵を検証できないので、
// 鍵入力欄を出さず、どんな鍵でも Pro にならないことを保証する。
describe("license (public スタブ)", () => {
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
})
