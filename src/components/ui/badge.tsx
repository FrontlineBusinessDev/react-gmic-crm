import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-blue-500 text-white",
        secondary: "border-transparent bg-ink-100 text-ink-700",
        outline: "border-ink-100 text-ink-700 bg-white",
        success: "border-transparent bg-brand-green-500/15 text-brand-green-600",
        warning: "border-transparent bg-amber-500/15 text-amber-700",
        destructive: "border-transparent bg-brand-crimson-500/15 text-brand-crimson-600",
        info: "border-transparent bg-brand-cyan-500/15 text-brand-cyan-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
