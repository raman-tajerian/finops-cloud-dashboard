import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppReducedMotion } from "@/components/motion";
import { MOTION } from "@/lib/motion";

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({ className, ...props }, ref) => {
  const reduce = useAppReducedMotion();
  return <CheckboxPrimitive.Root ref={ref} className={cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className)} {...props}>
    <CheckboxPrimitive.Indicator className="grid place-content-center text-current">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path d="M20 6 9 17l-5-5" initial={reduce ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: MOTION.duration.base, ease: MOTION.easeOut }} />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
export { Checkbox };
