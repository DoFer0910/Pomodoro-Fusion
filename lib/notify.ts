// デスクトップ通知。Electron 環境では preload 経由でメインプロセスの Notification を使い、
// Web 環境では標準の window.Notification にフォールバックする。
// ウィンドウを背面・最小化していてもセッションの切り替わりに気づけるようにするのが目的。

interface ElectronAPI {
  showNotification?: (title: string, body: string) => void
}

function getElectron(): ElectronAPI | undefined {
  if (typeof window === "undefined") return undefined
  return (window as unknown as { electron?: ElectronAPI }).electron
}

/**
 * デスクトップ通知を表示する。
 * Electron 優先。Web では権限が許可済みのときのみ表示し、未要求なら一度だけ要求する。
 */
export function showNotification(title: string, body: string): void {
  const electron = getElectron()
  if (electron?.showNotification) {
    electron.showNotification(title, body)
    return
  }

  if (typeof window === "undefined" || !("Notification" in window)) return

  if (Notification.permission === "granted") {
    new Notification(title, { body })
  } else if (Notification.permission !== "denied") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(title, { body })
    })
  }
}
