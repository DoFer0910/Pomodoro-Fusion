export interface UpdateStatus {
  revision: number
  version: string
  status: "idle" | "disabled" | "checking" | "building" | "current" | "downloading" | "downloaded" | "restarting" | "error"
  reason: "development" | "platform" | "edition" | null
  updateVersion: string | null
  percent: number | null
}

export interface UpdateAPI {
  getUpdateStatus(): Promise<UpdateStatus>
  checkForUpdates(): Promise<UpdateStatus>
  restartForUpdate?: () => Promise<UpdateStatus>
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void
}

export function getUpdateAPI(): UpdateAPI | null {
  if (typeof window === "undefined") return null
  const api = (window as unknown as { electron?: Partial<UpdateAPI> }).electron
  return api?.getUpdateStatus && api.checkForUpdates && api.onUpdateStatus ? api as UpdateAPI : null
}
