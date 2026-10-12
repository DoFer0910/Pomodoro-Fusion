// ライセンス（Pro）機構 — public スタブ。
//
// このファイルは public（無料版）リポジトリに置く「スタブ」実装。
// 配布版は常に無料、開発起動だけは既定で Pro とする。Pro の実体（署名鍵のオフライン検証ロジック・同梱公開鍵）は
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
const DEV_STATUS: LicenseStatus = { isPro: true, payload: { v: 1, plan: "dev" } }

// Next.js が NODE_ENV をビルド時に確定するため、本番では開発用設定が残っていても
// この経路は無効。無料版の確認は dev:free / dev:electron:free で明示的に切り替える。
// ストレージには書き込まないので、開発時の解放が配布版に引き継がれることもない。
function developmentProEnabled(): boolean {
  return process.env.NODE_ENV === "development"
    && (process.env.NEXT_PUBLIC_YIELD_DEV_PLAN === undefined
      || process.env.NEXT_PUBLIC_YIELD_DEV_PLAN === "pro")
}

/**
 * このビルドがライセンス鍵を検証できるか。設定画面の鍵入力欄の表示判定に使う。
 * public スタブは公開鍵を持たず、入力されても必ず失敗するため false（入力欄を出さない）。
 * 実体（private）は同梱公開鍵が実鍵なら true になる。
 */
export const LICENSE_ACTIVATION_AVAILABLE = false

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
 * ライセンス鍵は検証・保存しない。開発用の解放状態は起動設定だけで決まる。
 */
export async function activateLicense(_key: string): Promise<LicenseStatus> {
  return getLicenseStatus()
}

/**
 * 現在の状態を返す。通常開発では Pro、無料版確認・配布版では無料。
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  return developmentProEnabled() ? DEV_STATUS : FREE_STATUS
}

/**
 * Pro かどうかを判定する。getLicenseStatus と同じ起動条件を使う。
 */
export async function isPro(): Promise<boolean> {
  return (await getLicenseStatus()).isPro
}

/**
 * 保存済みライセンスを削除する（スタブ）。public では保存しないため何もしない。
 */
export async function deactivateLicense(): Promise<void> {
  // no-op
}
