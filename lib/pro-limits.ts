// 無料プランの上限値（Pro ゲートで参照する共通定数）。
//
// これらは license.ts（public スタブ / private 実体で差し替え）とは独立した「ゲート側」の
// 定数。Pro 判定そのものは license.ts、上限の数値はここ、と責務を分けることで、private の
// ビルド時差し替えが license.ts を丸ごと上書きしても上限値が失われない。

// 無料プランで作成できるプロジェクトの最大数。Pro は無制限。
// 既存ユーザーが既にこれを超えて持っている場合は遡及的に削除しない（収益化計画の注記）。
// 新規作成のみをこの上限でブロックする。
export const FREE_PROJECT_LIMIT = 3

// Pro 版の販売ページ URL。購入導線（設定画面のライセンスセクション）のリンク先。
// 販売ページ（Gumroad / BOOTH）開設後に実 URL へ差し替える。
export const PURCHASE_URL = "https://example.com/yield-pro"

// 購入リンクを表示してよいか。
// PURCHASE_URL がプレースホルダ（example.com）の間は false。このときは購入リンクを隠し、
// 機能のロック（CSV・プロジェクト数）だけを効かせる。実 URL へ差し替えると自動で true
// になり、購入リンクが表示される。
// 鍵入力欄はこれとは独立に、license.ts の LICENSE_ACTIVATION_AVAILABLE（このビルドが鍵を
// 検証できるか）で表示を決める。
// 公開鍵が実鍵に差し替わっていないと鍵入力しても有効化できないため、URL と公開鍵は
// セットで差し替える運用にする（公開鍵側は private/yield-pro の license.ts 実体で管理）。
export const PURCHASE_ENABLED = !PURCHASE_URL.includes("example.com")
