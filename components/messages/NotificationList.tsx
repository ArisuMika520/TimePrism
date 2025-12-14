"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, Trash2, ExternalLink } from "lucide-react"
import { useNotification } from "@/components/ui/notification"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface Notification {
  id: string
  type: string
  title: string
  content: string
  read: boolean
  link: string | null
  createdAt: string
  readAt: string | null
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { showNotification } = useNotification()

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?read=false&pageSize=50")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error("获取通知错误:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // 每30秒刷新一次
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
        )
      }
    } catch (error) {
      console.error("标记已读错误:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (response.ok) {
        showNotification({
          type: "success",
          title: "成功",
          message: "所有通知已标记为已读",
        })
        fetchNotifications()
      }
    } catch (error) {
      console.error("标记全部已读错误:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (error) {
      console.error("删除通知错误:", error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无通知</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>通知</CardTitle>
            <CardDescription>您有 {notifications.length} 条未读通知</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            全部已读
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] overflow-y-auto">
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.read ? "bg-muted/50" : "bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{notification.title}</h4>
                      {!notification.read && (
                        <Badge variant="destructive" className="h-2 w-2 p-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                          查看详情
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

