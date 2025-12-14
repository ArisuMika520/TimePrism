"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { cardHoverVariants, fadeVariants } from "@/lib/animations"

export interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  delay?: number
  children: React.ReactNode
}

export function AnimatedCard({
  className,
  hoverable = true,
  delay = 0,
  children,
  ...props
}: AnimatedCardProps) {
  const motionProps = hoverable
    ? {
        whileHover: "hover" as const,
        whileTap: "tap" as const,
      }
    : {}

  return (
    <motion.div
      className={cn(
        "rounded-lg border border-card-border bg-card text-card-foreground shadow-sm transition-all duration-200",
        hoverable && "cursor-pointer",
        className
      )}
      variants={hoverable ? cardHoverVariants : fadeVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...motionProps}
      transition={{
        duration: 0.2,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

