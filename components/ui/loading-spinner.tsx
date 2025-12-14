"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { spinVariants, pulseVariants } from "@/lib/animations"
import { Loader2 } from "lucide-react"

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  variant?: "spinner" | "pulse"
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

export function LoadingSpinner({
  size = "md",
  className,
  variant = "spinner",
}: LoadingSpinnerProps) {
  if (variant === "pulse") {
    return (
      <motion.div
        className={cn("rounded-full bg-primary", sizeMap[size], className)}
        variants={pulseVariants}
        animate="animate"
      />
    )
  }

  return (
    <motion.div
      className={cn("text-primary", sizeMap[size], className)}
      variants={spinVariants}
      animate="animate"
    >
      <Loader2 className={cn("h-full w-full", sizeMap[size])} />
    </motion.div>
  )
}

export interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  spinner?: React.ReactNode
}

export function LoadingOverlay({
  isLoading,
  children,
  spinner,
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {spinner || <LoadingSpinner size="lg" />}
        </motion.div>
      )}
    </div>
  )
}






