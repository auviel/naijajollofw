"use client";

import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type CheckoutSummaryRowProps = {
  label: string;
  value: string;
  secondaryValue?: string | null;
  verified?: boolean;
  onEdit: () => void;
  editLabel?: string;
  className?: string;
};

export function CheckoutSummaryRow({
  label,
  value,
  secondaryValue,
  verified = false,
  onEdit,
  editLabel,
  className,
}: CheckoutSummaryRowProps) {
  const accessibleEdit = editLabel ?? `Edit ${label.toLowerCase()}`;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">
          {value}
        </p>
        {secondaryValue ? (
          <p className="mt-0.5 break-words text-sm text-text-secondary">
            {secondaryValue}
          </p>
        ) : null}
        {verified ? (
          <span
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success"
            aria-label={`${label} verified`}
          >
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Verified
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-accent-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        aria-label={accessibleEdit}
      >
        Edit
      </button>
    </div>
  );
}
