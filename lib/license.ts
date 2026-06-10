// ライセンス（Pro）機構 — public スタブ。
//
// このファイルは public（無料版）リポジトリに置く「スタブ」実装で、常に無料
// （isPro=false）を返す。Pro の実体（署名鍵のオフライン検証ロジック・同梱公開鍵）は
// public には含めず、private リポジトリ yield-pro の pro/lib/license.ts に置く。
//
// 差し替え方式:
// - public 単体でもこのスタブでビルドが通る（Pro 機能はすべて無料表示でロックされる）。
// - private/yield-pro のビルド時に、このファイルを Pro 実体で上書きしてからビルドする。
//   実体はこのスタブと「同じ公開 API（型・関数シグネチャ）」を提供するため、ゲート側の
//   呼び出しコードは public/private どちらでも無改変で動く。
//
// 公開鍵・署名検証・発行スクリプトの仕様は private 側（pro/lib/license.ts）に集約する。

// 検証済みライセンスのペイロード。
// public スタブでは検証を行わないが、ゲート側の型整合のため実体と同一の型を公開する。
export interface LicensePayload {
  v: number
  email?: string
  issuedAt?: number
  plan?: string
  features?: string[]
}

export interface LicenseStatus {
  isPro: boolean
  payload: LicensePayload | null
}

const FREE_STATUS: LicenseStatus = { isPro: false, payload: null }

/**
 * 鍵文字列を検証する（スタブ）。public では公開鍵を持たないため常に null を返す。
 * 実体（private）はここで Ed25519 署名をオフライン検証する。
 */
export async function verifyLicenseKey(
  _key: string,
): Promise<LicensePayload | null> {
  return null
}

/**
 * ライセンス鍵を有効化する（スタブ）。public では常に無料状態を返し、保存もしない。
 */
export async function activateLicense(_key: string): Promise<LicenseStatus> {
  return FREE_STATUS
}

/**
 * 現在のライセンス状態を返す（スタブ）。public では常に無料状態。
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  return FREE_STATUS
}

/**
 * Pro かどうかを判定する（スタブ）。public では常に false。
 */
export async function isPro(): Promise<boolean> {
  return false
}

/**
 * 保存済みライセンスを削除する（スタブ）。public では保存しないため何もしない。
 */
export async function deactivateLicense(): Promise<void> {
  // no-op
}
