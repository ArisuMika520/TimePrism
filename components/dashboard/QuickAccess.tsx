"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { CheckSquare, LayoutGrid, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const quickAccessItems = [
  {
    href: "/dashboard/todos",
    label: "待办事项",
    icon: CheckSquare,
    color: "text-blue-500",
  },
  {
    href: "/dashboard/tasks",
    label: "任务看板",
    icon: LayoutGrid,
    color: "text-purple-500",
  },
  {
    href: "/dashboard/schedule",
    label: "日程安排",
    icon: Calendar,
    color: "text-green-500",
  },
]

export function QuickAccess() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      {quickAccessItems.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3,
              delay: index * 0.1,
            }}
          >
            <Link href={item.href} className="block">
              <Card hoverable className="cursor-pointer h-20 sm:h-24 flex items-center justify-center">
                <CardContent className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-0">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", item.color)} />
                  </motion.div>
                  <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}





