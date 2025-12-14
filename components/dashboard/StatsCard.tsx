"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { cardHoverVariants } from "@/lib/animations"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  index?: number
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  index = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.div
        variants={cardHoverVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
      >
        <Card hoverable className={cn("cursor-pointer", className)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
              className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2"
            >
              {value}
            </motion.div>
            {description && (
              <p className="text-xs text-muted-foreground mb-1 sm:mb-2 line-clamp-2">{description}</p>
            )}
            {trend && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="flex items-center gap-1 mt-2"
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.isPositive 
                      ? "text-success" 
                      : "text-destructive"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground">vs 上月</span>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}


