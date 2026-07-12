"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  /** Classes for the trigger button (defaults match Input height). */
  triggerClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function Select({
  id,
  value,
  onChange,
  options,
  disabled = false,
  className,
  triggerClassName,
  placeholder = "Select…",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      data-invalid={ariaInvalid ? "true" : undefined}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-background px-4 text-left text-base text-foreground transition-colors duration-fast",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
          open && "outline outline-2 outline-offset-0 outline-foreground",
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            !selected && "text-text-tertiary",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ArrowDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-fast",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border bg-surface-elevated py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full px-4 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-accent-subtle font-medium text-foreground"
                      : "font-medium text-foreground hover:bg-surface",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
