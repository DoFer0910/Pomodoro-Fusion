"use client"

import { useEffect, useState } from "react"
import { getUpdateAPI, type UpdateStatus } from "@/lib/app-updates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTimerContext } from "./timer-context"

export function AppUpdates({ t }: { t: Record<string, string> }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [failed, setFailed] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [restartFailed, setRestartFailed] = useState(false)
  const { isRunning } = useTimerContext()
  useEffect(() => {
    const api = getUpdateAPI()
    if (!api) return
    let active = true
    const receive = (next: UpdateStatus) => {
      if (!active) return
      setFailed(false)
      setStatus(previous => !previous || next.revision >= previous.revision ? next : previous)
    }
    const unsubscribe = api.onUpdateStatus(receive)
    api.getUpdateStatus().then(receive).catch(() => { if (active) setFailed(true) })
    return () => { active = false; unsubscribe() }
  }, [])
  const restart = async () => {
    const api = getUpdateAPI()
    if (!api?.restartForUpdate || requesting || isRunning || status?.status !== "downloaded") return
    setRequesting(true)
    setRestartFailed(false)
    try {
      const next = await api.restartForUpdate()
      setStatus(previous => !previous || next.revision >= previous.revision ? next : previous)
    } catch { setRestartFailed(true) }
    finally { setRequesting(false) }
  }
  const check = async () => {
    const api = getUpdateAPI()
    if (!api) return
    setRequesting(true)
    setRestartFailed(false)
    try {
      const next = await api.checkForUpdates()
      setStatus(previous => !previous || next.revision >= previous.revision ? next : previous)
      setFailed(false)
    } catch { setFailed(true) }
    finally { setRequesting(false) }
  }
  if (!getUpdateAPI()) return null
  const busy = requesting || status?.status === "checking" || status?.status === "downloading" || status?.status === "restarting"
  const message = failed ? t.updateError : !status ? t.updateLoading
    : status.status === "disabled" ? t[`updateDisabled_${status.reason}`]
    : t[`update_${status.status}`]
  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base font-medium text-foreground">{t.appUpdates}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {status && <p className="text-sm">{t.updateVersion}: {status.version}</p>}
        <p role="status" className="text-sm">{message}{status?.status === "downloading" && ` ${status.percent ?? 0}%`}</p>
        {status?.updateVersion && <p className="text-xs text-muted-foreground">{t.updateNewVersion}: {status.updateVersion}</p>}
        <p className="text-xs text-muted-foreground">{t.updateTiming}</p>
        {status?.status === "downloaded" && getUpdateAPI()?.restartForUpdate && <>
          <Button onClick={restart} disabled={busy || isRunning}>{t.updateRestart}</Button>
          <p className="text-xs text-muted-foreground">{isRunning ? t.updateRestartTimerRunning : t.updateRestartTimerReset}</p>
          {restartFailed && <p role="alert" className="text-sm">{t.updateRestartError}</p>}
        </>}
        {status?.status !== "disabled" && <Button variant="outline" onClick={check} disabled={busy || status?.status === "downloaded"}>{t.updateCheck}</Button>}
      </CardContent>
    </Card>
  )
}
