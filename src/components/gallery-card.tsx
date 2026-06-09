import { memo, useEffect, useRef, useState } from "react";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { Checkbox } from "@/components/ui/checkbox";
import { useLightbox } from "@/contexts/lightbox-context";
import { useSelection } from "@/contexts/selection-context";
import { useSettings } from "@/contexts/settings-context";
import type { GalleryItem } from "@/lib/filter";
import { cn } from "@/lib/utils";

// Minimal media tile for the Gallery view. Click → lightbox at this media.
// Selection checkbox appears on hover (or stays visible when the parent
// bookmark is already selected). No archive button — Gallery is meant to be
// pure browsing surface.
//
// TODO: revisit whether Gallery should expose selection at all. A bookmark
// with multiple media items shows the same selected state on every tile,
// which can read as "this image is selected" instead of "this bookmark is".
// Options to weigh later: drop selection from Gallery entirely, or keep it
// but visually indicate that selection is bookmark-scoped (e.g. show all of
// the bookmark's tiles together when one is checked).
// Memoized so resize-driven layout recomputes (which re-render the parent
// list ~12 times across a sidebar transition) don't reflow every visible
// card body. With memo, an unchanged card with stable props skips its
// own render entirely; only the wrapper div's inline style updates.
export const GalleryCard = memo(function GalleryCard({
  item,
  scrollSettled = true,
  isInViewport = false,
}: {
  item: GalleryItem;
  // When false (during/just-after fast scroll), video items render their
  // poster as a plain <img> instead of mounting a <video> element. Reason:
  // <video autoPlay> overrides preload="none" and fires a 3–4 MB range GET
  // on every mount. During a fast scrollbar drag we'd see hundreds of mp4
  // fetches, each holding a connection slot for ~70 ms, blocking the small
  // thumbs the user actually wants to see. Switching the source per scroll
  // velocity confines the video element to settled scroll states.
  scrollSettled?: boolean;
  // True when this card overlaps the actual viewport (excluding overscan).
  // Items in the viewport keep their <video> mounted during scroll so an
  // already-playing video doesn't blip off when the user scrolls slightly.
  // Combined with a 50 ms hold-off (below) so fast-scroll transit items
  // that briefly cross the viewport don't trigger a mount + mp4 fetch.
  isInViewport?: boolean;
}) {
  const { bookmark, media } = item;
  const { open: openLightbox, target: lightboxTarget } = useLightbox();
  const { isSelected, toggle } = useSelection();
  const { settings } = useSettings();
  const selected = isSelected(bookmark.id);
  const autoplay = settings.autoplayVideos;

  const src = media.thumb ?? media.url;
  const isVideoType = media.type === "video" || media.type === "animated_gif";

  // 50 ms hold-off: only treat the card as "stably in viewport" once it's
  // been there continuously for ~50 ms. Items that just briefly pass through
  // the viewport during fast scroll never clear this threshold and so never
  // mount a <video>. Slow / reading scroll dwell times are well above 50 ms,
  // so the delay is imperceptible there.
  const [stableInViewport, setStableInViewport] = useState(false);
  useEffect(() => {
    if (!isInViewport) {
      setStableInViewport(false);
      return;
    }
    const t = setTimeout(() => setStableInViewport(true), 50);
    return () => clearTimeout(t);
  }, [isInViewport]);

  const showVideo = isVideoType && (stableInViewport || scrollSettled);

  // Pause gallery video playback while the lightbox is open. The <video>
  // element stays mounted so the mp4 buffer is preserved — on close,
  // .play() resumes from the paused position instead of restarting.
  // Note: pause does NOT abort the in-flight mp4 fetch (the browser keeps
  // filling its buffer in the background); this is for CPU/decode/battery
  // relief and to free the user's attention, not connection-slot relief.
  // showVideo is a dep so a freshly-mounted <video> (e.g. user scrolled and
  // the 50 ms hold-off expired) gets immediately paused if the lightbox is
  // already open at that moment.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (lightboxTarget) {
      v.pause();
    } else if (autoplay) {
      void v.play().catch(() => {});
    }
  }, [lightboxTarget, autoplay, showVideo]);

  // Cancel in-flight fetches when the rendered media element changes (video
  // ↔ img on showVideo flip) or when the card unmounts entirely.
  //
  // - For <img>: clearing `src` cancels the in-flight image fetch.
  // - For <video>: clearing `src` and calling `load()` resets the media
  //   element, which cancels in-flight network activity for the mp4 range
  //   GET that autoplay started. Setting `poster = ""` would only cancel
  //   the poster image fetch, not the video's src fetch.
  //
  // Deps are `[showVideo]` so the effect re-runs on every element swap.
  // That gives the cleanup access to refs captured at the most recent run,
  // which always match the currently-rendered element. With empty deps,
  // refs would be stale after a video↔img swap; reading refs at cleanup
  // time instead would race React's commit, which detaches refs before
  // running unmount cleanups.
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    const video = videoRef.current;
    return () => {
      if (img) img.src = "";
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [showVideo]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Unlike bookmark-card, Gallery has no non-media click target, so video
    // clicks must bubble up to open the lightbox. We don't exclude `video`
    // here — the trade-off is no inline playback controls on Gallery tiles
    // (matches the pure-browsing intent of this surface).
    if (target.closest('button, [role="checkbox"]')) return;
    // Placeholder media has no file to view; ignore the click rather
    // than opening lightbox to nothing.
    if (!media.url) return;
    openLightbox(bookmark, media.url);
  };

  return (
    // Card fills its wrapper exactly. Wrapper (provided by GalleryList)
    // sizes itself from media.width/media.height — heights are exact data,
    // not measured, so no aspect-ratio CSS is needed here.
    <article
      className={cn(
        "group bg-muted relative h-full w-full cursor-zoom-in overflow-hidden rounded-md",
        selected && "ring-primary ring-2"
      )}
      onClick={handleClick}
    >
      {!media.url && !media.thumb ? (
        <MediaPlaceholder className="h-full w-full" />
      ) : showVideo ? (
        // fetchPriority="low" hints to the browser that, when allocating
        // connection slots, mp4 range GETs should defer to the small image
        // fetches happening at the same time. Soft preference, not a strict
        // serialization — but enough to bias the queue toward thumbnails.
        <video
          ref={videoRef}
          src={media.url ?? undefined}
          poster={media.thumb ?? undefined}
          autoPlay={autoplay}
          muted={autoplay}
          loop={autoplay}
          playsInline
          preload="none"
          // @ts-expect-error: fetchpriority on <video> isn't in React's
          // typings yet but Chromium/WebKit honor it.
          fetchpriority="low"
          className="h-full w-full object-cover"
        />
      ) : isVideoType && !media.thumb ? (
        // Video bookmark whose poster file isn't on disk yet (window
        // between `ft sync` recording the bookmark and `ft fetch-media`
        // downloading the poster — narrow on ft 1.3.18+ which fetches
        // inline, wider when sync ran with `--no-media`). The
        // `src ?? media.url` fallback would land on the mp4, which
        // <img> can't decode → broken-icon glyph. Show a clean
        // placeholder until the poster catches up.
        <div className="bg-muted h-full w-full" aria-hidden="true" />
      ) : (
        // Photos always take this branch. Videos take it during scroll —
        // showing the poster as a static image instead of a real video
        // element keeps the visual but avoids the mp4 range fetch.
        // No `loading="lazy"`: virtualization already handles "only mount
        // near viewport," which is a stronger guarantee than the browser's
        // own lazy heuristic. fetchPriority="high" pairs with the video's
        // "low" so thumbs win the queue when both are competing for slots.
        <img
          ref={imgRef}
          src={src ?? undefined}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}

      <div
        className={cn(
          "absolute top-2 right-2 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Checkbox
          aria-label={`Select bookmark from @${bookmark.authorHandle}`}
          checked={selected}
          onCheckedChange={() => toggle(bookmark.id)}
          onClick={(e) => e.stopPropagation()}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>
    </article>
  );
});
