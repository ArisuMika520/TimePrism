"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import Image from "next/image"
import Link from "next/link"
import { Moon, Sun, Menu, Search, Bell, User, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { signOut as nextAuthSignOut } from "next-auth/react"

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  onMenuClick?: () => void
}

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/messages/unread-count")
        if (response.ok) {
          const data = await response.json()
          setUnreadCount((data.notifications || 0) + (data.messages || 0))
        }
      } catch (error) {
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  if (unreadCount === 0) return null

  return (
    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center px-1">
      {unreadCount > 9 ? (
        <span className="text-[10px] text-white font-bold">9+</span>
      ) : (
        <span className="text-[10px] text-white font-bold">{unreadCount}</span>
      )}
    </span>
  )
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(user?.image)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    setAvatarUrl(user?.image)
  }, [user?.image])

  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      if (event.detail?.url) {
        setAvatarUrl(event.detail.url)
        setTimeout(() => {
          router.refresh()
        }, 200)
      }
    }

    window.addEventListener("avatar-updated", handleAvatarUpdate as EventListener)
    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdate as EventListener)
    }
  }, [router])

  const handleSignOut = async () => {
    try {
      await nextAuthSignOut({ 
        callbackUrl: "/auth/signin",
        redirect: true 
      })
    } catch (error) {
      console.error("退出登录失败:", error)
    }
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-card-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 transition-all duration-200">
      <div className="w-full flex h-12 sm:h-14 items-center px-3 sm:px-4 md:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4 flex-1">
          <Link href="/dashboard" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <Image
              src="/tp logo512.png"
              alt="TimePrism Logo"
              width={28}
              height={28}
              className="flex-shrink-0"
              priority
            />
            <span className="text-xl font-bold">TimePrism</span>
          </Link>

          <div className="hidden md:flex items-center w-full max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索..."
                className="pl-8"
                onFocus={() => setSearchOpen(true)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">切换主题</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => router.push("/dashboard/messages")}
          >
            <Bell className="h-5 w-5" />
            <NotificationBadge />
            <span className="sr-only">通知</span>
          </Button>
          <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={avatarUrl || user?.image || undefined} 
                    alt={user?.name || ""}
                    onError={() => setAvatarUrl(null)}
                  />
                  <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "用户"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false)
                  router.push("/dashboard/profile")
                }}
              >
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false)
                  router.push("/dashboard/settings")
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>设置</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false)
                  handleSignOut()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {searchOpen && (
        <div className="md:hidden border-t p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索..." className="pl-8" />
          </div>
        </div>
      )}
    </header>
  )
}

