import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { cardHoverVariants } from "@/lib/animations"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hoverable?: boolean
  }
>(({ className, hoverable = false, ...props }, ref) => {
  if (hoverable) {
    const { onDrag, onDragStart, onDragEnd, ...motionProps } = props as any
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg border border-card-border bg-card text-card-foreground shadow-sm transition-all duration-200",
          "cursor-pointer hover:shadow-md",
          className
        )}
        variants={cardHoverVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        {...motionProps}
      />
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-card-border bg-card text-card-foreground shadow-sm transition-all duration-200",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg sm:text-xl md:text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 sm:p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

