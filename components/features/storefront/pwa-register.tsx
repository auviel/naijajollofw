"use client";

import { useEffect } from "react";

/** Registers the storefront service worker so the app is installable. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Private mode / blocked storage — ignore.
    });
  }, []);

  return null;
}
