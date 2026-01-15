"use client"

import { useState, useEffect } from "react"
import type { Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

      <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        {t.save}
      </Button>
    </div>
  )
}
