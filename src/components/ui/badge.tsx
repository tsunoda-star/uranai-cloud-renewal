import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        // brand accent badge: pale orange bg + AA-safe orange-strong text
        accent:
          "border-transparent bg-brand-rose-pale text-brand-teal-strong",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        // success uses AA-safe foreground (not white on green per anti-pattern)
        success: "border-transparent bg-brand-green/15 text-state-success-fg",
        warning: "border-transparent bg-brand-gold/20 text-state-warning-fg",
        destructive: "border-transparent bg-destructive/10 text-state-danger",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
