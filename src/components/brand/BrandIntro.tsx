import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/components/motion";
import { MOTION } from "@/lib/motion";

const KEY = "fern-brand-intro-seen";
const paths = [
  { d: "M13 30 C12 24 14 17 14 9 C14 12 16 12 17 11 C19 11 19 13 19 15 C19 21 21 26 20 30 Z", fill: "var(--brand-sand)", x: 0 },
  { d: "M2 30 L2 12 C2 6 6 2 10 2 C13 2 14 5 14 9 C14 17 12 24 13 30 Z", fill: "var(--brand-burgundy)", x: -24 },
  { d: "M30 30 L30 16 C30 11 27 8 24 8 C21 8 19 11 19 15 C19 21 21 26 20 30 Z", fill: "var(--brand-mustard)", x: 24 },
];

/** One 300ms gather + 600ms departure = the 900ms, skippable session intro. */
export function BrandIntro() {
  const reduce = useAppReducedMotion();
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"gather" | "leave">("gather");
  const [target, setTarget] = useState({ x: 0, y: 0, scale: 0.25 });

  useEffect(() => {
    if (reduce) return;
    try { if (sessionStorage.getItem(KEY)) return; } catch { /* storage can be unavailable */ }
    setShow(true);
  }, [reduce]);

  const finish = () => {
    try { sessionStorage.setItem(KEY, "1"); } catch { /* show again next load */ }
    setShow(false);
  };
  if (!show || reduce) return null;

  const leave = () => {
    const rect = document.querySelector("[data-brand-avatar]")?.getBoundingClientRect();
    if (rect) setTarget({ x: rect.x + rect.width / 2 - window.innerWidth / 2, y: rect.y + rect.height / 2 - window.innerHeight / 2, scale: rect.width / 96 });
    setPhase("leave");
  };

  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-background" initial={{ opacity: 1 }} animate={{ opacity: phase === "leave" ? 0 : 1 }} transition={{ duration: phase === "leave" ? 0.6 : 0.2 }} aria-label="Fjord Labs introduction">
      <motion.div className="size-24" initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={phase === "leave" ? { ...target, opacity: 0 } : { x: 0, y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: MOTION.easeOut }} onAnimationComplete={() => phase === "leave" && finish()}>
        <svg viewBox="-8 -4 48 40" className="size-full" role="img" aria-label="Fjord Labs">
          {paths.map((p, i) => <motion.path key={p.d} d={p.d} fill={p.fill} initial={{ x: p.x, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: MOTION.easeOut }} onAnimationComplete={i === paths.length - 1 ? leave : () => {}} />)}
        </svg>
      </motion.div>
      <button type="button" onClick={finish} className="pointer-events-auto absolute right-5 top-5 min-h-10 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground">Skip intro</button>
    </motion.div>
  );
}
