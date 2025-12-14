"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { listContainerVariants, listItemVariants } from "@/lib/animations"

export interface AnimatedListProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode
  className?: string
}

export function AnimatedList({ className, children, ...props }: AnimatedListProps) {
  return (
    <motion.ul
      className={cn("space-y-2", className)}
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...(props as any)}
    >
      {React.Children.map(children, (child, index) => (
        <motion.li
          key={index}
          variants={listItemVariants}
          custom={index}
        >
          {child}
        </motion.li>
      ))}
    </motion.ul>
  )
}

export interface AnimatedListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode
  index?: number
}

export function AnimatedListItem({ 
  className, 
  children, 
  index = 0,
  ...props 
}: AnimatedListItemProps) {
  return (
    <motion.li
      className={className}
      variants={listItemVariants}
      custom={index}
      {...(props as any)}
    >
      {children}
    </motion.li>
  )
}






