"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import type { MenuItemDetail } from "@/lib/domain/menu/types";
import { modifierSelectionErrors } from "@/lib/domain/menu/form-validation";
import { rememberCartSessionId } from "@/lib/utils/cart-session-client";
import { formatCadFromCents } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { Check, X } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { readApiError } from "@/lib/forms/read-api-error";
import { easeOut, motionDuration } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type ItemCustomizePanelProps = {
  item: MenuItemDetail;
  /** `page` = full mobile/detail page; `modal` = desktop dialog body */
  variant?: "page" | "modal";
  /** Shown when the store is closed — guest is scheduling for next open. */
  scheduleLabel?: string | null;
  /**
   * Full-bleed dish photo at the top of the scroll body.
   * In modal mode it is mobile-only (desktop uses the split image column).
   */
  showImageHero?: boolean;
  /** When set with a hero, renders a close control overlaid on the image (mobile modal). */
  onClose?: () => void;
  onAdded?: () => void;
  /**
   * When true, omit the docked footer (modal shell renders `ItemCustomizeFooter`
   * full-width under both columns).
   */
  hideFooter?: boolean;
  /** Controlled customize state — required when `hideFooter` so the shell can share it. */
  customize?: ItemCustomizeController;
};

export type ItemCustomizeController = ReturnType<typeof useItemCustomize>;

export function useItemCustomize(
  item: MenuItemDetail,
  options: {
    scheduleLabel?: string | null;
    onAdded?: () => void;
  } = {},
) {
  const { scheduleLabel = null, onAdded } = options;
  const { error: toastError } = useToast();
  const { notifyItemAdded } = useStorefrontUi();
  const reduceMotion = useReducedMotion();
  const [quantity, setQuantity] = useState(1);
  const [selectedByGroup, setSelectedByGroup] = useState(() => {
    const initial = new Map<string, string[]>();
    for (const group of item.modifierGroups) {
      initial.set(group.id, []);
    }
    return initial;
  });
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [groupErrors, setGroupErrors] = useState(
    () => new Map<string, string>(),
  );

  const selectedModifiers = useMemo(
    () => Array.from(selectedByGroup.values()).flat(),
    [selectedByGroup],
  );

  const unitPriceCents = useMemo(() => {
    let total = item.priceCents;
    for (const group of item.modifierGroups) {
      for (const modifier of group.modifiers) {
        if (selectedModifiers.includes(modifier.id)) {
          total += modifier.priceDeltaCents;
        }
      }
    }
    return total;
  }, [item, selectedModifiers]);

  const lineTotalCents = unitPriceCents * quantity;

  function toggleModifier(
    groupId: string,
    modifierId: string,
    maxSelect: number,
  ) {
    setGroupErrors((current) => {
      if (!current.has(groupId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(groupId);
      return next;
    });
    setSelectedByGroup((current) => {
      const next = new Map(current);
      const existing = next.get(groupId) ?? [];
      if (existing.includes(modifierId)) {
        next.set(
          groupId,
          existing.filter((id) => id !== modifierId),
        );
        return next;
      }

      if (maxSelect === 1) {
        next.set(groupId, [modifierId]);
        return next;
      }

      if (existing.length >= maxSelect) {
        return current;
      }

      next.set(groupId, [...existing, modifierId]);
      return next;
    });
  }

  async function addToCart() {
    if (!item.available) {
      return;
    }

    const nextGroupErrors = modifierSelectionErrors(
      item.modifierGroups,
      selectedByGroup,
    );
    setGroupErrors(nextGroupErrors);
    if (nextGroupErrors.size > 0) {
      setFormError("Choose the required options before adding to cart.");
      return;
    }

    setPending(true);
    setFormError(null);

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: item.id,
          quantity,
          modifierIds: selectedModifiers,
        }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        sessionId?: string | null;
      };
      rememberCartSessionId(body.sessionId);

      notifyItemAdded({
        name: item.name,
        imageUrl: item.imageUrl,
      });
      onAdded?.();
    } catch {
      const message = "Unable to add to cart.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  return {
    item,
    scheduleLabel,
    reduceMotion,
    quantity,
    setQuantity,
    selectedByGroup,
    pending,
    formError,
    groupErrors,
    lineTotalCents,
    toggleModifier,
    addToCart,
  };
}

