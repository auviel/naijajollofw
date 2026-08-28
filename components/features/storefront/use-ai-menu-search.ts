"use client";

import { useEffect, useState } from "react";
import type { MenuSearchItem } from "@/lib/domain/menu/search";
import { shouldUseAiSearch } from "@/lib/ai/catalog/should-use-ai-search";

type AiMenuSearchState = {
  loading: boolean;
  items: MenuSearchItem[];
  usedAi: boolean;
  error: string | null;
};

const idleState: AiMenuSearchState = {
  loading: false,
  items: [],
  usedAi: false,
  error: null,
};

/** Fetch AI-ranked menu matches when the submitted query is natural language. */
export function useAiMenuSearch(query: string): AiMenuSearchState {
  const trimmed = query.trim();
  const useAi = Boolean(trimmed) && shouldUseAiSearch(trimmed);
  const [state, setState] = useState<AiMenuSearchState>(idleState);

  useEffect(() => {
    if (!useAi) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- AI search fetch lifecycle
    setState({ loading: true, items: [], usedAi: false, error: null });

    void (async () => {
      try {
        const response = await fetch(
          `/api/ai/search?q=${encodeURIComponent(trimmed)}&limit=48`,
        );
        const body = (await response.json()) as {
          items?: MenuSearchItem[];
          ai?: boolean;
          error?: string;
        };

        if (cancelled) return;

        if (!response.ok) {
          setState({
            loading: false,
            items: [],
            usedAi: false,
            error: body.error ?? "Search failed. Try again.",
          });
          return;
        }

        setState({
          loading: false,
          items: body.items ?? [],
          usedAi: Boolean(body.ai),
          error: null,
        });
      } catch {
        if (cancelled) return;
        setState({
          loading: false,
          items: [],
          usedAi: false,
          error: "Search failed. Try again.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trimmed, useAi]);

  if (!useAi) {
    return idleState;
  }

  return state;
}
