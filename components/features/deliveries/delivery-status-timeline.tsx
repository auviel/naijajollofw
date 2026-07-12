import type { DeliveryStatus } from "@/lib/domain/delivery/types";
import {
  buildDeliveryTimeline,
  type TimelineStep,
} from "@/lib/domain/delivery/timeline";
import { cn } from "@/lib/utils/cn";
import { Check, X } from "@/components/ui/icons";

type DeliveryStatusTimelineProps = {
  status: DeliveryStatus;
  hadScheduledPickup: boolean;
};

function StepIcon({ state }: { state: TimelineStep["state"] }) {
  if (state === "complete") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-text-inverse">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-accent-subtle">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
      </span>
    );
  }

  if (state === "skipped") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-text-tertiary">
        <span className="text-xs">—</span>
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-elevated">
      <span className="h-2.5 w-2.5 rounded-full border border-text-tertiary" aria-hidden />
    </span>
  );
}

export function DeliveryStatusTimeline({
  status,
  hadScheduledPickup,
}: DeliveryStatusTimelineProps) {
  const { steps, terminal } = buildDeliveryTimeline(status, hadScheduledPickup);

  if (terminal) {
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-5">
        <h2 className="text-lg font-semibold text-foreground">Status</h2>
        <div
          className={cn(
            "mt-4 flex items-start gap-3 rounded-md border p-4",
            terminal === "cancelled"
              ? "border-border bg-surface"
              : "border-error/20 bg-red-50",
          )}
        >
          <X
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              terminal === "cancelled" ? "text-text-tertiary" : "text-error",
            )}
            aria-hidden
          />
          <div>
            <p className="font-medium text-foreground">
              {terminal === "cancelled" ? "Delivery cancelled" : "Delivery failed"}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {terminal === "cancelled"
                ? "This delivery was cancelled and will not be completed."
                : "This delivery could not be completed. Contact support if you need help."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-5">
      <h2 className="text-lg font-semibold text-foreground">Status timeline</h2>
      <ol className="mt-6 space-y-0">
        {steps.map((step, index) => (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon state={step.state} />
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "my-1 w-px flex-1 min-h-6",
                    step.state === "complete" ? "bg-success/40" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className="pb-6 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "current" && "text-foreground",
                  step.state === "complete" && "text-text-secondary",
                  step.state === "upcoming" && "text-text-tertiary",
                  step.state === "skipped" && "text-text-tertiary line-through",
                )}
              >
                {step.label}
              </p>
              {step.state === "skipped" ? (
                <p className="text-xs text-text-tertiary">Not scheduled — ASAP pickup</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
