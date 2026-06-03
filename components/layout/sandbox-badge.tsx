"use client";

import { useEffect, useId, useRef, useState } from "react";

export const SANDBOX_MODE_MESSAGE =
  "Test mode — robo courier enabled. No real drivers will be dispatched.";

export function SandboxBadge() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center rounded-full bg-sandbox-banner px-3 py-1 text-xs font-medium text-sandbox-text transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Test mode
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-amber-200 bg-sandbox-banner p-3 text-left text-xs leading-relaxed text-sandbox-text shadow-md sm:w-72 sm:text-sm"
        >
          {SANDBOX_MODE_MESSAGE}
        </div>
      ) : null}
    </div>
  );
}
