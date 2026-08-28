"use client";

import { useState } from "react";
import {
  Check,
  Facebook,
  Instagram,
  Link,
  WhatsApp,
  XTwitter,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type ShareActionsProps = {
  title: string;
  /** Absolute URL or path. Defaults to the current page URL. */
  url?: string;
  label?: string;
  align?: "center" | "start";
  className?: string;
};

const iconBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25";

function openShare(shareUrl: string) {
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

function resolveShareUrl(url?: string) {
  if (!url) return window.location.href;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${window.location.origin}${path}`;
}

export function ShareActions({
  title,
  url,
  label = "Share",
  align = "center",
  className,
}: ShareActionsProps) {
  const [copiedBy, setCopiedBy] = useState<"copy" | "instagram" | null>(null);

  async function copyLink(source: "copy" | "instagram") {
    try {
      await navigator.clipboard.writeText(resolveShareUrl(url));
      setCopiedBy(source);
      window.setTimeout(() => setCopiedBy(null), 2000);
    } catch {
      setCopiedBy(null);
    }
  }

  function pageUrl() {
    return resolveShareUrl(url);
  }

  const actions = [
    {
      id: "copy",
      ariaLabel: "Copy link",
      Icon: copiedBy === "copy" ? Check : Link,
      onClick: () => copyLink("copy"),
    },
    {
      id: "whatsapp",
      ariaLabel: "Share on WhatsApp",
      Icon: WhatsApp,
      onClick: () =>
        openShare(
          `https://wa.me/?text=${encodeURIComponent(`${title} ${pageUrl()}`)}`,
        ),
    },
    {
      id: "facebook",
      ariaLabel: "Share on Facebook",
      Icon: Facebook,
      onClick: () =>
        openShare(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl())}`,
        ),
    },
    {
      id: "instagram",
      ariaLabel: "Copy link for Instagram",
      Icon: Instagram,
      onClick: () => copyLink("instagram"),
    },
    {
      id: "x",
      ariaLabel: "Share on X",
      Icon: XTwitter,
      onClick: () =>
        openShare(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl())}&text=${encodeURIComponent(title)}`,
        ),
    },
  ] as const;

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-1 gap-y-1",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <p className="mr-1 text-sm text-text-secondary">{label}</p>
        {actions.map(({ id, ariaLabel, Icon, onClick }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className={cn(
              iconBtnClass,
              copiedBy === id && "text-accent hover:text-accent",
            )}
          >
            <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </button>
        ))}
      </div>
      <p
        className={cn(
          "mt-1 text-xs text-text-tertiary transition-opacity",
          align === "center" ? "text-center" : "text-left",
          copiedBy ? "opacity-100" : "pointer-events-none absolute opacity-0",
        )}
        aria-live="polite"
      >
        Link copied
      </p>
    </div>
  );
}
