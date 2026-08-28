"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UIMessage } from "ai";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { Button } from "@/components/ui/button";
import { rememberCartSessionId } from "@/lib/utils/cart-session-client";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type CatalogCardItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  available: boolean;
  description?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getToolOutput(part: { type: string; output?: unknown }): unknown {
  return "output" in part ? part.output : undefined;
}

function ProductCards({
  items,
  onAdded,
}: {
  items: CatalogCardItem[];
  onAdded?: () => void;
}) {
  const router = useRouter();
  const { notifyItemAdded } = useStorefrontUi();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function addItem(item: CatalogCardItem) {
    setPendingId(item.id);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: item.id,
          quantity: 1,
          modifierIds: [],
        }),
      });
      if (!response.ok) return;
      const body = (await response.json().catch(() => ({}))) as {
        sessionId?: string | null;
      };
      rememberCartSessionId(body.sessionId);
      notifyItemAdded({ name: item.name, imageUrl: null });
      router.refresh();
      onAdded?.();
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{item.name}</p>
              <p className="text-xs text-ink-muted">
                {formatCadFromCents(item.priceCents)}
                {!item.available ? " · Sold out" : null}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Link
                href={`/item/${item.slug}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-link hover:underline"
              >
                View
              </Link>
              {item.available ? (
                <button
                  type="button"
                  disabled={pendingId === item.id}
                  onClick={() => void addItem(item)}
                  className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                >
                  Add
                </button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderPart(part: UIMessage["parts"][number], key: string) {
  if (part.type === "text") {
    const text = part.text;
    const wantsSignIn =
      /sign\s*in|\/signin|saved card|my address|place (an )?order/i.test(text);
    return (
      <div key={key} className="space-y-2">
        <p className="whitespace-pre-wrap text-sm text-ink">{text}</p>
        {wantsSignIn ? (
          <Link
            href="/signin"
            className="inline-flex text-sm font-medium text-link hover:underline"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    );
  }

  if (part.type === "tool-searchCatalog" || part.type === "tool-getProduct") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output)) return null;

    if (part.type === "tool-searchCatalog" && Array.isArray(output.items)) {
      const items = output.items.filter(isRecord).map((row) => ({
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? ""),
        priceCents: Number(row.priceCents ?? 0),
        available: Boolean(row.available),
        description:
          typeof row.description === "string" ? row.description : null,
      }));
      return <ProductCards key={key} items={items.filter((i) => i.id)} />;
    }

    if (part.type === "tool-getProduct" && typeof output.id === "string") {
      return (
        <ProductCards
          key={key}
          items={[
            {
              id: String(output.id),
              slug: String(output.slug ?? ""),
              name: String(output.name ?? ""),
              priceCents: Number(output.priceCents ?? 0),
              available: Boolean(output.available),
            },
          ]}
        />
      );
    }
  }

  if (part.type === "tool-openProduct") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output) || typeof output.href !== "string") return null;
    return (
      <Link
        key={key}
        href={output.href}
        className="mt-2 inline-flex text-sm font-medium text-link hover:underline"
      >
        Open dish
      </Link>
    );
  }

  if (part.type === "tool-addToCart") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output)) return null;
    if (output.ok === true) {
      return (
        <p key={key} className="mt-1 text-sm text-success">
          Added {String(output.name)} to your cart.
        </p>
      );
    }
    if (output.needsCustomize === true && typeof output.slug === "string") {
      return (
        <Link
          key={key}
          href={`/item/${output.slug}`}
          className="mt-2 inline-flex text-sm font-medium text-link hover:underline"
        >
          Customize this dish
        </Link>
      );
    }
    if (typeof output.error === "string") {
      return (
        <p key={key} className="mt-1 text-sm text-danger">
          {output.error}
        </p>
      );
    }
  }

  return null;
}

export function AiChatMessages({ messages }: { messages: UIMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        What are you craving today? Ask about the menu, hours, or add something
        simple to your cart.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "rounded-lg px-3 py-2",
            message.role === "user"
              ? "ml-6 bg-accent/10 text-ink"
              : "mr-2 bg-surface-elevated text-ink",
          )}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {message.role === "user" ? "You" : "Ask Naija"}
          </p>
          <div className="space-y-1">
            {message.parts.map((part, index) =>
              renderPart(part, `${message.id}-${index}`),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AiChatComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <form
      className="flex gap-2 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const text = input.trim();
        if (!text || disabled) return;
        onSend(text);
        setInput("");
      }}
    >
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Ask about food or hours…"
        disabled={disabled}
        className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      <Button type="submit" disabled={disabled || !input.trim()}>
        Send
      </Button>
    </form>
  );
}
