# AGENTS.md

このファイルは、Codex (Codex.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 言語

**すべての会話は日本語で行うこと。** コード・コメント・変数名は英語のままでよいが、ユーザーへの応答・説明・質問はすべて日本語で返すこと。

## アプリの概要

**Yield** は Electron + Next.js 製のデスクトップ型ポモドーロタイマーアプリ（v0.3.9）。独立した2つのタイマーモードを持つ — **Earn**（請求可能な時間・収益を追跡）と **Immerse**（集中モード、財務情報を非表示）。UIはコンパクトな常時最前面フローティングウィンドウに最適化されている。

## コマンド

```bash
npm run dev                # Web開発サーバー（http://localhost:3000）
npm run dev:electron       # Electronアプリを開発モードで起動
npm run build              # Next.js本番ビルド（out/に出力）
npm run build:electron     # next build + electron-builder → dist/Yield Setup <version>.exe
npm run lint               # ESLint
```

テストスイートは存在しない。テストは `npm run dev:electron` で手動実施。

## アーキテクチャ

### Next.js + Electron ハイブリッド構成

- Next.js は `output: 'export'`（静的エクスポートのみ — SSR・APIルートなし）
- 本番環境では Electron のメインプロセスがローカルHTTPサーバーで `out/` を配信
- すべてのデータはクライアントサイド、バックエンドなし

```
メインプロセス (electron/main.js)
├── ウィンドウライフサイクル、フレームレス透明ウィンドウ
├── IPCハンドラ: storage:get, storage:set, storage:delete
└── 本番環境でout/を配信するローカルHTTPサーバー

レンダラープロセス (Next.js/React)
├── components/pomodoro-app.tsx  — トップレベルのビュールーター
├── components/timer-context.tsx — グローバルタイマー状態 (React Context)
├── hooks/                       — ビジネスロジック
└── lib/storage/adapter.ts       — ストレージ抽象化レイヤー
```

### ストレージ抽象化

`lib/storage/adapter.ts` が `getStorage()` をエクスポートし、環境を自動検出する：
- **Web**: `localStorage` を直接使用
- **Electron**: IPC経由で `electron-store` を使用（`storage:get` / `storage:set` / `storage:delete`）

上位レベルの読み書きはすべて `lib/storage.ts`（`getSessions()`、`saveSessions()`、`getSettings()` など）を経由する。コンポーネントから `localStorage` や IPC を直接呼び出さないこと。

### 状態アーキテクチャ

2つの独立した状態レイヤー：
- **`timer-context.tsx`**（React Context）: `timeLeft`、`isRunning`、`isBreak`、`selectedTodoId`、`selectedProjectId` — ライブタイマー状態
- **`use-pomodoro.ts`** フック: `sessions`、`settings`、`projects` — 永続化データ

### タイマーロジック（`hooks/use-timer.ts`）

- `workDuration * 60` 秒からカウントダウン
- `allowOvertime` が true でタイマーがゼロに達した場合、`timeLeft` が負の値になり継続（残業時間追跡）
- 長い休憩は `todaySessionCount % longBreakInterval === 0` の時に発動
- セッション完了時: `Session` オブジェクトを生成し、`usePomodoro.addSession()` → `persistSession()` → `storage.set()` を呼び出す

### IPCチャンネル（`electron/preload.js` で定義、`electron/main.js` で処理）

| チャンネル | 用途 |
|---|---|
| `window:set-compact-mode` | 300×300にリサイズ、リサイズ無効化、常時最前面を強制 |
| `window:set-always-on-top` | 常時最前面の切り替え |
| `window:set-bounds` | 手動リサイズ・移動（透明ウィンドウのドラッグ用） |
| `window:minimize/maximize/close` | 標準ウィンドウコントロール |
| `storage:get/set/delete` | electron-store の永続化 |

コンパクトモードは `preCompactBounds` ref にコンパクト前のウィンドウサイズを保存し、終了時に復元する。

### セッションデータモデル

`Session` の主要フィールド（`lib/types.ts` 参照）：
- `isBillable`: Earnモードでは true、Immerseモードでは false — CSV収益と統計に影響
- `projectId` / `todoTitle`: セッション作成時点のプロジェクト・ToDoのスナップショット
- プロジェクトを削除するとセッションは孤立する（セッションは保持され、`projectId` が解除される）

### ローカライゼーション

UIの文字列はすべて `lib/i18n.ts` を経由する。`"ja"`（デフォルト）と `"en"` をサポート。`useTranslation(settings.language)` でアクセスする。

## 主要な設定メモ

- `next.config.mjs`: `typescript.ignoreBuildErrors: true` — TypeScriptエラーがビルドをブロックしない
- パスエイリアス `@/*` はリポジトリルートにマップ（例: `@/lib/types` → `lib/types.ts`）
- Tailwind v4 は `@tailwindcss/postcss` 経由 — `tailwind.config.js` 不要
- Shadcn UIスタイルプリセット: "new-york"（`components.json` で設定）
- Electronウィンドウ: `transparent: true`、`frame: false` — カスタム `TitleBar` コンポーネントがウィンドウコントロールを処理

## 新しいElectron IPCの追加方法

1. `electron/main.js` の `ipcMain.handle()` 内にハンドラを追加
2. `electron/preload.js` で `contextBridge.exposeInMainWorld` を使って公開
3. レンダラーコードから `window.electronAPI.<method>()` で呼び出す

## Git 運用

### ブランチの切り方

- シンプルな更新は、わざわざブランチを切らず `master` に直接コミットしてよい
  - 例: バージョン番号の更新、誤字・表記ゆれ修正、コメント修正、リリースノート追記、設定値の軽微な調整など、設計判断を伴わず単一の定型変更で完結するもの
- 次のいずれかに当てはまる変更は、ブランチを切って PR で進める
  - 仕様追加・仕様変更・設計判断を伴う
  - 複数ファイルにまたがる、または複数ステップで進める見込みがある
  - 回帰リスクがあり、レビューやテストで影響範囲を確認したい
- 迷う場合はブランチを切る側に倒す。直接 `master` に入れてよいのは「明らかにシンプル」と判断できるときに限る
