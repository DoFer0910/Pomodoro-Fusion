"use client"

import { useEffect, useState } from "react"
import { Clock3, Check, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import type { AttendanceController } from "@/hooks/use-attendance"
import { localDate, dayBounds, dailyWork, recordEnd, missingWorkCandidates, confirmedWorkText, type WorkRecord, type WorkCandidate } from "@/lib/attendance"

type Texts = Record<string, string>

function durationText(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}
function inputTime(ms: number): string {
  const d = new Date(ms)
  return `${localDate(ms)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}
function displayTime(ms: number): string { return inputTime(ms).replace("T", " ") }

export function AttendancePrompt({ controller: c, t, onReview, compact = false }: {
  controller: AttendanceController; t: Texts; onReview: () => void; compact?: boolean
}) {
  const candidate = c.liveCandidate
  if (!candidate || !c.ready) return null
  if (compact) return <Button size="sm" variant="outline" onClick={onReview} className="fixed top-1 left-1 right-1 z-50">{t.wrLiveTitle}</Button>
  return <section aria-label={t.wrLiveTitle} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 my-4 space-y-2">
    <h2 className="font-semibold">{t.wrLiveTitle}</h2>
    <p className="text-sm">{t.wrLiveBody}</p>
    <p className="text-sm font-mono break-words">{candidate.projectName} · {displayTime(candidate.start)}</p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={c.busy} onClick={async () => { if (await c.transition("start", candidate.projectId, candidate.start)) c.dismissLive() }}>{t.wrFromCandidate}</Button>
      <Button size="sm" variant="outline" disabled={c.busy} onClick={async () => { if (await c.transition("start", candidate.projectId)) c.dismissLive() }}>{t.wrFromNow}</Button>
      <Button size="sm" variant="outline" disabled={c.busy} onClick={() => c.ignoreCandidate(candidate)}>{t.wrIgnore}</Button>
      <Button size="sm" variant="ghost" onClick={onReview}>{t.wrReview}</Button>
      <Button size="sm" variant="ghost" onClick={c.dismissLive}>{t.wrLater}</Button>
    </div>
    {c.error && <p role="alert" className="text-sm text-destructive">{t[c.error] ?? t.wrSaveFailed}</p>}
  </section>
}

export function AttendanceView({ controller: c, t }: { controller: AttendanceController; t: Texts }) {
  const [date, setDate] = useState(localDate(Date.now()))
  const [projectId, setProjectId] = useState("")
  const [editor, setEditor] = useState<WorkRecord | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const open = c.data.records.find(r => r.end === null)
  useEffect(() => { void c.refreshProjects() }, [c.refreshProjects])
  useEffect(() => { setProjectId(open?.projectId ?? "") }, [open?.id, open?.projectId])
  const day = dayBounds(date)
  const records = c.data.records.filter(r => r.start < day.end && recordEnd(r, c.now) > day.start).sort((a, b) => a.start - b.start)
  const activities = c.activities.filter(a => a.start < day.end && a.end >= day.start)
  const candidates = missingWorkCandidates(activities, c.data, date, c.now)
  const total = dailyWork(c.data, date, c.now)
  const confirmedText = confirmedWorkText(c.data)
  const makeManual = () => {
    const end = Math.min(day.start + 10 * 3600000, c.now)
    setEditor({ id: crypto.randomUUID(), kind: "work", start: Math.max(day.start, end - 3600000), end })
  }
  const editCandidate = (candidate: WorkCandidate) => setEditor({ id: crypto.randomUUID(), kind: "work",
    start: candidate.start, end: candidate.end > candidate.start ? candidate.end : Math.min(c.now, candidate.start + 60000),
    projectId: candidate.projectId, projectName: candidate.projectName })

  if (!c.ready) return <section className="py-8 space-y-3">
    <p>{c.error ? t[c.error] ?? t.wrLoadFailed : t.wrLoading}</p>
    {c.error && <Button onClick={c.load}>{t.wrRetry}</Button>}
  </section>

  return <div className="py-5 space-y-5">
    <div><h1 className="text-xl font-bold">{t.workRecords}</h1><p className="text-sm text-muted-foreground mt-1">{t.wrIntro}</p></div>
    <section className="rounded-xl border bg-card p-4 space-y-3" aria-label={t.wrWorking}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" />{open ? open.kind === "work" ? t.wrWorking : t.wrOnBreak : t.wrStopped}</div>
        {open && <span className="font-mono text-lg tabular-nums">{durationText(c.now - open.start)}</span>}
      </div>
      {open?.id === c.restoredId && <p className="text-sm text-amber-600 dark:text-amber-400" role="status">{t.wrRestored}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <Label htmlFor="work-project">{t.wrProject}</Label>
          <select id="work-project" className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={projectId} onChange={e => setProjectId(e.target.value)} disabled={c.busy || open?.kind === "break"}>
            <option value="">{t.wrNoProject}</option>
            {c.projects.filter(p => !p.archived || p.id === open?.projectId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {open?.kind === "work" && projectId !== (open.projectId ?? "") && <Button variant="outline" disabled={c.busy} onClick={() => c.transition("switch", projectId)}>{t.wrSwitch}</Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!open && <Button disabled={c.busy} onClick={() => c.transition("start", projectId)}>{t.wrStart}</Button>}
        {open?.kind === "work" && <Button disabled={c.busy} onClick={() => c.transition("break")}>{t.wrBreak}</Button>}
        {open?.kind === "break" && <Button disabled={c.busy} onClick={() => c.transition("resume")}>{t.wrResume}</Button>}
        {open && <Button variant="outline" disabled={c.busy} onClick={() => c.transition("finish")}>{t.wrFinish}</Button>}
      </div>
      {c.error && <p role="alert" className="text-sm text-destructive">{t[c.error] ?? t.wrSaveFailed}</p>}
    </section>

    <section className="space-y-3" aria-label={t.wrDay}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1"><Label htmlFor="review-date">{t.wrDay}</Label>
          <Input id="review-date" type="date" value={date} max={localDate(c.now)} onChange={e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setDate(e.target.value) }} className="w-44" />
        </div>
        <span role="status" className={`text-sm rounded-full px-3 py-1 ${c.data.reviews[date] ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>{c.data.reviews[date] ? t.wrConfirmed : t.wrDraft}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{t.wrWorkTime}</p><p data-testid="daily-work-time" className="text-xl font-mono tabular-nums">{durationText(total.workMs)}</p></div>
        <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{t.wrBreakTime}</p><p data-testid="daily-break-time" className="text-xl font-mono tabular-nums">{durationText(total.breakMs)}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border p-3 space-y-3">
          <h2 className="font-semibold">{t.wrHumanHeading}</h2>
          <Button size="sm" variant="outline" disabled={c.busy} onClick={makeManual}><Plus className="h-4 w-4" />{t.wrAdd}</Button>
          {!records.length && <p className="text-sm text-muted-foreground">{t.wrNoRecords}</p>}
          {records.map(record => <article key={record.id} className="border-t pt-3 space-y-1" data-testid="work-record">
            <div className="text-sm font-medium">{record.kind === "work" ? t.wrWork : t.wrRest} · {record.projectName || t.wrNoProject}</div>
            <p className="text-xs font-mono break-words">{displayTime(record.start)}<br />→ {record.end === null ? record.kind === "work" ? t.wrWorking : t.wrOnBreak : displayTime(record.end)}</p>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditor(record)} disabled={c.busy} aria-label={t.wrEdit}><Pencil className="h-3 w-3" />{t.wrEdit}</Button>
              <Button size="sm" variant="ghost" disabled={c.busy} aria-label={t.wrDelete} onClick={() => { if (window.confirm(t.wrDeleteConfirm)) void c.removeRecord(record.id) }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </article>)}
        </section>
        <section className="rounded-xl border p-3 space-y-3">
          <h2 className="font-semibold">{t.wrAIHeading}</h2>
          <p className="text-xs text-muted-foreground">{t.wrReferenceNote}</p>
          <Button size="sm" variant="outline" disabled={c.scanning || !c.supported} onClick={c.scan}><RefreshCw className={`h-3 w-3 ${c.scanning ? "animate-spin" : ""}`} />{c.scanning ? t.wrScanning : t.wrScan}</Button>
          {!c.supported && <p className="text-sm text-muted-foreground">{t.wrUnsupported}</p>}
          {c.scanError && <p role="alert" className="text-sm text-destructive">{t[c.scanError]}</p>}
          {!activities.length && <p className="text-sm text-muted-foreground">{t.wrNoActivities}</p>}
          {activities.map(activity => {
            const missing = candidates.filter(candidate => candidate.id === activity.id)
            return <article key={activity.id} className="border-t pt-3 space-y-2" data-testid="ai-reference">
              <p className="text-sm font-medium break-words">{activity.source === "codex" ? "Codex" : "Claude Code"} · {activity.projectName}</p>
              <p className="text-xs font-mono break-words">{displayTime(activity.start)}<br />→ {displayTime(activity.end)}</p>
              <p className={`text-xs ${missing.length ? "text-amber-600" : "text-muted-foreground"}`}>{missing.length ? t.wrMissing : t.wrCovered}</p>
              {c.data.ignored.some(decision => decision.activityId === activity.id) && <Button size="sm" variant="ghost" disabled={c.busy} onClick={() => c.undoDecision(activity.id)}>{t.wrUndoIgnore}</Button>}
              {missing.map(candidate => <div key={candidate.candidateId} className="rounded-md bg-muted/50 p-2 space-y-2">
                <p className="text-xs font-mono break-words">{displayTime(candidate.start)} → {displayTime(candidate.end)}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" disabled={c.busy} onClick={() => editCandidate(candidate)}>{t.wrCandidateAdd}</Button>
                  <Button size="sm" variant="ghost" disabled={c.busy} onClick={() => c.ignoreCandidate(candidate)}>{t.wrIgnore}</Button>
                </div>
              </div>)}
            </article>
          })}
        </section>
      </div>
      <p className="text-sm text-muted-foreground">{t.wrConfirmHint}</p>
      <Button disabled={c.busy || !!c.data.reviews[date]} onClick={() => c.confirmDay(date)}><Check className="h-4 w-4" />{t.wrConfirm}</Button>
    </section>

    <section className="rounded-xl border p-4 space-y-3" aria-label={t.wrCopiedHeading}>
      <h2 className="font-semibold">{t.wrCopiedHeading}</h2>
      <p className="text-xs text-muted-foreground">{t.wrCopyHint}</p>
      <Button variant="outline" disabled={!confirmedText} onClick={async () => {
        try { await navigator.clipboard.writeText(confirmedText); setCopyStatus(t.wrCopyDone) }
        catch { setCopyStatus(t.wrCopyFailed) }
      }}>{t.wrCopy}</Button>
      {copyStatus && <p role="status" className="text-sm">{copyStatus}</p>}
      <textarea aria-label={t.wrCopiedHeading} readOnly value={confirmedText} placeholder={t.wrEmptyConfirmed} className="w-full min-h-20 rounded-md border bg-background p-2 text-sm font-mono" />
    </section>
    {editor && <RecordEditor key={editor.id} record={editor} controller={c} t={t} onClose={() => setEditor(null)} />}
  </div>
}

function RecordEditor({ record, controller: c, t, onClose }: { record: WorkRecord; controller: AttendanceController; t: Texts; onClose: () => void }) {
  const [start, setStart] = useState(inputTime(record.start))
  const [end, setEnd] = useState(record.end === null ? "" : inputTime(record.end))
  const [kind, setKind] = useState(record.kind)
  const [projectId, setProjectId] = useState(record.projectId ?? "")
  const [localError, setLocalError] = useState<string | null>(null)
  return <Dialog open onOpenChange={open => { if (!open && !c.busy) onClose() }}>
    <DialogContent onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (c.busy) event.preventDefault() }} className="max-w-md">
      <DialogHeader><DialogTitle>{t.wrEdit}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        setLocalError(null)
        // Preserve sub-second boundaries when displayed fields have not been changed.
        const parsedStart = start === inputTime(record.start) ? record.start : new Date(start).getTime()
        const parsedEnd = !end ? null : record.end !== null && end === inputTime(record.end) ? record.end : new Date(end).getTime()
        if (!start || !Number.isFinite(parsedStart) || (!end && record.end !== null) || (end && !Number.isFinite(parsedEnd))) { setLocalError(t.wrInvalidTime); return }
        const project = c.projects.find(p => p.id === projectId)
        if (await c.saveRecord({ ...record, start: parsedStart, end: parsedEnd, kind,
          projectId: project?.id, projectName: project?.name ?? (projectId === "" && !record.projectId ? record.projectName : undefined) })) onClose()
      }}>
        <div className="space-y-1"><Label htmlFor="record-start">{t.wrStartTime}</Label><Input id="record-start" type="datetime-local" step="1" required value={start} onChange={e => setStart(e.target.value)} disabled={c.busy} /></div>
        <div className="space-y-1"><Label htmlFor="record-end">{t.wrEndTime}</Label><Input id="record-end" type="datetime-local" step="1" required={record.end !== null} value={end} onChange={e => setEnd(e.target.value)} disabled={c.busy} /></div>
        {record.end === null && <p className="text-xs text-muted-foreground">{t.wrOpenHint}</p>}
        <div className="space-y-1"><Label htmlFor="record-kind">{t.wrKind}</Label><select id="record-kind" value={kind} onChange={e => setKind(e.target.value as WorkRecord["kind"])} disabled={c.busy} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="work">{t.wrWork}</option><option value="break">{t.wrRest}</option></select></div>
        <div className="space-y-1"><Label htmlFor="record-project">{t.wrProject}</Label><select id="record-project" value={projectId} onChange={e => setProjectId(e.target.value)} disabled={c.busy} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="">{t.wrNoProject}</option>{c.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        {(localError || c.error) && <p role="alert" className="text-sm text-destructive">{localError || t[c.error!] || t.wrSaveFailed}</p>}
        <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={c.busy} onClick={onClose}>{t.wrCancel}</Button><Button type="submit" disabled={c.busy}>{t.wrSave}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
