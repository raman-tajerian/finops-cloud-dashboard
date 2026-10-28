// Reusable motion components built on the shared presets in src/lib/motion.ts.
// All respect prefers-reduced-motion via MotionConfig reducedMotion="user" in the root.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { MOTION, pageEnter, pageExit } from "@/lib/motion";

/** Fades the outgoing page and fades+rises the incoming one on every route change. */
export function PageTransition({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  if (reduce) return <>{children}</>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={path} {...pageEnter} exit={pageExit}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Mount reveal: fades in and rises 8px. Optional delay for staged entrances. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: MOTION.rise }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION.duration.slow, ease: MOTION.ease, delay }}>
      {children}
    </motion.div>
  );
}

/** Animated number that re-tweens whenever the value changes. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) { setShown(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration: MOTION.duration.max, ease: [...MOTION.easeOut], onUpdate: setShown });
    prev.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <>{format(shown)}</>;
}

/** List whose children fade+rise in with a small stagger. */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: MOTION.stagger } } }}>
      {children}
    </motion.div>
  );
}

/** Item inside a StaggerList. */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className}
      variants={{ hidden: { opacity: 0, y: MOTION.rise }, show: { opacity: 1, y: 0, transition: { duration: MOTION.duration.base, ease: MOTION.ease } } }}>
      {children}
    </motion.div>
  );
}
