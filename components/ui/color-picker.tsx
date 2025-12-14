"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  "#ef4444", 
  "#f97316", 
  "#f59e0b", 
  "#eab308", 
  "#84cc16", 
  "#22c55e", 
  "#10b981", 
  "#14b8a6", 
  "#06b6d4", 
  "#3b82f6", 
  "#2563eb", 
  "#6366f1", 
  "#8b5cf6", 
  "#a855f7", 
  "#d946ef", 
  "#ec4899", 
  "#6b7280", 
  "#374151", 
]

interface ColorPickerProps {
  value?: string | null
  onChange: (color: string | null) => void
  label?: string
}

export function ColorPicker({ value, onChange, label = "颜色" }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value || "#3b82f6")

  const handlePresetClick = (color: string) => {
    onChange(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onChange(color)
  }

  const handleClear = () => {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
          >
            <div
              className="h-4 w-4 rounded-full mr-2 border"
              style={{
                backgroundColor: value || "transparent",
                borderColor: value || "#e5e7eb",
              }}
            />
            {value ? (
              <span className="font-mono text-sm">{value}</span>
            ) : (
              <span className="text-muted-foreground">选择颜色</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">预设颜色</div>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-md border-2 transition-all hover:scale-110",
                      value === color ? "border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePresetClick(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">自定义颜色</div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="h-10 w-full rounded-md border cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleClear}
              >
                清除颜色
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Label({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" {...props}>
      {children}
    </label>
  )
}

