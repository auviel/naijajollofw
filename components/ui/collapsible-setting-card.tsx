"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import {
  SCROLL_INTO_VIEW_MARGIN_CLASS,
  scrollIntoViewSmooth,
} from "@/lib/utils/scroll-into-view";

type CollapsibleSettingCardProps = {
  title: string;
  summary: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  expandedDescription?: string;
  children: React.ReactNode;
  expandLabel?: string;
  className?: string;
};

export function CollapsibleSettingCard({
  title,
  summary,
  expanded,
  onExpand,
  onCollapse,
  expandedDescription,
  children,
  expandLabel = "Change",
  className,
}: CollapsibleSettingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wasExpandedRef = useRef(expanded);

  useEffect(() => {
    if (expanded && !wasExpandedRef.current) {
      scrollIntoViewSmooth(cardRef.current);
    }

    wasExpandedRef.current = expanded;
  }, [expanded]);

  if (!expanded) {
    return (
      <div
        ref={cardRef}
        className={cn(SCROLL_INTO_VIEW_MARGIN_CLASS, className)}
      >
        <Card>
          <button
            type="button"
            onClick={onExpand}
            className="flex w-full items-center gap-4 rounded-lg px-5 py-4 text-left transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-sm text-text-secondary">{summary}</p>
            </div>
            <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-link">
              {expandLabel}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(SCROLL_INTO_VIEW_MARGIN_CLASS, className)}
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-5 pb-5 pt-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {expandedDescription ? (
              <p className="mt-1 text-sm text-text-secondary">{expandedDescription}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCollapse}
            className={cn(
              "shrink-0 pt-0.5 text-sm font-medium text-link",
              "hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
            )}
          >
            Done
          </button>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-5">{children}</CardContent>
      </Card>
    </div>
  );
}
