import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppReducedMotion } from "@/components/motion";
import { MOTION } from "@/lib/motion";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-[background-color,color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-none hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90",
        outline: "border border-border bg-card shadow-none hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-none hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-lg px-3 text-xs", lg: "h-11 rounded-xl px-8", icon: "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
const MotionSlot = motion.create(Slot);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const reduce = useAppReducedMotion();
  const Comp = asChild ? MotionSlot : motion.button;
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref}
    whileTap={reduce ? undefined : { scale: 0.98 }} transition={{ type: "spring", ...MOTION.spring }} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
