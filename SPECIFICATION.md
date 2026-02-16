# アプリケーション仕様書 (Specification)

## 1. 概要 (Overview)
**イールド (Yield)** は、在宅ワークや学習の生産性を最大化するために設計された、デスクトップ向けポモドーロタイマーアプリケーションです。
「作業時間を資産に変える」をコンセプトに、収益の可視化と集中状態の維持を両立させます。

## 2. アーキテクチャ (Architecture)
- **プラットフォーム**: Electron (Desktop)
- **UIフレームワーク**: React 19, Next.js 16 (App Router / Static Export)
- **スタイリング**: Tailwind CSS v4, Shadcn UI
- **データ管理**: クライアントサイド完結型 (Local Storage / Electron Store)

### プロセス構成
- **Main Process**: Electronのライフサイクル管理、ウィンドウ制御、IPC通信、ファイルシステム操作。
- **Renderer Process**: Next.jsによってビルドされた静的HTML/JSアプリケーション。

## 3. 主要機能 (Features)

### 3.1 集中モード
- **稼ぐモード (Earn Mode)**:
    - 設定した時給に基づき、経過時間に応じてリアルタイムで収益額を表示。
    - フリーランスや副業でのモチベーション維持に特化。
- **没頭モード (Immerse Mode)**:
    - 金額表示を完全に隠し、時間経過のみを表示。
    - 純粋な学習や研究、創作活動向け。
- **共通機能**:
    - ポモドーロタイマー（作業25分 + 休憩5分など、時間はカスタマイズ可能）。
    - タイマー動作中はモード切り替えを無効化し、集中を阻害しない設計。

### 3.2 ウィンドウ制御
- **コンパクトモード**:
    - ウィンドウサイズを 300x300 に縮小。
    - 背景を透明化し、タイマーと必須コントロールのみを表示。
    - 自動的に「常に最前面」に固定。
- **常に最前面 (Always on Top)**:
    - 通常モードでもウィンドウを他のアプリより手前に固定可能。

### 3.3 タスク管理 (ToDo)
- タスクの追加、編集、削除、完了管理。
- 見積もりポモドーロ数と実績ポモドーロ数の記録。
- 現在実行中のタスクをタイマーと連動表示。

### 3.4 統計と実績 (Statistics & Calendar)
- **実績カレンダー**: GitHubのContribution Graph風のヒートマップで日々の活動を可視化。
- **統計レポート**:
    - プロジェクト別の作業時間分布（円グラフ）。
    - 日次、週次、月次の稼働時間と収益合計。
- **データエクスポート**:
    - 全作業ログをCSV形式でエクスポート可能（プロジェクト名、開始終了時刻、休憩時間、収益）。

## 4. データモデル (Data Models)

### Session (作業セッション)
```typescript
interface Session {
  id: string;
  projectId?: string; // 紐づくプロジェクトID
  startTime: string;  // ISO 8601
  endTime: string;    // ISO 8601
  duration: number;   // 作業時間 (秒)
  breakDuration: number; // 休憩時間 (秒)
  mode: 'earn' | 'immerse';
  earnedAmount?: number; // 稼ぐモードの場合の収益
  completedMetrics?: number; // 完了したポモドーロ数など
}
```

### Project (プロジェクト)
```typescript
interface Project {
  id: string;
  name: string;
  hourlyRate: number; // 時給設定
  color: string;      // 表示色
  isActive: boolean;
}
```

### Settings (設定)
```typescript
interface Settings {
  workDuration: number;  // 作業時間 (分)
  shortBreakDuration: number; // 短休憩 (分)
  longBreakDuration: number;  // 長休憩 (分)
  defaultHourlyRate: number;  // デフォルト時給
  soundVolume: number;   // 通知音量
  autoStartBreaks: boolean; // 休憩自動開始
  autoStartPomodoros: boolean; // ポモドーロ自動開始
}
```

## 5. IPC通信一覧 (IPC Channels)

| チャンネル名 | 方向 | ペイロード | 説明 |
| --- | --- | --- | --- |
| `window:minimize` | Renderer -> Main | なし | ウィンドウを最小化 |
| `window:maximize` | Renderer -> Main | なし | ウィンドウを最大化/復元 |
| `window:close` | Renderer -> Main | なし | アプリを終了 |
| `window:set-compact-mode` | Renderer -> Main | `boolean` (isCompact) | コンパクトモードの切り替え |
| `window:set-always-on-top` | Renderer -> Main | `boolean` (flag) | 常に最前面設定の切り替え |
| `storage:get` | Renderer -> Main | `string` (key) | データ取得 |
| `storage:set` | Renderer -> Main | `string` (key), `any` (value) | データ保存 |
| `storage:delete` | Renderer -> Main | `string` (key) | データ削除 |
