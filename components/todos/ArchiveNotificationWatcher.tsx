"use client"

import { useEffect } from "react"
import { useNotification } from "@/components/ui/notification"

const STORAGE_KEY = "timeprism-archive-notification"

export function ArchiveNotificationWatcher() {
  const { showInfo } = useNotification()

  useEffect(() => {
    let mounted = true

    const fetchLatest = async () => {
      try {
        const response = await fetch("/api/todo-archive-logs?latest=true")
        if (!response.ok) return
        const data = await response.json()
        if (!mounted) return
        const summary = data?.summary
        if (!summary || summary.total === 0) return

        const key = `${summary.date}-${summary.total}-${summary.finished}-${summary.unfinished}`
        if (sessionStorage.getItem(STORAGE_KEY) === key) {
          return
        }

        showInfo("今日自动归档完成", `共 ${summary.total} 条（完成 ${summary.finished} · 未完成 ${summary.unfinished}）`)
        sessionStorage.setItem(STORAGE_KEY, key)
      } catch (error) {
        console.error("获取归档提示失败:", error)
      }
    }

    fetchLatest()
    const timer = setInterval(fetchLatest, 1000 * 60 * 30)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [showInfo])

  return null
}





