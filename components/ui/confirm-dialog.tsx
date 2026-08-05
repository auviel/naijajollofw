"use client";

import { useEffect, useId, type ReactNode } from "react";
import { useBodyScrollLock } from "@/components/hooks/use-body-scroll-lock";
import { MotionModal } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  pending?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  pending = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  return (
    <MotionModal
      open={open}
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
      labelledBy={titleId}
      panelClassName="max-w-md flex-col overflow-visible p-5 sm:p-6"
    >
      <div className="w-full space-y-4">
        <div className="space-y-1">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
        {children}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "primary"}
            className="w-full sm:w-auto"
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
          >
            {pending ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </MotionModal>
  );
}
