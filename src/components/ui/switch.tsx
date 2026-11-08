import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppReducedMotion } from "@/components/motion";
import { MOTION } from "@/lib/motion";

const MotionThumb = motion.create(SwitchPrimitives.Thumb);
const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(({ className, checked, defaultChecked, onCheckedChange, ...props }, ref) => {
  const reduce = useAppReducedMotion();
  const [local, setLocal] = React.useState(Boolean(defaultChecked));
  const on = checked ?? local;
  return <SwitchPrimitives.Root checked={checked} defaultChecked={defaultChecked} onCheckedChange={(value) => { setLocal(value); onCheckedChange?.(value); }} className={cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className)} {...props} ref={ref}>
    <MotionThumb initial={false} animate={{ x: on ? 16 : 0 }} transition={reduce ? { duration: 0 } : { type: "spring", ...MOTION.spring }} className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0" />
  </SwitchPrimitives.Root>;
});
Switch.displayName = SwitchPrimitives.Root.displayName;
export { Switch };
