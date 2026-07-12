"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { X } from "@/components/ui/icons";
import { easeOut, motionDuration, toastSlide } from "@/lib/motion/tokens";

export type ToastVariant = "success" | "error";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, variant }]);

      if (variant === "success") {
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      }
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (message: string) => push(message, "success"),
      error: (message: string) => push(message, "error"),
    }),
    [push],
  );

  const variants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : toastSlide;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-0 z-50 flex w-full max-w-sm flex-col gap-3 px-4 sm:bottom-4 sm:right-4 sm:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ duration: motionDuration.chrome, ease: easeOut }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface-elevated p-4 shadow-sm",
                item.variant === "success" &&
                  "border-l-4 border-l-success border-border",
                item.variant === "error" &&
                  "border-l-4 border-l-error border-border",
              )}
              role="status"
            >
              <p className="flex-1 text-sm text-foreground">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md p-1 text-text-tertiary transition-colors hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
