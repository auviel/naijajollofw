"use client";

import { useState } from "react";

export function BlogShare() {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-2xl text-center">
      <p className="text-sm text-text-secondary">Share this article</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
