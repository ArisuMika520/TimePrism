"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationType = "success" | "error" | "info" | "warning"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, "id">) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider")
  }
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showNotification = useCallback((notification: Omit<Notification, "id">) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 3000,
    }
    setNotifications((prev) => [...prev, newNotification])

    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }, [removeNotification])

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showNotification({ type: "success", title, message })
    },
    [showNotification]
  )

  const showError = useCallback(
    (title: string, message?: string) => {
      showNotification({ type: "error", title, message })
    },
    [showNotification]
  )

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showNotification({ type: "info", title, message })
    },
    [showNotification]
  )

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showNotification({ type: "warning", title, message })
    },
    [showNotification]
  )

  return (
    <NotificationContext.Provider
      value={{ showNotification, showSuccess, showError, showInfo, showWarning }}
    >
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  )
}

interface NotificationContainerProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

function NotificationContainer({ notifications, onRemove }: NotificationContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onRemove: (id: string) => void
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const iconConfig = {
    success: { 
      icon: CheckCircle, 
      color: "text-green-500", 
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      iconBg: "bg-green-500/20",
    },
    error: { 
      icon: AlertCircle, 
      color: "text-red-500", 
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      iconBg: "bg-red-500/20",
    },
    info: { 
      icon: Info, 
      color: "text-blue-500", 
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      iconBg: "bg-blue-500/20",
    },
    warning: { 
      icon: AlertTriangle, 
      color: "text-orange-500", 
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      iconBg: "bg-orange-500/20",
    },
  }

  const config = iconConfig[notification.type]
  const Icon = config.icon
  const isSuccess = notification.type === "success"

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8, rotateY: -15 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1, 
        rotateY: 0,
        ...(isSuccess && {
          scale: [0.8, 1.05, 1],
        }),
      }}
      exit={{ opacity: 0, x: 300, scale: 0.8, rotateY: -15 }}
      transition={{
        type: "spring",
        stiffness: isSuccess ? 400 : 500,
        damping: isSuccess ? 25 : 30,
        mass: 0.8,
        ...(isSuccess && {
          scale: {
            times: [0, 0.6, 1],
            duration: 0.5,
          },
        }),
      }}
      className={cn(
        "pointer-events-auto w-96 max-w-[calc(100vw-2rem)] rounded-lg shadow-xl border-2 backdrop-blur-sm",
        "bg-background/95",
        config.bgColor,
        config.borderColor,
        isSuccess && "ring-2 ring-green-500/30 ring-offset-2 ring-offset-background"
      )}
      layout
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <motion.div
            initial={isSuccess ? { scale: 0, rotate: -180 } : { scale: 0 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              delay: isSuccess ? 0.1 : 0,
            }}
            className={cn(
              "flex-shrink-0 p-2 rounded-full",
              config.iconBg,
              config.color
            )}
          >
            <Icon className={cn("h-5 w-5", isSuccess && "drop-shadow-sm")} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h4
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isSuccess ? 0.15 : 0.1 }}
              className={cn(
                "text-sm font-semibold",
                isSuccess ? "text-green-700 dark:text-green-400" : "text-foreground"
              )}
            >
              {notification.title}
            </motion.h4>
            {notification.message && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isSuccess ? 0.2 : 0.15 }}
                className="mt-1 text-sm text-muted-foreground"
              >
                {notification.message}
              </motion.p>
            )}
          </div>
          <button
            onClick={() => onRemove(notification.id)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-background/50 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

