"use client"

import { useState, useEffect, useCallback } from "react"
import { getLicenseStatus, type LicenseStatus } from "@/lib/license"

// Pro ライセンス状態を React から扱うフック。
//
// lib/license.ts は public ではスタブ（常に無料）、private/yield-pro では実体に
// 差し替わる。このフックはどちらでも同じインターフェースで動くため、ゲート側の
// コンポーネントは public/private の差を意識せずに `isPro` を参照できる。
//
// storage（Electron は IPC・Web は localStorage）が非同期のため、初回は loading=true で
// 開始し、検証完了後に isPro を確定させる。

export interface UseLicenseResult {
  /** 署名が正当な Pro ライセンスが有効なら true。public スタブでは常に false。 */
  isPro: boolean
  /** ライセンス状態の検証が完了したか。完了前にゲート判定すると誤って制限されるため待つ。 */
  loading: boolean
  /** 検証済みペイロード（email など）。鍵入力 UI の表示更新に使う。 */
  status: LicenseStatus
  /** 鍵の有効化・解除後に状態を取り直す。 */
  refresh: () => Promise<void>
}

const FREE_STATUS: LicenseStatus = { isPro: false, payload: null }

export function useLicense(): UseLicenseResult {
  const [status, setStatus] = useState<LicenseStatus>(FREE_STATUS)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await getLicenseStatus()
    setStatus(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { isPro: status.isPro, loading, status, refresh }
}
