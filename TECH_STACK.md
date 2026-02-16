# 技術スタック (Tech Stack)

このプロジェクトで使用されている主要な技術、ライブラリ、およびツールの一覧です。

## コアフレームワーク (Core Frameworks)

*   **Runtime Environment**: Node.js (開発環境), Electron (デスクトップアプリ)
*   **Web Framework**: [Next.js](https://nextjs.org/) 16 (App Router / Static Exports)
    *   Electronでの動作に合わせて `output: 'export'` モードを使用
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Desktop Containers**: [Electron](https://www.electronjs.org/) 40
    *   Electron Builder: アプリケーションのパッケージングとインストーラー作成に使用

## UI / スタイリング (UI & Styling)

*   **CSS Framework**: [Tailwind CSS](https://tailwindcss.com/) v4
    *   次世代のTailwind CSSエンジンを使用 (`@tailwindcss/postcss`)
*   **Component Library**: [Shadcn UI](https://ui.shadcn.com/)
    *   ベース: [Radix UI Primitives](https://www.radix-ui.com/)
    *   アクセシビリティに配慮したヘッドレスコンポーネントを採用
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Charts / Visualization**: [Recharts](https://recharts.org/) (統計タブ・円グラフで使用)
*   **Carousels**: [Embla Carousel](https://www.embla-carousel.com/)

## 状態管理 & データ永続化 (State & Persistence)

このアプリケーションは**クライアントサイド完結型**のアーキテクチャを採用しており、サーバーサイドデータベースは使用していません。

*   **State Management**: React Hooks (`useState`, `useEffect`, `useContext`)
*   **Form Management**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) (バリデーション)
*   **Data Persistence**:
    *   **Web環境**: Browser `localStorage`
    *   **Electron環境**: `electron-store` (IPC経由でファイルシステムにJSONとして保存)
    *   保存データ: セッション履歴 (`pomodoro-sessions`), アプリ設定 (`pomodoro-settings`), ToDoリスト (`pomodoro-todos`), プロジェクト (`pomodoro-projects`)

## 開発ツール & ユーティリティ (Dev Tools & Utilities)

*   **Linting**: ESLint
*   **Date Formatting**: [date-fns](https://date-fns.org/)
*   **Package Manager**: npm
*   **Utility**: `clsx`, `tailwind-merge` (クラス名の条件付き結合)

## ディレクトリ構造の概要

*   `app/`: Next.js App Routerのページとレイアウト
*   `components/`: Reactコンポーネント (Shadcn UIコンポーネント含む)
*   `lib/`: ユーティリティ関数、型定義、データアクセスの抽象レイヤー (`storage.ts`, `adapter.ts`)
*   `hooks/`: カスタムReact Hooks (`use-todo.ts` など)
*   `electron/`: Electronのメインプロセス (`main.js`) とプリロードスクリプト

