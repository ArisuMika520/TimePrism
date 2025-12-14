import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-105",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:scale-105",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80 hover:scale-105",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80 hover:scale-105",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/80 hover:scale-105",
        outline: "text-foreground hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  animated?: boolean
}

function Badge({ className, variant, animated = false, ...props }: BadgeProps) {
  if (animated) {
    return (
      <motion.div
        className={cn(badgeVariants({ variant }), className)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...props}
      />
    )
  }
  
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