export function ItemCustomizeFooter({
  customize,
  className,
}: {
  customize: ItemCustomizeController;
  className?: string;
}) {
  const {
    item,
    scheduleLabel,
    reduceMotion,
    quantity,
    setQuantity,
    pending,
    lineTotalCents,
    addToCart,
  } = customize;

  return (
    <div
      className={cn(
        "shrink-0 bg-surface-elevated/95 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex w-full items-center gap-3 px-5 py-4 sm:px-7">
        <div className="flex h-12 shrink-0 items-center rounded-md border border-border-strong bg-background">
          <button
            type="button"
            className="flex h-full w-11 items-center justify-center text-lg text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            disabled={!item.available || quantity <= 1 || pending}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            className="flex h-full w-11 items-center justify-center text-lg text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            disabled={!item.available || pending}
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <Button
          type="button"
          className="min-w-0 flex-1 gap-2"
          disabled={!item.available || pending}
          onClick={addToCart}
        >
          <span className="truncate">
            {pending
              ? "Adding…"
              : scheduleLabel
                ? `Add ${quantity}`
                : `Add ${quantity} to order`}
          </span>
          {!pending ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={lineTotalCents}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{
                  duration: motionDuration.fast,
                  ease: easeOut,
                }}
                className="shrink-0 tabular-nums"
              >
                · {formatCadFromCents(lineTotalCents)}
              </motion.span>
            </AnimatePresence>
          ) : null}
        </Button>
      </div>
    </div>
  );
}

export function ItemCustomizePanel({
  item,
  variant = "page",
  scheduleLabel = null,
  showImageHero = false,
  onClose,
  onAdded,
  hideFooter = false,
  customize: customizeProp,
}: ItemCustomizePanelProps) {
  if (customizeProp) {
    return (
      <ItemCustomizePanelView
        item={item}
        variant={variant}
        scheduleLabel={scheduleLabel}
        showImageHero={showImageHero}
        onClose={onClose}
        hideFooter={hideFooter}
        customize={customizeProp}
      />
    );
  }

  return (
    <ItemCustomizePanelOwned
      item={item}
      variant={variant}
      scheduleLabel={scheduleLabel}
      showImageHero={showImageHero}
      onClose={onClose}
      onAdded={onAdded}
      hideFooter={hideFooter}
    />
  );
}

function ItemCustomizePanelOwned({
  item,
  variant = "page",
  scheduleLabel = null,
  showImageHero = false,
  onClose,
  onAdded,
  hideFooter = false,
}: Omit<ItemCustomizePanelProps, "customize">) {
  const customize = useItemCustomize(item, { scheduleLabel, onAdded });
  return (
    <ItemCustomizePanelView
      item={item}
      variant={variant}
      scheduleLabel={scheduleLabel}
      showImageHero={showImageHero}
      onClose={onClose}
      hideFooter={hideFooter}
      customize={customize}
    />
  );
}

