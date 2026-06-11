"use client"

import { useState, useEffect, useRef } from "react"
import type { Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { exportData, importData, exportCSV, downloadFile } from "@/lib/data-management"
import { toast } from "sonner"
import { useLicense } from "@/hooks/use-license"
import { activateLicense, deactivateLicense } from "@/lib/license"
import { PURCHASE_URL } from "@/lib/pro-limits"

import { ProjectList } from "./project-list"
import type { SyncSummary } from "@/lib/claude-sync"

interface SettingsViewProps {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  t: Record<string, string>
  isBillable: boolean
  onSyncClaude?: () => Promise<SyncSummary>
}

export function SettingsView({ settings, onSettingsChange, t, isBillable, onSyncClaude }: SettingsViewProps) {
  const [formData, setFormData] = useState<Settings>(settings)
  const { isPro, refresh: refreshLicense } = useLicense()
  const [licenseKeyInput, setLicenseKeyInput] = useState("")
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleSave = () => {
    onSettingsChange(formData)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackup = async () => {
    const json = await exportData()
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(json, `pomodoro-backup-${date}.json`, "application/json")
  }

  const handleExportCSV = async () => {
    // CSV 出力は Pro 機能。非 Pro は案内トーストのみ出して処理を止める。
    if (!isPro) {
      toast.error(t.csvProRequired)
      return
    }
    const csv = await exportCSV()
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `pomodoro-history-${date}.csv`, "text/csv")
  }

  const handleActivateLicense = async () => {
    const key = licenseKeyInput.trim()
    if (!key || activating) return
    setActivating(true)
    try {
      // activateLicense は public ではスタブ（常に無料を返す）、private 実体では
      // 署名検証して正当なら保存する。どちらでも同じ呼び出しで動く。
      const result = await activateLicense(key)
      if (result.isPro) {
        await refreshLicense()
        setLicenseKeyInput("")
        toast.success(t.licenseActivateSuccess)
      } else {
        toast.error(t.licenseActivateFail)
      }
    } finally {
      setActivating(false)
    }
  }

  const handleDeactivateLicense = async () => {
    await deactivateLicense()
    await refreshLicense()
    toast.success(t.licenseDeactivated)
  }

  const handleRestoreClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      const result = await importData(content)
      if (result.success) {
        toast.success(t.successImport)
        window.location.reload()
      } else {
        toast.error(t.failImport)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="py-6 space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{t.settings}</h2>

      {isBillable && (
        <>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">{t.billableMode}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultHourlyRate" className="text-muted-foreground">
                  {t.defaultHourlyRate} (¥)
                </Label>
                <Input
                  id="defaultHourlyRate"
                  type="number"
                  value={formData.defaultHourlyRate}
                  onChange={(e) => setFormData({ ...formData, defaultHourlyRate: Number(e.target.value) })}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">
                  {t.defaultHourlyRateDesc}
                </p>
              </div>
            </CardContent>
          </Card>

          <ProjectList defaultHourlyRate={formData.defaultHourlyRate} t={t} onSyncClaude={onSyncClaude} />
        </>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">{t.timer}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workDuration" className="text-muted-foreground">
              {t.workDuration} ({t.minutes})
            </Label>
            <Input
              id="workDuration"
              type="number"
              value={formData.workDuration}
              onChange={(e) => setFormData({ ...formData, workDuration: Number(e.target.value) })}
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="breakDuration" className="text-muted-foreground">
              {t.breakDuration} ({t.minutes})
            </Label>
            <Input
              id="breakDuration"
              type="number"
              value={formData.breakDuration}
              onChange={(e) => setFormData({ ...formData, breakDuration: Number(e.target.value) })}
              className="bg-input border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="longBreakDuration" className="text-muted-foreground">
                {t.longBreakDuration} ({t.minutes})
              </Label>
              <Input
                id="longBreakDuration"
                type="number"
                value={formData.longBreakDuration}
                onChange={(e) => setFormData({ ...formData, longBreakDuration: Number(e.target.value) })}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longBreakInterval" className="text-muted-foreground">
                {t.longBreakInterval}
              </Label>
              <Input
                id="longBreakInterval"
                type="number"
                value={formData.longBreakInterval}
                onChange={(e) => setFormData({ ...formData, longBreakInterval: Number(e.target.value) })}
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="allowOvertime" className="flex flex-col space-y-1">
              <span>{t.allowOvertime}</span>
            </Label>
            <Switch
              id="allowOvertime"
              checked={formData.allowOvertime}
              onCheckedChange={(checked) => setFormData({ ...formData, allowOvertime: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="countInterrupted" className="flex flex-col space-y-1">
              <span>{t.countInterruptedSessions}</span>
            </Label>
            <Switch
              id="countInterrupted"
              checked={formData.countInterruptedSessions}
              onCheckedChange={(checked) => setFormData({ ...formData, countInterruptedSessions: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="hideMoneyCount" className="flex flex-col space-y-1">
              <span>{t.hideMoneyCount || "金額表示を隠す（マウスオーバーで表示）"}</span>
            </Label>
            <Switch
              id="hideMoneyCount"
              checked={formData.hideMoneyCount}
              onCheckedChange={(checked) => setFormData({ ...formData, hideMoneyCount: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="idleDetection" className="flex flex-col space-y-1">
              <span>{t.idleDetection}</span>
            </Label>
            <Switch
              id="idleDetection"
              checked={formData.idleDetectionEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, idleDetectionEnabled: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {formData.idleDetectionEnabled && (
            <div className="space-y-2">
              <Label htmlFor="idleThreshold" className="text-muted-foreground">
                {t.idleThreshold} ({t.minutes})
              </Label>
              <Input
                id="idleThreshold"
                type="number"
                min={1}
                value={formData.idleThresholdMinutes}
                onChange={(e) => setFormData({ ...formData, idleThresholdMinutes: Number(e.target.value) })}
                className="bg-input border-border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="alarmSound">{t.alarmSound}</Label>
            <Select
              value={formData.alarmSound}
              onValueChange={(value: "bell" | "digital" | "none") => setFormData({ ...formData, alarmSound: value })}
            >
              <SelectTrigger id="alarmSound" className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bell">{t.soundBell}</SelectItem>
                <SelectItem value="digital">{t.soundDigital}</SelectItem>
                <SelectItem value="none">{t.soundNone}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">{t.language}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.language}
            onValueChange={(value: "ja" | "en") => setFormData({ ...formData, language: value })}
          >
            <SelectTrigger className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            {t.license}
            {isPro && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {t.proBadge}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">{t.licenseActive}</p>
              <p className="text-xs text-muted-foreground mb-2">{t.licenseActiveDesc}</p>
              <Button
                onClick={handleDeactivateLicense}
                variant="outline"
                className="w-full justify-start border-border text-foreground hover:bg-muted"
              >
                {t.deactivateLicense}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">{t.licenseProDesc}</p>
              <a href={PURCHASE_URL} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-amber-500 text-white hover:bg-amber-600">
                  {t.purchasePro}
                </Button>
              </a>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">{t.licenseKeyLabel}</Label>
                <div className="flex gap-2">
                  <Input
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder={t.licenseKeyPlaceholder}
                    className="bg-input border-border"
                  />
                  <Button
                    onClick={handleActivateLicense}
                    disabled={!licenseKeyInput.trim() || activating}
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted shrink-0"
                  >
                    {t.activateLicense}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">{t.dataManagement}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground">{t.backupJson}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t.backupDesc}</p>
              <Button onClick={handleBackup} variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted">
                {t.backupJson}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground">{t.restoreJson}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t.restoreDesc}</p>
              <Button onClick={handleRestoreClick} variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted">
                {t.restoreJson}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                {t.exportCsv}
                {!isPro && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {t.proBadge}
                  </span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">{t.csvDesc}</p>
              <Button onClick={handleExportCSV} variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted">
                {t.exportCsv}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        {t.save}
      </Button>
    </div>
  )
}
