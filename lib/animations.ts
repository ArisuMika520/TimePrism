import { Variants, Transition } from "framer-motion"

/**
 * 标准动画时长配置
 */
export const durations = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const

/**
 * 标准缓动函数
 */
export const easings = {
  smooth: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
} as const

/**
 * 标准过渡配置
 */
export const transitions: Record<string, Transition> = {
  smooth: {
    duration: durations.normal,
    ease: easings.smooth,
  },
  bounce: {
    duration: durations.slow,
    ease: easings.bounce,
  },
  fast: {
    duration: durations.fast,
    ease: easings.easeOut,
  },
  slow: {
    duration: durations.slower,
    ease: easings.smooth,
  },
}

/**
 * 淡入淡出动画变体
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

/**
 * 从上方滑入动画变体
 */
export const slideInFromTopVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

/**
 * 从下方滑入动画变体
 */
export const slideInFromBottomVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

/**
 * 从左侧滑入动画变体
 */
export const slideInFromLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

/**
 * 从右侧滑入动画变体
 */
export const slideInFromRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

/**
 * 缩放动画变体
 */
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

/**
 * 缩放弹跳动画变体
 */
export const scaleBounceVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.8 },
}

/**
 * 列表项动画变体
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: durations.normal,
      ease: easings.easeOut,
    },
  }),
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: durations.fast,
    },
  },
}

/**
 * 列表容器动画变体
 */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
}

/**
 * 卡片悬停动画变体
 */
export const cardHoverVariants: Variants = {
  rest: { 
    scale: 1,
    y: 0,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  },
  hover: { 
    scale: 1.02,
    y: -4,
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: durations.fast,
    },
  },
}

/**
 * 抽屉/侧边栏动画变体
 */
export const drawerVariants: Variants = {
  hidden: {
    x: "-100%",
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
}

/**
 * 模态框动画变体
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
}

/**
 * 背景遮罩动画变体
 */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: durations.normal,
    },
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: durations.fast,
    },
  },
}

/**
 * 页面过渡动画变体
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easings.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
}

/**
 * 加载旋转动画变体
 */
export const spinVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
}

/**
 * 脉冲动画变体
 */
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easings.easeInOut,
    },
  },
}

/**
 * 摇晃动画变体（用于错误提示）
 */
export const shakeVariants: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: easings.easeOut,
    },
  },
}

/**
 * 创建自定义动画变体的辅助函数
 */
export function createVariants(
  hidden: { opacity?: number; x?: number; y?: number; scale?: number },
  visible: { opacity?: number; x?: number; y?: number; scale?: number },
  exit?: { opacity?: number; x?: number; y?: number; scale?: number },
  transition?: Transition
): Variants {
  return {
    hidden: {
      ...hidden,
      transition: transition || transitions.smooth,
    },
    visible: {
      ...visible,
      transition: transition || transitions.smooth,
    },
    exit: exit
      ? {
          ...exit,
          transition: transition || transitions.fast,
        }
      : undefined,
  }
}

/**
 * 检查用户是否偏好减少动画
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * 根据用户偏好调整动画配置
 */
export function getAnimationConfig(
  defaultConfig: Transition,
  reducedConfig?: Transition
): Transition {
  if (prefersReducedMotion()) {
    return reducedConfig || { duration: 0.01 }
  }
  return defaultConfig
}






