# 変更履歴 (Changelog)

このプロジェクトのすべての重要な変更は、このファイルに記録されます。

## [v0.3.7] - 2026-02-27

### Summary
コンパクトモードから通常モードに戻した際のウィンドウサイズの復元機能を実装。

### Changes
- **Feature Addition (feat):** コンパクトモードにする直前のウィンドウサイズと位置を保存し、通常モードに戻した時にそのサイズと位置を復元するよう修正。

## [v0.3.1] - 2026-02-16

### Summary
手動時間入力機能の実装。

### Changes
- **Feature Addition (feat):** 過去の作業時間やタイマー忘れに対応するため、手動でセッション（作業記録）を追加できる機能を実装。履歴画面から利用可能。

## [v0.2.9] - 2026-02-15

### Summary
コンパクトモードおよび「常に最前面」機能の挙動改善とバグ修正。

### Changes
- **Fix (fix):** タイマー動作中のモード（稼ぐ/没頭）切り替えを防止するガード処理を追加。
- **Fix (fix):** コンパクトモード切り替え時に「常に最前面」の状態が正しく復元されない問題を修正。
- **Refactor (refactor):** ウィンドウ制御ロジックの整理。

## [v0.2.2] - 2026-02-15

### Summary
統計機能の強化とCSVエクスポートフォーマットの改善。

### Changes
- **Feature Addition (feat):** プロジェクトごとの作業時間と収益の集計機能を追加。
- **Feature Addition (feat):** CSVエクスポートにプロジェクト名、休憩時間、収益データを含めるようにフォーマットを改善。
- **UI Improvement (style):** 統計画面に円グラフと内訳リストを追加。

## [v0.2.0] - 2026-02-15

### Summary
デスクトップアプリ向けコンパクトモードの実装。

### Changes
- **Feature Addition (feat):** ウィンドウを小型化し、背景を透過させる「コンパクトモード」を実装。
- **Feature Addition (feat):** コンパクトモード時の専用UI（ミニプレイヤー）を追加。
- **Feature Addition (feat):** ウィンドウの「常に最前面」固定トグルボタンを追加。

## [v0.1.0] - 2026-02-14

### Summary
初期リリース。Electron化と基本機能の実装。

### Changes
- **Feature Addition (feat):** Next.js製WebアプリをElectronでデスクトップアプリ化。
- **Feature Addition (feat):** 「稼ぐモード」と「没頭モード」の2つの集中モード。
- **Feature Addition (feat):** ポモドーロタイマー、ToDoリスト、実績カレンダー機能。
- **Infrastructure:** `electron-store` によるデータ永続化（Electron環境）。
