import { describe, expect, it } from "vitest"
import { createRequire } from "node:module"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
const require = createRequire(import.meta.url)
const { nextVersion, prepareRelease } = require("../scripts/prepare-release.cjs")
describe("配布バージョン", () => {
  it("過去タグ・下書き・手動バージョン更新を越える番号を選ぶ", () => {
    expect(nextVersion("1.2.0", ["v1.2.9", "v0.3.15", "v1.3.0-beta.1", "notes"])).toBe("1.2.10")
    expect(nextVersion("2.0.0", ["v1.99.99"])).toBe("2.0.1")
    expect(nextVersion("1.2.0", ["v2.0.5", "v1.99.99"])).toBe("2.0.6")
    expect(() => nextVersion("1.2.0-dev", [])).toThrow()
  })
  it("packageとlockを揃え、依存ライブラリのバージョンを変えない", () => {
    const root = mkdtempSync(path.join(tmpdir(), "yield-release-"))
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.2.0", dependencies: { x: "3.0.0" } }))
    writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ version: "1.2.0", packages: { "": { version: "1.2.0" }, "node_modules/x": { version: "3.0.0" } } }))
    expect(prepareRelease(root, ["v1.2.1"])).toBe("1.2.2")
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
    const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"))
    expect([pkg.version, lock.version, lock.packages[""].version]).toEqual(["1.2.2", "1.2.2", "1.2.2"])
    expect(lock.packages["node_modules/x"].version).toBe("3.0.0")
  })
})
