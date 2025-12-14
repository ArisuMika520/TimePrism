"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Home,
  CheckSquare,
  LayoutGrid,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SidebarProps {
  className?: string
  collapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
  onMobileLinkClick?: () => void
  userRole?: string | null
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: {
    text: string
    color: string
  }
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "首页", icon: Home },
  { href: "/dashboard/todos", label: "待办事项", icon: CheckSquare, badge: { text: "内测！", color: "text-green-500" } },
  { href: "/dashboard/tasks", label: "任务看板", icon: LayoutGrid, badge: { text: "开发！", color: "text-pink-500" } },
  { href: "/dashboard/schedule", label: "日程安排", icon: Calendar, badge: { text: "准备！", color: "text-orange-500" } },
  { href: "/dashboard/settings", label: "设置", icon: Settings },
]

export function Sidebar({ className, collapsed: controlledCollapsed, onCollapseChange, onMobileLinkClick, userRole }: SidebarProps) {
  const pathname = usePathname()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed
  const setCollapsed = (value: boolean) => {
    if (onCollapseChange) {
      onCollapseChange(value)
    } else {
      setInternalCollapsed(value)
    }
  }

  const menuItems: NavItem[] = [
    ...navItems,
    ...(userRole === 'ADMIN' ? [{ href: "/dashboard/admin", label: "用户管理", icon: Shield }] : []),
  ]

  const handleLinkClick = () => {
    if (onMobileLinkClick) {
      onMobileLinkClick()
    }
  }

  return (
    <motion.aside
      className={cn(
        "relative flex flex-col border-r border-card-border bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
      initial={false}
      animate={{
        width: collapsed ? 64 : 256,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="flex h-14 items-center border-b border-card-border px-4">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <Image
                src="/tp logo512.png"
                alt="TimePrism Logo"
                width={32}
                height={32}
                className="flex-shrink-0"
                priority
              />
              <span className="text-xl font-bold">TimePrism</span>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center w-full"
            >
              <Image
                src="/tp logo512.png"
                alt="TimePrism Logo"
                width={32}
                height={32}
                className="flex-shrink-0"
                priority
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href} className="block" onClick={handleLinkClick}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all duration-200",
                    isActive && "bg-accent text-accent-foreground shadow-sm",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2")} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 flex-1"
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={cn("text-xs font-normal", item.badge.color)}>
                            {item.badge.text}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-card-border p-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="w-full transition-all duration-200"
            onClick={() => setCollapsed(!collapsed)}
          >
            <motion.div
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </motion.div>
          </Button>
        </motion.div>
      </div>
    </motion.aside>
  )
}


