// MIT License — AndrewPrifer/progressive-blur
// 8-layer exponential backdrop-filter with graduated mask stops

import { cn } from "@/lib/utils";

const LAYERS = [
  { blur: 16, mask: "linear-gradient(to top, #000 0%, transparent 12.5%)" },
  { blur: 8, mask: "linear-gradient(to top, #000 0%, #000 12.5%, transparent 25%)" },
  { blur: 4, mask: "linear-gradient(to top, transparent 0%, #000 12.5%, #000 25%, transparent 37.5%)" },
  { blur: 2, mask: "linear-gradient(to top, transparent 12.5%, #000 25%, #000 37.5%, transparent 50%)" },
  { blur: 1, mask: "linear-gradient(to top, transparent 25%, #000 37.5%, #000 50%, transparent 62.5%)" },
  { blur: 0.5, mask: "linear-gradient(to top, transparent 37.5%, #000 50%, #000 62.5%, transparent 75%)" },
  { blur: 0.25, mask: "linear-gradient(to top, transparent 50%, #000 62.5%, #000 75%, transparent 87.5%)" },
  { blur: 0.125, mask: "linear-gradient(to top, transparent 62.5%, #000 75%, #000 87.5%, transparent 100%)" },
] as const;

export function ProgressiveBlur({
  visible,
  className,
}: {
  visible: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none sticky bottom-0 left-0 right-0 z-40 h-[160px] -mb-[160px]",
        className,
      )}
    >
      {LAYERS.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-200"
          style={{
            zIndex: i + 1,
            opacity: visible ? 1 : 0,
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            mask: layer.mask,
            WebkitMask: layer.mask,
          }}
        />
      ))}
    </div>
  );
}