function ItemCustomizePanelView({
  item,
  variant = "page",
  scheduleLabel = null,
  showImageHero = false,
  onClose,
  hideFooter = false,
  customize,
}: {
  item: MenuItemDetail;
  variant?: "page" | "modal";
  scheduleLabel?: string | null;
  showImageHero?: boolean;
  onClose?: () => void;
  hideFooter?: boolean;
  customize: ItemCustomizeController;
}) {
  const {
    reduceMotion,
    selectedByGroup,
    formError,
    groupErrors,
    toggleModifier,
  } = customize;

  const isModal = variant === "modal";
  const heroClassName = isModal ? "lg:hidden" : undefined;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        isModal ? "h-full" : "min-h-[70dvh] pb-28",
      )}
    >
      <div
        className={cn(
          "min-h-0 flex-1",
          isModal ? "overflow-y-auto overscroll-contain" : "",
        )}
      >
        {showImageHero ? (
          <div
            className={cn(
              "relative h-[min(28vh,11.5rem)] w-full shrink-0 overflow-hidden bg-surface",
              !isModal && "sm:h-[min(32vh,14rem)]",
              heroClassName,
            )}
          >
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,var(--accent-subtle),transparent_55%),linear-gradient(160deg,var(--surface)_0%,#ebe4dc_100%)]"
              />
            )}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 left-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-black/8 transition-colors hover:bg-surface"
                aria-label={isModal ? "Close" : "Back to menu"}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            isModal ? "px-5 pt-5 pb-6 sm:px-7 sm:pt-6" : "space-y-0 pt-4",
          )}
        >
          <header className="max-w-xl">
            <h1
              className={cn(
                "font-display font-semibold tracking-tight text-balance text-foreground",
                isModal
                  ? "text-[1.75rem] leading-tight sm:text-3xl"
                  : "text-3xl",
              )}
            >
              {item.name}
            </h1>
            <p
              className={cn(
                "mt-2 font-semibold tabular-nums text-foreground",
                isModal ? "text-base" : "text-lg",
              )}
            >
              {formatCadFromCents(item.priceCents)}
            </p>
            {item.description ? (
              <p
                className={cn(
                  "mt-3 max-w-prose text-pretty leading-relaxed text-text-secondary",
                  isModal ? "text-sm sm:text-[0.9375rem]" : "text-base",
                )}
              >
                {item.description}
              </p>
            ) : null}
            {!item.available ? (
              <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm text-text-secondary">
                This item is sold out.
              </p>
            ) : scheduleLabel ? (
              <p className="mt-4 rounded-lg bg-accent-subtle px-3 py-2 text-sm text-text-secondary">
                Restaurant is closed — you&apos;ll pick a time at checkout
                {scheduleLabel ? (
                  <>
                    {" "}
                    (next open{" "}
                    <span className="font-medium text-foreground">
                      {scheduleLabel}
                    </span>
                    )
                  </>
                ) : null}
                .
              </p>
            ) : null}
          </header>

          {item.modifierGroups.length > 0 ? (
            <div className="mt-8 space-y-8">
              {item.modifierGroups.map((group) => {
                const single = group.maxSelect === 1;
                const selectedCount = (selectedByGroup.get(group.id) ?? [])
                  .length;

                return (
                  <section key={group.id} className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">
                          {group.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-text-tertiary">
                          {group.required
                            ? single
                              ? "Required · choose 1"
                              : `Required · choose up to ${group.maxSelect}`
                            : single
                              ? "Optional · choose 1"
                              : `Optional · choose up to ${group.maxSelect}`}
                          {!single && selectedCount > 0
                            ? ` · ${selectedCount} selected`
                            : null}
                        </p>
                      </div>
                    </div>

                    <ul
                      className={cn(
                        "overflow-hidden rounded-xl ring-1",
                        groupErrors.has(group.id)
                          ? "ring-error"
                          : "ring-border",
                      )}
                    >
                      {group.modifiers.map((modifier, index) => {
                        const checked = (
                          selectedByGroup.get(group.id) ?? []
                        ).includes(modifier.id);
                        const disabled =
                          !modifier.available || !item.available;
                        const atMax =
                          !single &&
                          !checked &&
                          selectedCount >= group.maxSelect;

                        return (
                          <li
                            key={modifier.id}
                            className={cn(
                              index > 0 && "border-t border-border",
                            )}
                          >
                            <button
                              type="button"
                              disabled={disabled || atMax}
                              aria-pressed={checked}
                              onClick={() =>
                                toggleModifier(
                                  group.id,
                                  modifier.id,
                                  group.maxSelect,
                                )
                              }
                              className={cn(
                                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-fast",
                                checked
                                  ? "bg-accent-subtle"
                                  : "bg-surface-elevated hover:bg-surface",
                                (disabled || atMax) &&
                                  "cursor-not-allowed opacity-50",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-[0.9375rem] font-medium text-foreground">
                                  {modifier.name}
                                  {!modifier.available
                                    ? " (unavailable)"
                                    : ""}
                                </span>
                                {modifier.priceDeltaCents > 0 ? (
                                  <span className="mt-0.5 block text-sm tabular-nums text-text-secondary">
                                    +
                                    {formatCadFromCents(
                                      modifier.priceDeltaCents,
                                    )}
                                  </span>
                                ) : null}
                              </span>

                              <motion.span
                                aria-hidden
                                animate={
                                  reduceMotion
                                    ? undefined
                                    : {
                                        scale: checked ? 1 : 0.92,
                                      }
                                }
                                transition={{
                                  duration: motionDuration.fast,
                                  ease: easeOut,
                                }}
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors duration-fast",
                                  single ? "rounded-full" : "rounded-md",
                                  checked
                                    ? "border-accent bg-accent text-text-inverse"
                                    : "border-border-strong bg-background text-transparent",
                                )}
                              >
                                {checked ? (
                                  <Check
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                  />
                                ) : null}
                              </motion.span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {groupErrors.get(group.id) ? (
                      <p role="alert" className="text-sm text-error">
                        {groupErrors.get(group.id)}
                      </p>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}

          {formError ? (
            <div className="mt-5">
              <FormBanner>{formError}</FormBanner>
            </div>
          ) : null}
        </div>
      </div>

      {!hideFooter ? (
        <ItemCustomizeFooter
          customize={customize}
          className={
            isModal ? undefined : "fixed inset-x-0 bottom-0 z-30 safe-bottom"
          }
        />
      ) : null}
    </div>
  );
}
