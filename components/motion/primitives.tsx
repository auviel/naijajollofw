"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import {
  easeOut,
  fadeOnly,
  modalScale,
  motionDuration,
  softSpring,
} from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type MotionOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Scrim click closes. Default true. */
  closeOnScrim?: boolean;
  className?: string;
  scrimClassName?: string;
  zIndexClassName?: string;
};

/** Shared scrim + AnimatePresence shell for sheets/modals. */
export function MotionOverlay({
  open,
  onClose,
  children,
  closeOnScrim = true,
  className,
  scrimClassName,
  zIndexClassName = "z-50",
}: MotionOverlayProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="motion-overlay"
          className={cn("fixed inset-0", zIndexClassName, className)}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduce ? motionDuration.fast : motionDuration.panel,
            ease: easeOut,
          }}
        >
          <button
            type="button"
            aria-label="Close"
            className={cn("absolute inset-0 bg-black/40", scrimClassName)}
            onClick={closeOnScrim ? onClose : undefined}
          />
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type MotionSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode | ((slot: "mobile" | "desktop") => ReactNode);
  mobileClassName?: string;
  desktopClassName?: string;
  labelledBy: string;
  desktopLabelledBy?: string;
};

export function MotionSheet({
  open,
  onClose,
  children,
  mobileClassName,
  desktopClassName,
  labelledBy,
  desktopLabelledBy,
}: MotionSheetProps) {
  const reduce = useReducedMotion();
  const openTransition = reduce
    ? { duration: motionDuration.fast, ease: easeOut }
    : softSpring;
  const closeTransition = { duration: motionDuration.panel, ease: easeOut };
  const mobileContent =
    typeof children === "function" ? children("mobile") : children;
  const desktopContent =
    typeof children === "function" ? children("desktop") : children;

  return (
    <MotionOverlay open={open} onClose={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,40rem)] flex-col rounded-t-2xl border border-border bg-background shadow-lg md:hidden",
          mobileClassName,
        )}
        initial={reduce ? { opacity: 0 } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "100%" }}
        transition={open ? openTransition : closeTransition}
      >
        {mobileContent}
      </motion.div>

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={desktopLabelledBy ?? labelledBy}
        className={cn(
          "absolute inset-y-0 right-0 hidden w-full max-w-md flex-col border-l border-border bg-background shadow-xl md:flex",
          desktopClassName,
        )}
        initial={reduce ? { opacity: 0 } : { x: "100%" }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: "100%" }}
        transition={open ? openTransition : closeTransition}
      >
        {desktopContent}
      </motion.div>
    </MotionOverlay>
  );
}

type MotionModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
  panelClassName?: string;
};

export function MotionModal({
  open,
  onClose,
  children,
  labelledBy,
  panelClassName,
}: MotionModalProps) {
  const reduce = useReducedMotion();
  const variants = reduce ? fadeOnly : modalScale;

  return (
    <MotionOverlay
      open={open}
      onClose={onClose}
      className="flex items-center justify-center p-4"
      scrimClassName="bg-black/50"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 flex max-h-[min(90dvh,880px)] w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-xl",
          panelClassName,
        )}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={
          reduce
            ? { duration: motionDuration.fast, ease: easeOut }
            : softSpring
        }
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </MotionOverlay>
  );
}

type MotionPageProps = {
  children: ReactNode;
  className?: string;
  /** Stable key per route — usually pathname. */
  routeKey: string;
};

export function MotionPage({ children, className, routeKey }: MotionPageProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        className={className}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: motionDuration.page, ease: easeOut }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
