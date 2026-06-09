import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GalleryCard } from "@/components/gallery-card";
import type { GalleryItem } from "@/lib/filter";

const GAP = 12;
const OVERSCAN_PX = 800;

type Position = { x: number; y: number; w: number; h: number };

// Find the nearest ancestor that actually scrolls vertically.
function findScrollParent(el: HTMLElement | null): HTMLElement {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

// Snapshot the topmost-visible item's index, its y in the current layout,
// and the current scrollTop. Returns null if no item is in viewport. Used
// by both the RO callback (width changes) and the render-time zoom check
// (columnWidth changes) to capture pre-commit state for scroll anchoring.
// Anchor heuristic is "smallest y that overlaps viewport"; if you ever
// need a different one (center-of-viewport, last-clicked, etc.), this is
// the single edit point.
function captureTopVisibleAnchor(
  el: HTMLElement,
  positions: Position[],
): { index: number; oldY: number; oldScrollTop: number } | null {
  if (positions.length === 0) return null;
  const scrollEl = findScrollParent(el);
  const containerTop = el.getBoundingClientRect().top;
  const scrollElTop =
    scrollEl === document.documentElement
      ? 0
      : scrollEl.getBoundingClientRect().top;
  const viewportTop = scrollElTop - containerTop;
  const vh =
    scrollEl === document.documentElement
      ? window.innerHeight
      : scrollEl.clientHeight;
  const viewportBottom = viewportTop + vh;
  let anchorIndex = -1;
  let anchorY = Infinity;
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    if (p.y + p.h > viewportTop && p.y < viewportBottom) {
      if (p.y < anchorY) {
        anchorIndex = i;
        anchorY = p.y;
      }
    }
  }
  if (anchorIndex < 0) return null;
  const oldScrollTop =
    scrollEl === document.documentElement
      ? window.scrollY
      : scrollEl.scrollTop;
  return { index: anchorIndex, oldY: anchorY, oldScrollTop };
}

