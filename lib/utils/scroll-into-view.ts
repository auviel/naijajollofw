/** Shared scroll margin for elements scrolled inside the dashboard main pane. */
export const SCROLL_INTO_VIEW_MARGIN_CLASS =
  "scroll-mt-2 scroll-mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:scroll-mb-2";

export function scrollIntoViewSmooth(element: HTMLElement | null | undefined) {
  if (!element) {
    return;
  }

  window.requestAnimationFrame(() => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}
