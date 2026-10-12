"use client"

import { useEffect, useState } from "react"
import { getUpdateAPI, type UpdateStatus } from "@/lib/app-updates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AppUpdates({ t }: { t: Record<string, string> }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [failed, setFailed] = useState(false)
  const [requesting, setRequesting] = useState(false)
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
  const check = async () => {
    const api = getUpdateAPI()
    if (!api) return
    setRequesting(true)
    try {
      const next = await api.checkForUpdates()
      setStatus(previous => !previous || next.revision >= previous.revision ? next : previous)
      setFailed(false)
    } catch { setFailed(true) }
    finally { setRequesting(false) }
  }
  if (!getUpdateAPI()) return null
  const busy = requesting || status?.status === "checking" || status?.status === "downloading"
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
        {status?.status !== "disabled" && <Button variant="outline" onClick={check} disabled={busy || status?.status === "downloaded"}>{t.updateCheck}</Button>}
      </CardContent>
    </Card>
  )
}