// Gallery-specific virtualized list. Heights are exact from media.width/height,
// so layout is a pure function of (items, columnWidth, containerWidth) — no
// post-render measurement, no cascade, no `ResizeObserver`-per-item. Off-screen
// items are not in the DOM (no wrapper, no placeholder, no GPU promotion).
export function GalleryList({
  items,
  columnWidth,
}: {
  items: GalleryItem[];
  columnWidth: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  // Tracks whether scroll position has been quiet long enough for video
  // elements to safely mount. While scrolling, video cards render their
  // poster as a plain <img> instead of a <video>, because <video autoPlay>
  // overrides preload="none" and fires a 3–4 MB range GET on every mount.
  // During a scrollbar drag that's hundreds of mp4 fetches saturating the
  // 6-per-origin connection slots and queueing the small thumbs that the
  // user actually wants to see (~2.5 s of "Queueing" per thumb in DevTools).
  const [scrollSettled, setScrollSettled] = useState(true);

  // Mirror current positions for synchronous read in the RO callback.
  const positionsRef = useRef<Position[]>([]);
  // Anchor captured by the RO callback before the layout changes;
  // consumed in a useLayoutEffect after the new positions arrive to
  // shift scrollTop by the y-delta of that item between layouts.
  // With stable column assignment in place, the topmost-visible item
  // stays the same item across resize frames, so the anchor identity
  // is consistent — what doomed the previous JS-anchor attempt is now
  // structurally fixed below us.
  const pendingAnchorRef = useRef<{
    index: number;
    oldY: number;
    oldScrollTop: number;
  } | null>(null);

  // Track container width. Each ResizeObserver fire captures an anchor
  // (topmost-visible item's index + current y) using positionsRef, then
  // pushes the new width into state. Native CSS scroll anchoring doesn't
  // fire on top/left changes of absolutely-positioned elements (verified
  // empirically — sidebar toggle produces zero scrollTop changes), so we
  // do it ourselves.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    let lastW = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (!el) return;
      const w = el.clientWidth;
      if (w === lastW) return;

      // Capture anchor from current positions before triggering relayout.
      const anchor = captureTopVisibleAnchor(el, positionsRef.current);
      if (anchor) pendingAnchorRef.current = anchor;

      lastW = w;
      setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track scroll position + viewport height of the nearest scrolling ancestor.
  // rAF-coalesced — high-rate trackpad scrolls don't fire React renders 100×/sec.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollEl = findScrollParent(el);

    function update() {
      if (!el) return;
      const containerTop = el.getBoundingClientRect().top;
      const scrollTop =
        scrollEl === document.documentElement
          ? 0
          : scrollEl.getBoundingClientRect().top;
      const height =
        scrollEl === document.documentElement
          ? window.innerHeight
          : scrollEl.clientHeight;
      setScrollY(scrollTop - containerTop);
      setViewportH(height);
    }

    update();
    let frame = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    // Track settled state in a closure variable so we only fire the React
    // setter on transitions (settled → moving, moving → settled). Calling
    // setState every scroll frame would re-render every visible card 60×/sec.
    let isSettled = true;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
        if (isSettled) {
          isSettled = false;
          setScrollSettled(false);
        }
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          settleTimer = null;
          isSettled = true;
          setScrollSettled(true);
        }, 150);
      });
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, []);

  // Number of columns derived from the current container width. Splitting
  // this out so colAssignment can memoize on (items, cols) — stable across
  // sub-pixel containerWidth changes within the same column count.
  const cols = useMemo(() => {
    if (containerWidth === 0) return 0;
    return Math.max(
      1,
      Math.floor((containerWidth + GAP) / (columnWidth + GAP)),
    );
  }, [containerWidth, columnWidth]);

  // Stable item → column mapping. Greedy shortest-column packing using
  // *relative* heights (1 / aspect_ratio) — no colW dependency, no
  // rounding, deterministic for a given (items, cols). This locks each
  // item to its column for any container width within the same col count,
  // so resizing doesn't reshuffle items between columns. The original
  // bug: at fractional pixel widths, Math.round made colHeight ordering
  // flip between consecutive RO frames, which cascaded to all downstream
  // items getting different column assignments — visible as items
  // swapping columns rapidly during a resize.
  const colAssignment = useMemo(() => {
    if (cols === 0) return [] as number[];
    const result = new Array<number>(items.length);
    const colHeights = new Array<number>(cols).fill(0);
    for (let i = 0; i < items.length; i++) {
      const m = items[i].media;
      const ar = m.width && m.height ? m.width / m.height : 1;
      let shortest = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[shortest]) shortest = c;
      }
      result[i] = shortest;
      colHeights[shortest] += 1 / ar; // relative height; gap omitted (constant)
    }
    return result;
  }, [items, cols]);

  // Pure-function layout. Heights from media aspect ratio at current colW.
  // Uses the stable column assignment above, so y positions update with
  // width but items never swap columns within a fixed col count.
  const { positions, totalHeight } = useMemo(() => {
    if (containerWidth === 0 || cols === 0) {
      return { positions: [] as Position[], totalHeight: 0 };
    }
    const colW = (containerWidth - (cols - 1) * GAP) / cols;
    const colHeights = new Array<number>(cols).fill(0);
    const next = new Array<Position>(items.length);

    for (let i = 0; i < items.length; i++) {
      const m = items[i].media;
      const ar = m.width && m.height ? m.width / m.height : 1;
      const h = colW / ar; // float; rounded only at render
      const col = colAssignment[i] ?? 0;
      const x = col * (colW + GAP);
      const y = colHeights[col];
      next[i] = { x, y, w: colW, h };
      colHeights[col] = y + h + GAP;
    }

    return { positions: next, totalHeight: Math.max(...colHeights, 0) };
  }, [items, containerWidth, cols, colAssignment]);

  // Mirror positions for synchronous RO-callback access (effects run
  // after commit, so positionsRef is one render behind state — exactly
  // what the RO callback wants when it captures the anchor BEFORE the
  // imminent setContainerWidth → re-render).
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Capture an anchor when columnWidth changes (zoom slider). Unlike the
  // RO-driven path, zoom has no synchronous "before commit" hook — by the
  // time any useLayoutEffect fires, the new layout has committed and the
  // browser may have auto-clamped scrollTop. The only place we can read
  // pre-commit DOM state is during render itself: positionsRef.current
  // still holds the previous render's positions, scrollEl.scrollTop is
  // still the pre-clamp value, and getBoundingClientRect on the container
  // still describes the previous layout. We snapshot the anchor here; the
  // useLayoutEffect below applies the absolute-scrollTop adjustment after
  // the new positions commit.
  /* eslint-disable react-hooks/refs --
   * This block intentionally reads/writes refs during render to capture
   * pre-commit DOM state for zoom-driven layout changes. Zoom (columnWidth
   * prop change) has no synchronous before-commit hook the way RO does,
   * and by the time any useLayoutEffect fires the new layout has committed
   * and scrollTop may already be auto-clamped. Reading positionsRef +
   * the DOM here gives us the previous-render snapshot to derive the
   * anchor from. The pattern is gated by a strict equality check on
   * prevColumnWidthRef so it only fires when columnWidth actually changes
   * — safe under React strict mode and concurrent re-renders.
   */
  const prevColumnWidthRef = useRef(columnWidth);
  if (prevColumnWidthRef.current !== columnWidth) {
    const el = containerRef.current;
    if (el) {
      const anchor = captureTopVisibleAnchor(el, positionsRef.current);
      if (anchor) pendingAnchorRef.current = anchor;
    }
    prevColumnWidthRef.current = columnWidth;
  }
  /* eslint-enable react-hooks/refs */

  // Apply scroll anchoring after a width-driven layout change. Runs on
  // every positions-array change, but pendingAnchorRef is only set by
  // the RO callback, so filter / sort / zoom / items changes pass
  // through with no scroll adjustment.
  //
  // Set scrollTop *absolutely*, not via += delta. When totalHeight
  // shrinks (e.g. resize wider→narrower so columns get wider and items
  // shorter), the browser auto-clamps scrollTop to the new max BEFORE
  // this effect runs. A delta-based approach (`scrollTop += delta`)
  // would then subtract from the already-clamped value and drift
  // toward y=0 across rapid resizes. Absolute set lands at the right
  // place; if even the absolute value exceeds the new max, the browser
  // clamps that too, but that's a legitimate "user is at the bottom"
  // clamp, not silent drift.
  //
  // After the set, sync scrollY state from the actual DOM (not from
  // the computed newScrollTop) so it reflects any further clamping
  // and stays consistent with the visible-window check on the next
  // render.
  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    if (!anchor) return;
    pendingAnchorRef.current = null;
    const newPos = positions[anchor.index];
    if (!newPos) return;
    const el = containerRef.current;
    if (!el) return;
    const scrollEl = findScrollParent(el);
    const newScrollTop = newPos.y + (anchor.oldScrollTop - anchor.oldY);
    if (scrollEl === document.documentElement) {
      window.scrollTo(0, newScrollTop);
    } else {
      scrollEl.scrollTop = newScrollTop;
    }
    const containerTop = el.getBoundingClientRect().top;
    const scrollElTop =
      scrollEl === document.documentElement
        ? 0
        : scrollEl.getBoundingClientRect().top;
    setScrollY(scrollElTop - containerTop);
  }, [positions]);

  // Re-sync scrollY to actual scrollTop whenever totalHeight changes.
  // For RO and zoom, the anchor path above already absolute-sets
  // scrollTop and reads back the post-commit scroll position, so this
  // effect is partially redundant for those — the setScrollY here is
  // a no-op when an anchor adjustment just ran. But it's still
  // load-bearing for cases that don't go through the anchor path:
  // - RO fires but no items are in viewport (no anchor candidate),
  //   yet totalHeight shrinks below current scrollTop → browser
  //   clamps silently;
  // - sync brings new bookmarks while user is scrolled, items array
  //   changes, positions/totalHeight change without any RO or zoom;
  // - filter changes that affect totalHeight without going through
  //   App.tsx's scroll-to-top (edge cases).
  // Cheap to keep, hard to lose if removed.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollEl = findScrollParent(el);
    const containerTop = el.getBoundingClientRect().top;
    const scrollElTop =
      scrollEl === document.documentElement
        ? 0
        : scrollEl.getBoundingClientRect().top;
    setScrollY(scrollElTop - containerTop);
  }, [totalHeight]);

  const viewTop = scrollY - OVERSCAN_PX;
  const viewBottom = scrollY + viewportH + OVERSCAN_PX;
  // Inner bounds (no overscan) used to decide which items count as "actually
  // visible" — those keep their <video> mounted even during scroll, so an
  // already-playing video doesn't blip off when the user scrolls a little.
  // Items in the overscan-only band fall back to the static poster image
  // until scroll settles.
  const innerTop = scrollY;
  const innerBottom = scrollY + viewportH;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: totalHeight ? `${totalHeight}px` : undefined,
      }}
    >
      {items.map((item, i) => {
        const pos = positions[i];
        if (!pos) return null;
        // Off-screen items are not rendered at all. Container's explicit
        // height keeps total scroll length correct regardless.
        if (pos.y + pos.h <= viewTop || pos.y >= viewBottom) return null;
        const isInViewport =
          pos.y + pos.h > innerTop && pos.y < innerBottom;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${pos.y}px`,
              left: `${pos.x}px`,
              width: `${pos.w}px`,
              height: `${pos.h}px`,
            }}
          >
            <GalleryCard
              item={item}
              scrollSettled={scrollSettled}
              isInViewport={isInViewport}
            />
          </div>
        );
      })}
    </div>
  );
}
