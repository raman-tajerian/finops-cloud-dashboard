// Reusable Motion v2 primitives. Browser APIs are read in effects or event
// handlers, and both the OS preference and Fern's session switch are respected.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { MOTION, pageEnter, pageExit } from "@/lib/motion";
import { useSession } from "@/lib/session-store";

export function useAppReducedMotion() {
  const system = useReducedMotion();
  const session = useSession((s) => s.settings.reduceMotion);
  return Boolean(system || session);
}

/** Native View Transitions are enabled by the router; this is the fallback. */
export function PageTransition({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useAppReducedMotion();
  const [native, setNative] = useState(false);
  useEffect(() => { setNative("startViewTransition" in document); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  if (reduce || native) return <>{children}</>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={path} {...pageEnter} exit={pageExit}>{children}</motion.div>
    </AnimatePresence>
  );
}

/** Viewport reveal: one 16px rise, once, without delaying pointer interaction. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useAppReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: MOTION.rise }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }} transition={{ duration: MOTION.duration.slow, ease: MOTION.ease, delay }}>
      {children}
    </motion.div>
  );
}

type RollingText = { id: number; from: string; to: string } | null;

/** A true digit odometer: two stacked glyph rows roll once, then exact text is restored. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useAppReducedMotion();
  const [current, setCurrent] = useState(value);
  const [rolling, setRolling] = useState<RollingText>(null);
  const currentRef = useRef(value);
  const formatRef = useRef(format);
  formatRef.current = format;
  const idRef = useRef(0);

  useEffect(() => {
    if (currentRef.current === value) return;
    const from = formatRef.current(currentRef.current);
    const to = formatRef.current(value);
    if (reduce || from === to) {
      currentRef.current = value;
      setCurrent(value);
      setRolling(null);
      return;
    }
    const id = ++idRef.current;
    setRolling({ id, from, to });
    // Framer's animation clock is rAF-driven, so completion pauses in hidden tabs.
    const controls = animate(0, 1, {
      duration: MOTION.duration.number,
      ease: [...MOTION.easeOut],
      onComplete: () => {
        if (idRef.current !== id) return;
        currentRef.current = value;
        setCurrent(value);
        setRolling(null);
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  const finalText = format(current);
  const shown = rolling?.to ?? finalText;
  const width = Math.max(rolling?.from.length ?? 0, shown.length);
  return (
    <span className="relative inline-flex whitespace-pre tabular-nums" style={{ width: `${width}ch` }} aria-label={format(value)}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="inline-flex">
        {Array.from(shown).map((char, i) => {
          const previous = rolling?.from[i] ?? char;
          if (!rolling || !/\d/.test(char) || previous === char) return <span key={`${rolling?.id ?? "final"}-${i}`} className="inline-block w-[1ch] text-center">{char === " " ? " " : char}</span>;
          return (
            <span key={`${rolling.id}-${i}`} className="inline-block h-[1.2em] w-[1ch] overflow-hidden text-center align-top">
              <motion.span className="flex flex-col" initial={{ y: "0%" }} animate={{ y: "-50%" }} transition={{ duration: MOTION.duration.number, ease: MOTION.easeOut }}>
                <span className="h-[1.2em] leading-[1.2]">{previous}</span><span className="h-[1.2em] leading-[1.2]">{char}</span>
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Oura-style ring with a spring-drawn stroke and a morphing odometer center. */
export function ProgressRing({ value, label, size = 96, stroke = 7, color = "var(--primary)", decimals = 0, suffix = "%" }: {
  value: number; label: string; size?: number; stroke?: number; color?: string; decimals?: number; suffix?: string;
}) {
  const reduce = useAppReducedMotion();
  const id = useId();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - bounded / 100);
  const format = (n: number) => `${n.toFixed(decimals)}${suffix}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-labelledby={id}>
        <title id={id}>{label}: {format(value)}</title>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }} transition={reduce ? { duration: 0 } : { type: "spring", ...MOTION.springSoft }} />
      </svg>
      <span className="metric-numbers absolute inset-0 grid place-items-center text-sm font-medium"><AnimatedNumber value={value} format={format} /></span>
    </div>
  );
}

/** Transform-only chart reveal and crossfade for grouping/chart-type changes. */
export function ChartReveal({ children, className = "", motionKey = "chart" }: { children: ReactNode; className?: string; motionKey?: string }) {
  const reduce = useAppReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div className="h-full" key={motionKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: MOTION.duration.base }}>{children}</motion.div>
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 origin-right bg-card" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 0.5, ease: MOTION.easeOut }} />
    </div>
  );
}

/** Recharts bar shape with a baseline grow and a capped 30ms stagger. */
export function MotionBar({ x = 0, y = 0, width = 0, height = 0, fill = "var(--chart-1)", index = 0, radius = 6 }: {
  x?: number; y?: number; width?: number; height?: number; fill?: string; index?: number; radius?: number | number[];
}) {
  const reduce = useAppReducedMotion();
  const rx = Array.isArray(radius) ? Number(radius[0] ?? 0) : Number(radius);
  return <motion.rect x={x} y={y} width={width} height={height} rx={rx} fill={fill}
    style={{ transformOrigin: `${x + width / 2}px ${y + height}px` }}
    initial={reduce ? { scaleY: 1 } : { scaleY: 0 }} animate={{ scaleY: 1 }}
    transition={reduce ? { duration: 0 } : { duration: MOTION.duration.slow, delay: Math.min(index, 24) * MOTION.chartStagger, ease: MOTION.easeOut }} />;
}

export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useAppReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: MOTION.stagger } } }}>{children}</motion.div>;
}

export function StaggerItem({ children, className, index = 0 }: { children: ReactNode; className?: string; index?: number }) {
  return <motion.div layout={index < 25 ? "position" : false} className={className}
    variants={{ hidden: { opacity: 0, y: MOTION.rise }, show: { opacity: 1, y: 0, transition: { duration: MOTION.duration.base, ease: MOTION.ease } } }}>{children}</motion.div>;
}
