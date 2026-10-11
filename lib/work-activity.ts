import type { Project } from "./types"
import type { WorkActivity } from "./attendance"
import { matchProject, scanClaudeSessions, type ClaudeScanResult } from "./claude-sync"
import { scanCodexSessions, type CodexScanResult } from "./codex-sync"

export function activitiesFromScan(results: (ClaudeScanResult | CodexScanResult)[], source: WorkActivity["source"], projects: Project[]): WorkActivity[] {
  const activities: WorkActivity[] = []
  for (const result of results) {
    const match = matchProject(result, projects)
    if (!match) continue
    const sessionId = "codexSessionId" in result ? result.codexSessionId : result.claudeSessionId
    // Old Electron versions do not return actual ranges. Do not fabricate them from durationSeconds.
    for (const interval of result.activityIntervals ?? []) {
      if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end) || interval.end < interval.start) continue
      activities.push({ ...interval, source, id: `${source}:${sessionId}:${interval.start}`,
        projectId: match.projectId, projectName: projects.find(p => p.id === match.projectId)?.name ?? "" })
    }
  }
  return activities
}

export function workScanSupported(): boolean {
  if (typeof window === "undefined") return false
  const electron = (window as any).electron
  return typeof electron?.scanClaudeSessions === "function" && typeof electron?.scanCodexSessions === "function"
}

export async function scanWorkActivities(projects: Project[]): Promise<{ activities: WorkActivity[]; failed: WorkActivity["source"][]; outdated: boolean }> {
  const scans = await Promise.allSettled([scanClaudeSessions(), scanCodexSessions()])
  const sources = ["claude-code", "codex"] as const
  const activities: WorkActivity[] = []
  const failed: WorkActivity["source"][] = []
  let outdated = false
  scans.forEach((scan, index) => {
    if (scan.status === "rejected") { failed.push(sources[index]); return }
    if (scan.value.some(result => !result.activityIntervals)) outdated = true
    activities.push(...activitiesFromScan(scan.value, sources[index], projects))
  })
  return { activities, failed, outdated }
}
