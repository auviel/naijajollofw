/** Persists window scroll when leaving the storefront menu for an item page. */
export const MENU_SCROLL_KEY = "storefront-menu-scroll";

export function saveMenuScroll() {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(MENU_SCROLL_KEY, String(window.scrollY));
}

/**
 * Restores stored menu scroll after returning to `/`.
 * Keeps re-applying briefly so layout, page motion, and soft refresh settle.
 */
export function restoreMenuScrollOnMount() {
  if (typeof window === "undefined") {
    return;
  }

  const raw = sessionStorage.getItem(MENU_SCROLL_KEY);
  if (raw == null) {
    return;
  }

  const top = Number(raw);
  if (!Number.isFinite(top) || top <= 0) {
    sessionStorage.removeItem(MENU_SCROLL_KEY);
    return;
  }

  const started = performance.now();
  const holdMs = 480;

  const tryRestore = () => {
    window.scrollTo(0, top);

    if (performance.now() - started >= holdMs) {
      sessionStorage.removeItem(MENU_SCROLL_KEY);
      return;
    }

    window.requestAnimationFrame(tryRestore);
  };

  // Let AnimatePresence page enter start, then begin restoring.
  window.setTimeout(() => {
    window.requestAnimationFrame(tryRestore);
  }, 60);
}
