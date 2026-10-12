import { describe, expect, it } from "vitest"
import { createRequire } from "node:module"
import { mkdtempSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import path from "node:path"
const require = createRequire(import.meta.url)
const { verifyRelease } = require("../scripts/verify-release.cjs")
describe("自動更新の配布ファイル", () => {
  it("実際のファイル名・サイズ・SHAが一致する配布物だけを公開する", () => {
    const root = mkdtempSync(path.join(tmpdir(), "yield-artifact-"))
    const payload = Buffer.from("installer")
    const checksum = createHash("sha512").update(payload).digest("base64")
    const name = "Yield-Setup-1.2.1.exe"
    writeFileSync(path.join(root, name), payload)
    writeFileSync(path.join(root, name + ".blockmap"), "blockmap")
    const metadata = { version: "1.2.1", files: [{ url: name, sha512: checksum, size: payload.length }], path: name, sha512: checksum }
    // JSONも有効なYAML。実配布物のYAMLは配布ビルド後に同じ検証処理で読む。
    writeFileSync(path.join(root, "latest.yml"), JSON.stringify(metadata))
    expect(verifyRelease(root, "1.2.1").installer).toBe(name)
    expect(() => verifyRelease(root, "1.2.2")).toThrow()
    writeFileSync(path.join(root, "latest.yml"), JSON.stringify({ ...metadata, path: "Yield Setup 1.2.1.exe" }))
    expect(() => verifyRelease(root, "1.2.1")).toThrow(/filename/)
    writeFileSync(path.join(root, "latest.yml"), JSON.stringify(metadata))
    writeFileSync(path.join(root, name), Buffer.from("Installer"))
    expect(() => verifyRelease(root, "1.2.1")).toThrow(/checksum/)
  })
})
