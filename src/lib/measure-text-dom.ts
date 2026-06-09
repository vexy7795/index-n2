// DOM-based batch text measurement for the home/archive virtualization
// boundary-case fallback.
//
// Canvas measureText and the browser's actual layout engine disagree by
// 0.2–4 px at line-break boundaries (different glyph metrics + subpixel
// rules). For most text these tiny differences don't flip wrap decisions
// and canvas predictions match what browsers render. For boundary-case
// text (em-dashes, certain emoji, kerning-heavy combos), they do flip,
// producing a one-line discrepancy → ~20 px height mismatch → visible
// gap or overlap in the layout.
//
// This helper does what canvas can't: ask the browser itself how a
// given string wraps at a given width. Render each text into a hidden
// offscreen <p> styled to match production (text-sm, whitespace-pre-
// wrap, break-words, the inner content width), force ONE layout pass
// for the whole batch, read offsetHeight per child, and remove the
// container. One layout for N items instead of N layouts.
//
// Per-call cost is dominated by layout, not by DOM creation. Modern
// browsers batch layout for sibling elements efficiently — ~100 small
// text elements layout in ~10–15 ms typically. BookmarkList only DOM-
// measures cards flagged as boundary-risk by the canvas pass (see
// computeBookmarkHeightWithBoundary), so most cards never reach this
// helper.
//
// Style notes:
// - Tailwind `text-sm` is applied as a className so the helper auto-
//   respects user-overridden root font-size (Chrome's "default font
//   size" setting) without us having to fingerprint metrics. Whatever
//   the browser would render the production card at, this helper
//   measures at the same scale.
// - `position: absolute; visibility: hidden; left: -9999px` keeps the
//   container fully offscreen with no scrollbar contribution.
// - `width` set per child is the same `innerWidth` the formula uses
//   (colW minus card padding, minus quote border/padding for quote
//   text).

export type DomMeasurementItem = {
  // Caller-supplied identifier for matching results back to source.
  // Typically `${bookmark.id}:${innerWidth}:${kind}`.
  key: string;
  text: string;
  innerWidth: number;
};

export function batchMeasureTextHeights(
  items: DomMeasurementItem[],
): Map<string, number> {
  const result = new Map<string, number>();
  if (typeof document === "undefined" || items.length === 0) return result;

  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;visibility:hidden;left:-9999px;top:0;pointer-events:none;";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  try {
    const elements: { key: string; el: HTMLParagraphElement }[] = [];
    for (const item of items) {
      const p = document.createElement("p");
      // Match BookmarkCard / QuotedTweetCard's body text classes: text-sm
      // for font metrics, whitespace-pre-wrap to honor explicit \n breaks
      // and preserve trailing whitespace at line ends, break-words so
      // tokens wider than the line break at character boundaries.
      p.className = "text-sm whitespace-pre-wrap break-words";
      // Reset paragraph defaults that Tailwind preflight already zeroes
      // but be explicit so this works even if some style tweak shifts.
      p.style.margin = "0";
      p.style.padding = "0";
      p.style.width = `${item.innerWidth}px`;
      p.textContent = item.text;
      container.appendChild(p);
      elements.push({ key: item.key, el: p });
    }

    // Force a single layout pass for the whole batch by reading
    // offsetHeight once at the container level. Subsequent per-child
    // offsetHeight reads then come from the same layout — no per-read
    // reflow.
    void container.offsetHeight;

    for (const { key, el } of elements) {
      result.set(key, el.offsetHeight);
    }
  } finally {
    document.body.removeChild(container);
  }

  return result;
}
