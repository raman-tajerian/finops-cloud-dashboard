// Shared motion presets for the whole app. Transform/opacity plus SVG stroke
// drawing only; every timed preset stays inside the 200–700ms Motion v2 budget.
export const MOTION = {
  duration: { fast: 0.2, base: 0.24, slow: 0.36, number: 0.4, max: 0.7 },
  ease: [0.2, 0.8, 0.2, 1] as const,
  easeOut: [0.22, 1, 0.36, 1] as const,
  spring: { stiffness: 200, damping: 24 },
  springSoft: { stiffness: 120, damping: 20 },
  rise: 16, // px
  stagger: 0.04, // s between list items
  chartStagger: 0.03,
} as const;

/** Maps the session "Reduce motion" switch to the root MotionConfig setting. */
export const reducedMotionMode = (on: boolean): "always" | "user" => (on ? "always" : "user");

export const pageExit = { opacity: 0, transition: { duration: MOTION.duration.fast } } as const;
export const pageEnter = {
  initial: { opacity: 0, y: MOTION.rise },
  animate: { opacity: 1, y: 0, transition: { duration: MOTION.duration.base, ease: MOTION.ease } },
} as const;
