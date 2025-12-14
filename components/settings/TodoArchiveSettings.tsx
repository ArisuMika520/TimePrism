"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useNotification } from "@/components/ui/notification"
import { Loader2 } from "lucide-react"

const DEFAULT_SETTINGS = {
  autoArchiveEnabled: true,
  autoArchiveTime: "09:00",
  unfinishedGraceDays: 1,
  unfinishedGraceUnit: "DAY" as "DAY" | "HOUR",
  cleanupFinishedAfterDays: 90,
  cleanupUnfinishedAfterDays: 30,
}

type ArchiveSettingsState = typeof DEFAULT_SETTINGS

export function TodoArchiveSettings() {
  const { showSuccess, showError } = useNotification()
  const [settings, setSettings] = useState<ArchiveSettingsState>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/todo-archive-settings")
        if (!response.ok) {
          throw new Error("获取归档设置失败")
        }
        const data = await response.json()
        setSettings({
          autoArchiveEnabled: data.autoArchiveEnabled,
          autoArchiveTime: data.autoArchiveTime,
          unfinishedGraceDays: data.unfinishedGraceDays,
          unfinishedGraceUnit: data.unfinishedGraceUnit ?? "DAY",
          cleanupFinishedAfterDays: data.cleanupFinishedAfterDays ?? null,
          cleanupUnfinishedAfterDays: data.cleanupUnfinishedAfterDays ?? null,
        })
      } catch (error) {
        console.error(error)
        showError("加载失败", error instanceof Error ? error.message : "请稍后重试")
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [showError])

  const handleNumberChange = (
    key: keyof ArchiveSettingsState,
    value: string,
    allowNull = false
  ) => {
    if (allowNull && value.trim() === "") {
      setSettings((prev) => ({ ...prev, [key]: null }))
      return
    }
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      setSettings((prev) => ({ ...prev, [key]: parsed }))
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/todo-archive-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "保存失败")
      }
      showSuccess("设置已保存", "新的自动归档规则会立即生效")
    } catch (error) {
      console.error(error)
      showError("保存失败", error instanceof Error ? error.message : "请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载归档设置...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>自动归档</CardTitle>
          <CardDescription>配置每日自动归档的开启时间与逾期策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="font-medium">启用自动归档</p>
              <p className="text-sm text-muted-foreground">
                到达设定时间后系统会自动处理已完成与逾期任务
              </p>
            </div>
            <Checkbox
              checked={settings.autoArchiveEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoArchiveEnabled: Boolean(checked) }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>每日触发时间</Label>
              <Input
                type="time"
                value={settings.autoArchiveTime}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, autoArchiveTime: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">系统将在此时间开始扫描任务</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>未完成宽限</Label>
                <div className="flex rounded-full border bg-muted/50 p-1 gap-1">
                  {[
                    { label: "按天", value: "DAY" as const },
                    { label: "按小时", value: "HOUR" as const },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={settings.unfinishedGraceUnit === option.value ? "default" : "ghost"}
                      size="xs"
                      className="rounded-full px-3"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, unfinishedGraceUnit: option.value }))
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={settings.unfinishedGraceUnit === "DAY" ? 30 : 72}
                value={settings.unfinishedGraceDays}
                onChange={(event) => handleNumberChange("unfinishedGraceDays", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {settings.unfinishedGraceUnit === "DAY"
                  ? "逾期多少天后将未完成任务移动到 Unfinished 归档箱"
                  : "逾期多少小时后将未完成任务移动到 Unfinished 归档箱"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>归档清理策略</CardTitle>
          <CardDescription>定期清理陈旧的归档数据，保持收件箱清爽</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Finished 保留天数</Label>
            <Input
              type="number"
              min={0}
              placeholder="例如 90"
              value={settings.cleanupFinishedAfterDays ?? ""}
              onChange={(event) =>
                handleNumberChange("cleanupFinishedAfterDays", event.target.value, true)
              }
            />
            <p className="text-xs text-muted-foreground">
              超过该天数的 Finished 归档将自动清除，留空表示不清理
            </p>
          </div>
          <div className="space-y-2">
            <Label>Unfinished 保留天数</Label>
            <Input
              type="number"
              min={0}
              placeholder="例如 30"
              value={settings.cleanupUnfinishedAfterDays ?? ""}
              onChange={(event) =>
                handleNumberChange("cleanupUnfinishedAfterDays", event.target.value, true)
              }
            />
            <p className="text-xs text-muted-foreground">
              针对未完成归档的保留策略，留空表示永久保存
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存设置
        </Button>
      </div>
    </div>
  )
}

