import { cn } from "@/lib/utils";

// Renders the "media not downloaded yet" visual: a muted gray block with
// a 1 px diagonal cross corner-to-corner. Used wherever a MediaItem's
// file isn't on disk (BookmarkCard's MediaThumb, GalleryCard,
// QuotedTweetCard, and Lightbox). `vector-effect: non-scaling-stroke`
// keeps the cross at exactly 1 device pixel regardless of how the SVG
// is scaled.
//
// `overflow-hidden` is always applied so the SVG corners get clipped to
// the caller's rounded shape (when callers pass `rounded` or
// `rounded-md`). Without it, absolutely-positioned SVG content extends
// past the rounded corners — real <img>/<video> elements get this
// clipping for free, but SVG doesn't.
export function MediaPlaceholder({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="img"
      aria-label="Media not downloaded"
      className={cn(
        "bg-muted text-muted-foreground/15 relative overflow-hidden",
        className,
      )}
      style={style}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="100%"
          y1="0"
          x2="0"
          y2="100%"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
