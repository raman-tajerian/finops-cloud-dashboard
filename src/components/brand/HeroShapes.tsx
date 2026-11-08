import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useAppReducedMotion } from "@/components/motion";
import { MOTION } from "@/lib/motion";

/** Pointer drift is clamped to 8px and never installed on touch/reduced motion. */
export function HeroShapes() {
  const reduce = useAppReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const springX = useSpring(x, MOTION.springSoft), springY = useSpring(y, MOTION.springSoft);
  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (event: PointerEvent) => {
      if (document.hidden) return;
      x.set(Math.max(-8, Math.min(8, (event.clientX / window.innerWidth - 0.5) * 16)));
      y.set(Math.max(-8, Math.min(8, (event.clientY / window.innerHeight - 0.5) * 16)));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, x, y]);
  return (
    <motion.svg aria-hidden viewBox="0 0 220 90" width={220} height={90} style={reduce ? undefined : { x: springX, y: springY }} className="pointer-events-none absolute bottom-2 right-2 hidden md:block">
      <path d="M40 90 V2 A88 88 0 0 1 128 90 Z" className="fill-brand-burgundy" />
      <circle cx="132" cy="30" r="28" className="fill-brand-mustard" />
      <rect x="160" y="36" width="56" height="52" rx="20" className="fill-brand-sand" />
    </motion.svg>
  );
}
