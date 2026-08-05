import { cn } from "@/lib/utils/cn";
import { type InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const invalid =
      props["aria-invalid"] === true || props["aria-invalid"] === "true";
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-md border bg-background px-4 text-base text-foreground placeholder:text-text-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-error" : "border-border-strong",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
