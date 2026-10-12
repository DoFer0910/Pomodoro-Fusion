import { describe, expect, it } from "vitest"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const { newerThan } = require("../electron/dev-pro-updates.cjs")
describe("本人用Proの更新バージョン", () => {
  it("安定版の新しい公開バージョンだけを準備し、同版と古い版を除外する", () => {
    expect(newerThan("v1.2.1", "1.2.0")).toBe(true)
    expect(newerThan("v2.0.0", "1.99.99")).toBe(true)
    expect(newerThan("v1.2.1", "1.2.1")).toBe(false)
    expect(newerThan("v1.2.0", "1.2.1")).toBe(false)
    expect(() => newerThan("v1.2.1-beta.1", "1.2.0")).toThrow()
  })
})
