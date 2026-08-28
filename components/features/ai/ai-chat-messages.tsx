"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import { AiChatTypingIndicator } from "@/components/features/ai/ai-chat-typing-indicator";
import { ChatMessageText } from "@/components/features/ai/chat-message-text";
import { Check, Eye, Send, ShoppingBag } from "@/components/ui/icons";
import type { ChatPendingState } from "@/lib/ai/chat-pending-state";
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
  onCartChange,
}: {
  items: CatalogCardItem[];
  onAdded?: () => void;
  onCartChange?: () => void;
}) {
  const router = useRouter();
  const { notifyItemAdded, aiChatOpen } = useStorefrontUi();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());

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
      setAddedIds((current) => new Set(current).add(item.id));
      if (!aiChatOpen) {
        notifyItemAdded({ name: item.name, imageUrl: null });
      }
      router.refresh();
      onCartChange?.();
      onAdded?.();
    } finally {
      setPendingId(null);
    }
  }

  const validItems = items.filter((item) => {
    const slug = item.slug?.trim();
    return Boolean(item.id) && Boolean(slug) && slug !== "undefined";
  });

  if (validItems.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {validItems.map((item) => {
        const added = addedIds.has(item.id);
        const href = `/item/${item.slug.trim()}`;
        return (
          <li key={item.id} className="rounded-xl bg-black/[0.04] p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{item.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {formatCadFromCents(item.priceCents)}
                {!item.available ? " · Sold out" : null}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={href}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface/90 text-xs font-semibold text-ink no-underline transition hover:bg-surface"
              >
                <Eye className="size-3.5 shrink-0" aria-hidden />
                View dish
              </Link>
              {item.available ? (
                <button
                  type="button"
                  disabled={pendingId === item.id || added}
                  onClick={() => void addItem(item)}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-60",
                    added ? "bg-success" : "bg-accent hover:brightness-105",
                  )}
                >
                  {added ? (
                    <>
                      <Check className="size-3.5 shrink-0" aria-hidden />
                      Added
                    </>
                  ) : pendingId === item.id ? (
                    "Adding…"
                  ) : (
                    <>
                      <ShoppingBag className="size-3.5 shrink-0" aria-hidden />
                      Add to cart
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AssistantTextPart({ text }: { text: string }) {
  const { data: session, status } = useSession();
  const { closeAiChat } = useStorefrontUi();
  const isLoggedIn = status === "authenticated" && Boolean(session?.user);
  const suggestsSignIn =
    /sign\s*in|\/signin|saved card|my address|place (an )?order/i.test(text);
  const suggestsCheckout =
    /checkout|place (an )?order|proceed with checkout/i.test(text);

  return (
    <div className="space-y-2">
      <ChatMessageText text={text} />
      {isLoggedIn && suggestsCheckout ? (
        <Link
          href="/checkout"
          onClick={() => closeAiChat()}
          className="inline-flex text-sm font-medium text-link hover:underline"
        >
          Go to checkout
        </Link>
      ) : null}
      {!isLoggedIn && suggestsSignIn ? (
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

function renderPart(
  part: UIMessage["parts"][number],
  key: string,
  onCartChange?: () => void,
) {
  if (part.type === "text") {
    return <AssistantTextPart key={key} text={part.text} />;
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
      return <ProductCards key={key} items={items.filter((i) => i.id)} onCartChange={onCartChange} />;
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
          onCartChange={onCartChange}
        />
      );
    }
  }

  if (part.type === "tool-openProduct") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output) || typeof output.href !== "string") return null;
    if (
      output.href.includes("/undefined") ||
      output.href.includes("/null")
    ) {
      return null;
    }
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

export function AiChatMessages({
  messages,
  onCartChange,
  pending,
}: {
  messages: UIMessage[];
  onCartChange?: () => void;
  pending?: ChatPendingState | null;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
        <AmakaAvatar size="lg" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Ask Amaka</p>
          <p className="text-sm text-ink-muted">
            What are you craving today? Ask about the menu, hours, or add
            something simple to your cart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) =>
        message.role === "user" ? (
          <div key={message.id} className="flex justify-end">
            <div className="w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent/10 px-3 py-2">
              <div className="space-y-1">
                {message.parts.map((part, index) =>
                  renderPart(part, `${message.id}-${index}`, onCartChange),
                )}
              </div>
            </div>
          </div>
        ) : (
          <div key={message.id} className="flex items-end gap-2">
            <AmakaAvatar size="sm" className="shrink-0" />
            <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-surface-elevated px-3 py-2">
              <div className="space-y-1">
                {message.parts.map((part, index) =>
                  renderPart(part, `${message.id}-${index}`, onCartChange),
                )}
              </div>
            </div>
          </div>
        ),
      )}
      {pending ? <AiChatTypingIndicator label={pending.label} /> : null}
    </div>
  );
}

const COMPOSER_MAX_HEIGHT = 120;

function resizeComposerTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
}

export function AiChatComposer({
  disabled,
  onSend,
  pendingLabel,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  pendingLabel?: string;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = Boolean(input.trim()) && !disabled;
  const wasDisabledRef = useRef(Boolean(disabled));

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    resizeComposerTextarea(textareaRef.current);
  }, [input]);

  useEffect(() => {
    if (wasDisabledRef.current && !disabled) {
      focusComposer();
    }
    wasDisabledRef.current = Boolean(disabled);
  }, [disabled, focusComposer]);

  return (
    <form
      className="p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const text = input.trim();
        if (!text || disabled) return;
        onSend(text);
        setInput("");
        requestAnimationFrame(() => resizeComposerTextarea(textareaRef.current));
        focusComposer();
      }}
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-border bg-surface py-1.5 pl-3 pr-1.5",
          "focus-within:border-accent",
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={(event) => {
            setInput(event.target.value);
            resizeComposerTextarea(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={
            pendingLabel ? pendingLabel : "Ask about food or hours…"
          }
          disabled={disabled}
          className="min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-base leading-5 text-ink outline-none placeholder:text-ink-muted disabled:opacity-60"
          style={{ maxHeight: COMPOSER_MAX_HEIGHT }}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-2xl",
            "bg-accent text-white transition hover:brightness-105",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
