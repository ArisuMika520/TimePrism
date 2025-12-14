"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PromptDialogOptions {
  title: string
  message?: string
  defaultValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  type?: "text" | "url"
}

interface PromptDialog extends PromptDialogOptions {
  id: string
  resolve: (value: string | null) => void
}

interface PromptDialogContextType {
  prompt: (options: PromptDialogOptions) => Promise<string | null>
}

const PromptDialogContext = createContext<PromptDialogContextType | undefined>(undefined)

export function usePrompt() {
  const context = useContext(PromptDialogContext)
  if (!context) {
    throw new Error("usePrompt must be used within PromptDialogProvider")
  }
  return context
}

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<PromptDialog[]>([])

  const prompt = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      const id = `prompt-${Date.now()}-${Math.random()}`
      const dialog: PromptDialog = {
        ...options,
        id,
        resolve,
        confirmText: options.confirmText ?? "确认",
        cancelText: options.cancelText ?? "取消",
        type: options.type ?? "text",
      }
      setDialogs((prev) => [...prev, dialog])
    })
  }, [])

  const handleConfirm = useCallback((id: string, value: string | null) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id)
      if (dialog) {
        dialog.resolve(value)
        return prev.filter((d) => d.id !== id)
      }
      return prev
    })
  }, [])

  return (
    <PromptDialogContext.Provider value={{ prompt }}>
      {children}
      <PromptDialogContainer dialogs={dialogs} onConfirm={handleConfirm} />
    </PromptDialogContext.Provider>
  )
}

interface PromptDialogContainerProps {
  dialogs: PromptDialog[]
  onConfirm: (id: string, value: string | null) => void
}

function PromptDialogContainer({ dialogs, onConfirm }: PromptDialogContainerProps) {
  return (
    <AnimatePresence mode="wait">
      {dialogs.map((dialog) => (
        <PromptDialogItem
          key={dialog.id}
          dialog={dialog}
          onConfirm={onConfirm}
        />
      ))}
    </AnimatePresence>
  )
}

interface PromptDialogItemProps {
  dialog: PromptDialog
  onConfirm: (id: string, value: string | null) => void
}

function PromptDialogItem({ dialog, onConfirm }: PromptDialogItemProps) {
  const [value, setValue] = useState(dialog.defaultValue || "")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    if (dialog.type === "url") {
      try {
        new URL(value.trim())
        onConfirm(dialog.id, value.trim())
      } catch {
        setError("请输入有效的 URL")
      }
    } else {
      onConfirm(dialog.id, value.trim() || null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      onConfirm(dialog.id, null)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={() => onConfirm(dialog.id, null)}
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="pointer-events-auto w-full max-w-md rounded-lg shadow-xl border bg-background"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 p-2 rounded-full bg-blue-500/10 text-blue-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {dialog.title}
                </h3>
                {dialog.message && (
                  <p className="text-sm text-muted-foreground">{dialog.message}</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="prompt-input" className="sr-only">
                输入
              </Label>
              <Input
                id="prompt-input"
                type={dialog.type === "url" ? "url" : "text"}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError("")
                }}
                onKeyDown={handleKeyDown}
                placeholder={dialog.placeholder}
                className={cn(error && "border-red-500")}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>
              
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onConfirm(dialog.id, null)}
                className="min-w-[80px]"
              >
                {dialog.cancelText}
              </Button>
              <Button
                onClick={handleSubmit}
                className="min-w-[80px]"
              >
                {dialog.confirmText}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

