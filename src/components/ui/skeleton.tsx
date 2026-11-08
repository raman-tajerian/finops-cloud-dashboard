import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppReducedMotion } from "@/components/motion";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const reduce = useAppReducedMotion();
  return <motion.div initial={reduce ? { opacity: 1 } : { opacity: 0.55 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className={cn("rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
