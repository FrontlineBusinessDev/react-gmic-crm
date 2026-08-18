import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-400 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-brand-blue-500 text-white shadow-sm hover:bg-brand-blue-600",
        destructive: "bg-brand-crimson-500 text-white shadow-sm hover:bg-brand-crimson-600",
        outline: "border border-ink-100 bg-white text-ink-800 shadow-sm hover:bg-ink-50",
        secondary: "bg-ink-100 text-ink-800 hover:bg-ink-100/80",
        ghost: "text-ink-700 hover:bg-ink-50",
        link: "text-brand-blue-500 underline-offset-4 hover:underline",
        brand: "brand-gradient text-white shadow-brand hover:opacity-90",
      },
      size: {
        default: "h-9 px-4 py-2 [&_svg]:size-4",
        sm: "h-8 rounded-md px-3 text-xs [&_svg]:size-3.5",
        lg: "h-11 rounded-md px-6 text-base [&_svg]:size-5",
        icon: "h-9 w-9 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
