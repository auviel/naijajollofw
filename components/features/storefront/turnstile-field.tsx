"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

type TurnstileFieldProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
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
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
        },
      ) => string;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileField({ siteKey, onToken }: TurnstileFieldProps) {
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    function renderWidget() {
      if (!window.turnstile || widgetIdRef.current) {
        return;
      }
      const el = document.getElementById(containerId);
      if (!el) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        theme: "light",
        size: "flexible",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
    }

    renderWidget();
    const onReady = () => renderWidget();
    window.addEventListener("turnstile-loaded", onReady);

    return () => {
      window.removeEventListener("turnstile-loaded", onReady);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      onTokenRef.current(null);
    };
  }, [containerId, siteKey]);

  return (
    <div className="space-y-1.5">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event("turnstile-loaded"));
        }}
      />
      <div id={containerId} className="min-h-[65px]" />
      <p className="text-xs text-text-tertiary">Protected by Cloudflare</p>
    </div>
  );
}
