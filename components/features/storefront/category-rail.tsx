"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  categoryIconFor,
  displayCategoryName,
} from "@/components/features/storefront/category-icon";
import { useBodyScrollLock } from "@/components/hooks/use-body-scroll-lock";
import { List, X } from "@/components/ui/icons";
import type { MenuCategoryView } from "@/lib/domain/menu/types";
import { easeOut, motionDuration, softSpring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type CategoryRailProps = {
  categories: MenuCategoryView[];
  /** Today's hours for the desktop sidebar, e.g. "11:00 – 22:00" */
  todayLabel?: string;
};

export function CategoryRail({ categories, todayLabel }: CategoryRailProps) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());
  const reduce = useReducedMotion();

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`category-${category.id}`))
      .filter((node): node is HTMLElement => Boolean(node));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id.replace(/^category-/, ""));
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const tab = tabRefs.current.get(activeId);
    const rail = railRef.current;
    if (!tab || !rail) {
      return;
    }
    const tabLeft = tab.offsetLeft;
    const tabRight = tabLeft + tab.offsetWidth;
    const viewLeft = rail.scrollLeft;
    const viewRight = viewLeft + rail.clientWidth;
    if (tabLeft < viewLeft + 16) {
      rail.scrollTo({ left: Math.max(0, tabLeft - 24), behavior: "smooth" });
    } else if (tabRight > viewRight - 48) {
      rail.scrollTo({
        left: tabRight - rail.clientWidth + 56,
        behavior: "smooth",
      });
    }
  }, [activeId]);

  useBodyScrollLock(sheetOpen);

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  if (categories.length <= 1) {
    return null;
  }

  function selectCategory(id: string) {
    setActiveId(id);
    setSheetOpen(false);
  }

  return (
    <>
      {/* Mobile / tablet: underline tabs + list sheet trigger */}
      <div className="sticky top-[var(--storefront-header-offset)] z-10 -mx-4 border-b border-border bg-background/95 sm:-mx-6 lg:hidden">
        <div className="relative flex items-stretch">
          <div
            ref={railRef}
            className="flex min-w-0 flex-1 gap-5 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => {
              const isActive = activeId === category.id;
              const label = displayCategoryName(category.name);
              return (
                <Link
                  key={category.id}
                  ref={(node) => {
                    if (node) {
                      tabRefs.current.set(category.id, node);
                    } else {
                      tabRefs.current.delete(category.id);
                    }
                  }}
                  href={`#category-${category.id}`}
                  onClick={() => selectCategory(category.id)}
                  className={cn(
                    "relative shrink-0 py-3 text-sm no-underline transition-colors",
                    isActive
                      ? "font-semibold text-foreground"
                      : "font-medium text-text-secondary",
                  )}
                >
                  {label}
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                    />
                  ) : null}
                </Link>
              );
            })}
            {/* Spacer so last tab clears the list button */}
            <span className="w-10 shrink-0" aria-hidden />
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-10 w-8 bg-gradient-to-r from-transparent to-background/95" />

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative z-[1] flex w-11 shrink-0 items-center justify-center border-l border-border bg-background text-foreground"
            aria-label="All categories"
          >
            <List className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sheetOpen ? (
          <div
            key="category-sheet"
            className="fixed inset-0 z-50 flex items-end justify-center lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-sheet-title"
          >
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduce ? motionDuration.fast : motionDuration.panel,
                ease: easeOut,
              }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              className="relative max-h-[75dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg"
              initial={reduce ? { opacity: 0 } : { y: "100%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              exit={reduce ? { opacity: 0 } : { y: "100%" }}
              transition={
                reduce
                  ? { duration: motionDuration.fast, ease: easeOut }
                  : softSpring
              }
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-4 py-3">
                <p
                  id="category-sheet-title"
                  className="font-display text-base font-semibold text-foreground"
                >
                  Menu
                </p>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-surface"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <nav
                className="flex flex-col px-2 py-2"
                aria-label="All categories"
              >
                {categories.map((category) => {
                  const isActive = activeId === category.id;
                  const label = displayCategoryName(category.name);
                  const Icon = categoryIconFor(category.name);
                  return (
                    <Link
                      key={category.id}
                      href={`#category-${category.id}`}
                      onClick={() => selectCategory(category.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3.5 text-sm no-underline transition-colors",
                        isActive
                          ? "bg-surface font-semibold text-foreground"
                          : "font-medium text-text-secondary",
                      )}
                    >
                      {Icon ? (
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      ) : null}
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Desktop: sticky vertical sidebar */}
      <aside
        aria-label="Menu categories"
        className="sticky top-[var(--storefront-header-offset)] z-10 hidden w-56 shrink-0 self-start lg:block xl:w-60"
      >
        <div className="border-b border-border pb-4">
          <p className="font-display text-lg font-semibold text-foreground">
            Menu
          </p>
          {todayLabel ? (
            <p className="mt-1 text-sm text-text-secondary">{todayLabel}</p>
          ) : null}
        </div>

        <nav className="mt-3 flex flex-col gap-0.5" aria-label="Categories">
          {categories.map((category) => {
            const isActive = activeId === category.id;
            const label = displayCategoryName(category.name);
            const Icon = categoryIconFor(category.name);
            return (
              <Link
                key={category.id}
                href={`#category-${category.id}`}
                onClick={() => setActiveId(category.id)}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md py-2.5 pr-3 pl-3.5 text-sm no-underline transition-colors",
                  isActive
                    ? "bg-surface font-semibold text-foreground"
                    : "font-medium text-text-secondary hover:bg-surface/70 hover:text-foreground",
                )}
              >
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-accent"
                  />
                ) : null}
                {Icon ? (
                  <Icon className="shrink-0" size={18} aria-hidden />
                ) : null}
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
