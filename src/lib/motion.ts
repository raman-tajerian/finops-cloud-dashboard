// Shared motion presets for the whole app. One source keeps every animation
// calm and consistent: only transform/opacity, 150-450ms, soft easing/springs.
export const MOTION = {
  duration: { fast: 0.15, base: 0.24, slow: 0.36, max: 0.45 },
  ease: [0.2, 0.8, 0.2, 1] as const,
  easeOut: [0.22, 1, 0.36, 1] as const,
  spring: { stiffness: 200, damping: 24 },
  springSoft: { stiffness: 120, damping: 20 },
  rise: 8, // px
  stagger: 0.04, // s between list items
} as const;

/** Page transition: outgoing fades (120ms), incoming fades and rises 8px (240ms). */
export const pageExit = { opacity: 0, transition: { duration: 0.12 } } as const;
export const pageEnter = {
  initial: { opacity: 0, y: MOTION.rise },
  animate: { opacity: 1, y: 0, transition: { duration: MOTION.duration.base, ease: MOTION.ease } },
} as const;
