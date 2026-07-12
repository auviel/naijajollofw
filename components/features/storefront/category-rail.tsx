"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MenuCategoryView } from "@/lib/domain/menu/types";
import { cn } from "@/lib/utils/cn";

type CategoryRailProps = {
  categories: MenuCategoryView[];
};

export function CategoryRail({ categories }: CategoryRailProps) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");

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

  if (categories.length <= 1) {
    return null;
  }

  return (
    <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-5 sm:px-5">
      <div className="flex gap-2 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`#category-${category.id}`}
            onClick={() => setActiveId(category.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeId === category.id
                ? "bg-foreground text-background"
                : "bg-surface text-text-secondary hover:text-foreground",
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
