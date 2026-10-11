import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Session } from "./types"

// storage.ts は getStorage() 経由でストレージにアクセスする。
// テストでは「get に遅延がある」インメモリ store に差し替え、read-modify-write の
// 並行実行で lost update が起きないこと（＝書き込みが直列化されていること）を検証する。
const store = new Map<string, unknown>()
let getDelayMs = 0
let failWrite = false

vi.mock("./storage/adapter", () => ({
  getStorage: () => ({
    async get<T>(key: string): Promise<T | null> {
      // read に遅延を入れることで、直列化が無ければ複数の操作が同じ古い
      // スナップショットを読んでしまう状況を再現する。
      if (getDelayMs > 0) await new Promise((r) => setTimeout(r, getDelayMs))
      return (store.has(key) ? (store.get(key) as T) : null)
    },
    async set<T>(key: string, value: T): Promise<void> {
      if (failWrite) throw new Error("disk unavailable")
      store.set(key, value)
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
  }),
}))

import { addSession, getSessions, mutateSessions, saveSessions, getAttendance, mutateAttendance, saveAttendance, deleteProject, saveProjects, saveSettings, getSettings } from "./storage"
import { emptyAttendance, putWorkRecord, transitionWork } from "./attendance"
import { exportData, importData } from "./data-management"
import { DEFAULT_SETTINGS } from "./types"

function makeSession(id: string): Session {
  return {
    id,
    timestamp: Number(id) || 0,
    duration: 600,
    status: "completed",
    isBillable: false,
  }
}

describe("mutateSessions / addSession の直列化", () => {
  beforeEach(() => {
    store.clear()
    getDelayMs = 0
  })

  it("mutator の処理中に別の書き込みが割り込んでも、その変更を消さない", async () => {
    // 実際の症状の再現: syncClaude はスキャン（時間がかかる非同期処理）の結果を
    // current にマージして保存する。そのマージ処理中にタイマー完了の addSession が
    // 走ると、直列化が無ければ syncClaude は addSession の追加を含まない古い current
    // に対して全件上書きし、追加分を消してしまう。
    await saveSessions([])

    let resumeSync!: () => void
    const syncBlocked = new Promise<void>((r) => {
      resumeSync = r
    })

    // 「同期」相当: mutator 内で外部処理（スキャン）の完了を待つ間に、
    // 別の addSession が割り込む状況を作る。
    const syncPromise = mutateSessions(async (current) => {
      await syncBlocked // この間に下の addSession を割り込ませる
      return [makeSession("sync"), ...current]
    })

    // 同期がブロックされている隙にタイマー完了セッションを追加
    const addPromise = addSession(makeSession("timer"))

    // 同期のブロックを解除
    resumeSync()
    await Promise.all([syncPromise, addPromise])

    const ids = (await getSessions()).map((s) => s.id).sort()
    // 直列化が無ければ "timer" が消えて ["sync"] になる。
    // 直列化されていれば両方残る。
    expect(ids).toEqual(["sync", "timer"])
  })

  it("mutator が返した最新の配列を返す", async () => {
    await saveSessions([makeSession("10")])
    const next = await mutateSessions((current) => [makeSession("20"), ...current])
    expect(next.map((s) => s.id)).toEqual(["20", "10"])
    // 保存内容とも一致する
    expect((await getSessions()).map((s) => s.id)).toEqual(["20", "10"])
  })

  it("連続適用しても直前の結果を起点にできる（チェーンが順序を保つ）", async () => {
    await saveSessions([])
    getDelayMs = 10
    // 同じ id を 2 回足すような mutator を並行で流しても、後勝ちで上書きせず
    // それぞれが直前の状態を見て積み上がる。
    await Promise.all(
      ["a", "b", "c", "d"].map((id) =>
        mutateSessions((current) => [makeSession(id), ...current]),
      ),
    )
    const ids = (await getSessions()).map((s) => s.id).sort()
    expect(ids).toEqual(["a", "b", "c", "d"])
  })
})

describe("勤務記録の保存とバックアップ", () => {
  beforeEach(() => { store.clear(); getDelayMs = 0; failWrite = false })

  it("並行して区間を追加しても両方を保存する", async () => {
    getDelayMs = 10
    await Promise.all([
      mutateAttendance(data => putWorkRecord(data, { id: "a", start: 1000, end: 2000, kind: "work" })),
      mutateAttendance(data => putWorkRecord(data, { id: "b", start: 3000, end: 4000, kind: "work" })),
    ])
    expect((await getAttendance()).records.map(r => r.id)).toEqual(["a", "b"])
  })

  it("保存失敗を伝え、次の再試行を妨げない", async () => {
    failWrite = true
    await expect(mutateAttendance(data => transitionWork(data, "start", 1000))).rejects.toThrow("disk unavailable")
    expect((await getAttendance()).records).toEqual([])
    failWrite = false
    await mutateAttendance(data => transitionWork(data, "start", 1000))
    expect((await getAttendance()).records).toHaveLength(1)
  })

  it("プロジェクトを削除しても記録と案件名のスナップショットを保持する", async () => {
    await saveAttendance(transitionWork(emptyAttendance(), "start", 1000, { id: "p", name: "案件A" }))
    await saveProjects([{ id: "p", name: "案件A", hourlyRate: 1, color: "#000", createdAt: 1, updatedAt: 1 }])
    await deleteProject("p")
    expect((await getAttendance()).records[0]).toMatchObject({ start: 1000, projectName: "案件A" })
    expect((await getAttendance()).records[0].projectId).toBeUndefined()
  })

  it("新しいバックアップで勤務・判断・確認状態を往復できる", async () => {
    const data = { ...emptyAttendance(), records: [{ id: "human", start: 1000, end: 2000, kind: "work" as const }],
      ignored: [{ activityId: "ai", start: 3000, end: 4000 }], reviews: { "1970-01-01": 5000 } }
    await saveAttendance(data)
    const backup = await exportData()
    await saveAttendance(emptyAttendance())
    expect(await importData(backup)).toEqual({ success: true })
    expect(await getAttendance()).toEqual(data)
  })

  it.each([1, 2])("旧v%iバックアップは空の勤務記録として復元する", async (version) => {
    await saveAttendance(transitionWork(emptyAttendance(), "start", 1000))
    expect(await importData(JSON.stringify({ settings: DEFAULT_SETTINGS, sessions: [], version }))).toEqual({ success: true })
    expect(await getAttendance()).toEqual(emptyAttendance())
  })

  it.each([3, 4, undefined])("勤務データが欠落したv%sバックアップは全保存データを変更せず拒否する", async (version) => {
    await saveSettings({ ...DEFAULT_SETTINGS, defaultHourlyRate: 777 })
    await saveSessions([makeSession("10")])
    await saveProjects([{ id: "p", name: "案件A", hourlyRate: 1, color: "#000", createdAt: 1, updatedAt: 1 }])
    await saveAttendance(transitionWork(emptyAttendance(), "start", 1000))
    const before = new Map(store)
    const result = await importData(JSON.stringify({ settings: DEFAULT_SETTINGS, sessions: [], projects: [], todos: [], version }))
    expect(result.success).toBe(false)
    expect(store).toEqual(before)
  })

  it("勤務データが壊れたバックアップでは既存設定も上書きしない", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, defaultHourlyRate: 777 })
    const result = await importData(JSON.stringify({ settings: DEFAULT_SETTINGS, sessions: [],
      attendance: { ...emptyAttendance(), records: [{ id: "bad", start: 3000, end: 2000, kind: "work" }] } }))
    expect(result.success).toBe(false)
    expect((await getSettings()).defaultHourlyRate).toBe(777)
    expect((await importData(JSON.stringify({ settings: DEFAULT_SETTINGS, sessions: [], attendance: null }))).success).toBe(false)
    expect((await getSettings()).defaultHourlyRate).toBe(777)
  })
})
