import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-accent text-text-inverse hover:bg-accent-hover",
          variant === "secondary" &&
            "border border-border bg-accent-subtle text-foreground hover:bg-surface",
          variant === "outline" &&
            "border border-border-strong bg-transparent text-foreground hover:bg-surface",
          variant === "destructive" &&
            "border border-error text-error hover:bg-red-50",
          variant === "ghost" && "text-foreground hover:bg-surface",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
