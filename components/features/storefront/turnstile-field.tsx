"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { THIRD_PARTY_BLOCKED } from "@/lib/utils/third-party-blocked";

const LOAD_TIMEOUT_MS = 12_000;

type TurnstileStatus = "loading" | "waiting" | "ready" | "blocked" | "error";

type TurnstileFieldProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
  /** Fires when widget load/ready/blocked state changes (for enabling CTAs). */
  onStatusChange?: (status: TurnstileStatus) => void;
  /**
   * Bump this after a failed auth attempt so the widget resets and issues a
   * fresh token (Turnstile tokens are single-use).
   */
  resetKey?: number;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          "timeout-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
        },
      ) => string;
      remove: (widgetId?: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

export type { TurnstileStatus };

export function TurnstileField({
  siteKey,
  onToken,
  onStatusChange,
  resetKey = 0,
}: TurnstileFieldProps) {
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onStatusRef = useRef(onStatusChange);
  const lastResetKeyRef = useRef(resetKey);
  onTokenRef.current = onToken;
  onStatusRef.current = onStatusChange;

  const [status, setStatus] = useState<TurnstileStatus>("loading");
  const [scriptKey, setScriptKey] = useState(0);

  const setStatusSafe = useCallback((next: TurnstileStatus) => {
    setStatus(next);
    onStatusRef.current?.(next);
  }, []);

  const destroyWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget may already be gone after a blocked/partial load.
      }
      widgetIdRef.current = null;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || widgetIdRef.current) {
      return false;
    }
    const el = document.getElementById(containerId);
    if (!el) {
      return false;
    }
    el.replaceChildren();
    widgetIdRef.current = window.turnstile.render(el, {
      sitekey: siteKey,
      theme: "light",
      size: "flexible",
      callback: (token) => {
        setStatusSafe("ready");
        onTokenRef.current(token);
      },
      "expired-callback": () => {
        onTokenRef.current(null);
        setStatusSafe("waiting");
      },
      "error-callback": () => {
        onTokenRef.current(null);
        setStatusSafe("error");
      },
      "timeout-callback": () => {
        onTokenRef.current(null);
        setStatusSafe("error");
      },
    });
    setStatusSafe("waiting");
    return true;
  }, [containerId, setStatusSafe, siteKey]);

  useEffect(() => {
    setStatusSafe("loading");
    onTokenRef.current(null);

    function tryRender() {
      if (renderWidget()) {
        return;
      }
    }

    tryRender();
    const onReady = () => tryRender();
    window.addEventListener("turnstile-loaded", onReady);

    const timeout = window.setTimeout(() => {
      if (!widgetIdRef.current) {
        setStatusSafe("blocked");
        onTokenRef.current(null);
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("turnstile-loaded", onReady);
      destroyWidget();
      onTokenRef.current(null);
    };
  }, [containerId, destroyWidget, renderWidget, scriptKey, setStatusSafe, siteKey]);

  useEffect(() => {
    if (lastResetKeyRef.current === resetKey) {
      return;
    }
    lastResetKeyRef.current = resetKey;
    onTokenRef.current(null);

    if (!widgetIdRef.current || !window.turnstile) {
      // Widget not mounted yet — full remount path via scriptKey.
      destroyWidget();
      setScriptKey((key) => key + 1);
      setStatusSafe("loading");
      return;
    }

    try {
      window.turnstile.reset(widgetIdRef.current);
      setStatusSafe("waiting");
    } catch {
      destroyWidget();
      setScriptKey((key) => key + 1);
      setStatusSafe("loading");
    }
  }, [destroyWidget, resetKey, setStatusSafe]);

  function retry() {
    destroyWidget();
    onTokenRef.current(null);
    setStatusSafe("loading");
    setScriptKey((key) => key + 1);
  }

  const showHelp = status === "blocked" || status === "error";

  return (
    <div className="space-y-1.5">
      <Script
        key={scriptKey}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event("turnstile-loaded"));
          renderWidget();
        }}
        onError={() => {
          setStatusSafe("blocked");
          onTokenRef.current(null);
        }}
      />
      <div id={containerId} className="min-h-[65px]" />
      {status === "loading" ? (
        <p className="text-xs text-text-tertiary">Loading security check…</p>
      ) : null}
      {showHelp ? (
        <div className="space-y-2 rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-sm text-foreground" role="alert">
            {THIRD_PARTY_BLOCKED.turnstile}
          </p>
          <button
            type="button"
            onClick={retry}
            className="text-sm font-medium text-foreground underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">Protected by Cloudflare</p>
      )}
    </div>
  );
}
