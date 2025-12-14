"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { pageTransitionVariants } from "@/lib/animations"

export interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

export interface PageTransitionWrapperProps {
  children: React.ReactNode
  key?: string | number
}

export function PageTransitionWrapper({ children, key }: PageTransitionWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={key}>
        {children}
      </PageTransition>
    </AnimatePresence>
  )
}

