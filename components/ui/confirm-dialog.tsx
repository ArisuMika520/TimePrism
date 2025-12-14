"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmDialogOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

interface ConfirmDialog extends ConfirmDialogOptions {
  id: string
  resolve: (value: boolean) => void
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined)

export function useConfirm() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider")
  }
  return context
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<ConfirmDialog[]>([])

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `confirm-${Date.now()}-${Math.random()}`
      const dialog: ConfirmDialog = {
        ...options,
        id,
        resolve,
        confirmText: options.confirmText ?? "确认",
        cancelText: options.cancelText ?? "取消",
        variant: options.variant ?? "default",
      }
      setDialogs((prev) => [...prev, dialog])
    })
  }, [])

  const handleConfirm = useCallback((id: string, value: boolean) => {
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
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialogContainer dialogs={dialogs} onConfirm={handleConfirm} />
    </ConfirmDialogContext.Provider>
  )
}

interface ConfirmDialogContainerProps {
  dialogs: ConfirmDialog[]
  onConfirm: (id: string, value: boolean) => void
}

function ConfirmDialogContainer({ dialogs, onConfirm }: ConfirmDialogContainerProps) {
  return (
    <AnimatePresence mode="wait">
      {dialogs.map((dialog) => (
        <ConfirmDialogItem
          key={dialog.id}
          dialog={dialog}
          onConfirm={onConfirm}
        />
      ))}
    </AnimatePresence>
  )
}

interface ConfirmDialogItemProps {
  dialog: ConfirmDialog
  onConfirm: (id: string, value: boolean) => void
}

function ConfirmDialogItem({ dialog, onConfirm }: ConfirmDialogItemProps) {
  const isDestructive = dialog.variant === "destructive"

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={() => onConfirm(dialog.id, false)}
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
              <div
                className={cn(
                  "flex-shrink-0 p-2 rounded-full",
                  isDestructive
                    ? "bg-red-500/10 text-red-500"
                    : "bg-blue-500/10 text-blue-500"
                )}
              >
                <AlertTriangle className="h-5 w-5" />
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

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => onConfirm(dialog.id, false)}
                className="min-w-[80px]"
              >
                {dialog.cancelText}
              </Button>
              <Button
                variant={isDestructive ? "destructive" : "default"}
                onClick={() => onConfirm(dialog.id, true)}
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

