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
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border bg-background px-4 text-left text-base text-foreground transition-colors duration-fast",
          ariaInvalid ? "border-error" : "border-border-strong",
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
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-surface-elevated py-1 shadow-md"
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

type MultiSelectProps = {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function multiSelectLabel(
  values: string[],
  options: SelectOption[],
  placeholder: string,
): string {
  if (values.length === 0) return placeholder;
  const labels = values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) return placeholder;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
  return `${labels[0]} +${labels.length - 1}`;
}

export function MultiSelect({
  id,
  values,
  onChange,
  options,
  disabled = false,
  className,
  triggerClassName,
  placeholder = "Select…",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: MultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(values);
  const label = multiSelectLabel(values, options, placeholder);

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

  function toggle(value: string) {
    const next = selectedSet.has(value)
      ? values.filter((entry) => entry !== value)
      : [...values, value];
    const ordered = options
      .map((option) => option.value)
      .filter((entry) => next.includes(entry));
    onChange(ordered);
  }

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
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border bg-background px-4 text-left text-base text-foreground transition-colors duration-fast",
          ariaInvalid ? "border-error" : "border-border-strong",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
          open && "outline outline-2 outline-offset-0 outline-foreground",
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            values.length === 0 && "text-text-tertiary",
          )}
        >
          {label}
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
          aria-multiselectable="true"
          aria-labelledby={id}
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-surface-elevated py-1 shadow-md"
        >
          {options.map((option) => {
            const isSelected = selectedSet.has(option.value);
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface",
                    isSelected && "bg-accent-subtle",
                  )}
                  onClick={() => toggle(option.value)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border-strong bg-background",
                    )}
                    aria-hidden
                  >
                    {isSelected ? (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                        <path
                          d="M2.5 6.5 5 9l4.5-5.5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
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
