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

interface SettingsViewProps {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  t: Record<string, string>
}

export function SettingsView({ settings, onSettingsChange, t }: SettingsViewProps) {
  const [formData, setFormData] = useState<Settings>(settings)

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleSave = () => {
    onSettingsChange(formData)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackup = () => {
    const json = exportData()
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(json, `pomodoro-backup-${date}.json`, "application/json")
  }

  const handleExportCSV = () => {
    const csv = exportCSV()
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `pomodoro-history-${date}.csv`, "text/csv")
  }

  const handleRestoreClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = importData(content)
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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">{t.billableMode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hourlyRate" className="text-muted-foreground">
              {t.hourlyRate} (¥)
            </Label>
            <Input
              id="hourlyRate"
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalAmount" className="text-muted-foreground">
              {t.monthlyGoal} (¥)
            </Label>
            <Input
              id="goalAmount"
              type="number"
              value={formData.goalAmount}
              onChange={(e) => setFormData({ ...formData, goalAmount: Number(e.target.value) })}
              className="bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

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
              <Label className="text-muted-foreground">{t.exportCsv}</Label>
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
