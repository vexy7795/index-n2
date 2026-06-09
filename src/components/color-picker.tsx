import { useRef, type ChangeEvent, type MouseEvent } from "react";
import {
  COLOR_PRESETS,
  hexToRgb,
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
} from "@/lib/color-space";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export type ColorSelection =
  | { special: "mono" }
  | { hex: string; h: number; s: number; v: number };

type Props = {
  value: ColorSelection | null;
  onChange: (next: ColorSelection | null) => void;
};

// Marker sizes in px. Both constants are inset constants (not raw marker
// sizes): they equal `marker_size + 2` so the marker's edge sits 1px
// inside the bar/square edge at the extremes. SV marker is a 14px
// circle, hue marker is a 22×14 pill.
const SV_MARKER_PX = 16;
const HUE_MARKER_PX = 24;

function hsvToSelection(h: number, s: number, v: number): ColorSelection {
  const [r, g, b] = hsvToRgb(h, s, v);
  return { hex: rgbToHex(r, g, b), h, s, v };
}

export function ColorPicker({ value, onChange }: Props) {
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const hasHsv = value !== null && !("special" in value);
  const current = hasHsv ? value : null;
  const activeHue = current?.h ?? 0;
  const [hueR, hueG, hueB] = hsvToRgb(activeHue, 100, 100);

  // --- SV square ------------------------------------------------------------

  const pickSV = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Map cursor through the same inset range the marker is rendered in
    // (SV_MARKER_PX/2 from each edge) so the marker tracks the cursor
    // exactly. Clicks in the dead-zone snap to the nearest extreme.
    const half = SV_MARKER_PX / 2;
    const x = Math.max(half, Math.min(clientX - rect.left, rect.width - half));
    const y = Math.max(half, Math.min(clientY - rect.top, rect.height - half));
    const s = Math.round(((x - half) / (rect.width - SV_MARKER_PX)) * 100);
    const v = Math.round((1 - (y - half) / (rect.height - SV_MARKER_PX)) * 100);
    const h = current?.h ?? 0;
    onChange(hsvToSelection(h, s, v));
  };

  const onSVMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // prevent text selection across the page while dragging
    pickSV(e.clientX, e.clientY);
    const onMove = (ev: globalThis.MouseEvent) => pickSV(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // --- Hue slider -----------------------------------------------------------

  const pickHue = (clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Same inset range as the renderer (HUE_MARKER_PX/2 from each edge),
    // so dragging puts the pill exactly under the cursor instead of
    // drifting toward whichever edge is closer.
    const half = HUE_MARKER_PX / 2;
    const x = Math.max(half, Math.min(clientX - rect.left, rect.width - half));
    const h = Math.round(((x - half) / (rect.width - HUE_MARKER_PX)) * 360);
    const s = current?.s ?? 100;
    const v = current?.v ?? 100;
    onChange(hsvToSelection(h, s, v));
  };

  const onHueMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // prevent text selection across the page while dragging
    pickHue(e.clientX);
    const onMove = (ev: globalThis.MouseEvent) => pickHue(ev.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // --- Hex input ------------------------------------------------------------

  const onHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rgb = hexToRgb(e.target.value);
    if (!rgb) return;
    const { h, s, v } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    onChange({ hex: rgbToHex(rgb[0], rgb[1], rgb[2]), h, s, v });
  };

  // --- Presets --------------------------------------------------------------

  const presetIsActive = (i: number): boolean => {
    if (!value) return false;
    const p = COLOR_PRESETS[i];
    if ("special" in p) return "special" in value && value.special === p.special;
    return hasHsv && value.hex === p.hex;
  };

  const selectPreset = (i: number) => {
    if (presetIsActive(i)) {
      onChange(null);
      return;
    }
    const p = COLOR_PRESETS[i];
    if ("special" in p) {
      onChange({ special: p.special });
      return;
    }
    const rgb = hexToRgb(p.hex);
    if (!rgb) return;
    const { h, s, v } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    onChange({ hex: p.hex, h, s, v });
  };

  // --- Render ---------------------------------------------------------------

  const previewState: "color" | "mono" | "empty" = current
    ? "color"
    : value && "special" in value
      ? "mono"
      : "empty";

  // Vanilla marker math: inset by half-marker-width so markers stay fully
  // visible at extremes (0%, 100%, 0°, 360°) instead of clipping.
  const svMarkerLeft = current
    ? `calc(${SV_MARKER_PX / 2}px + (100% - ${SV_MARKER_PX}px) * ${current.s / 100})`
    : undefined;
  const svMarkerTop = current
    ? `calc(${SV_MARKER_PX / 2}px + (100% - ${SV_MARKER_PX}px) * ${1 - current.v / 100})`
    : undefined;
  const hueMarkerLeft = current
    ? `calc(${HUE_MARKER_PX / 2}px + (100% - ${HUE_MARKER_PX}px) * ${current.h / 360})`
    : undefined;

  return (
    <div className="flex w-60 flex-col gap-3 select-none">
      {/* SV square (always 1:1 — matches vanilla). 8px corners match the
          hue bar's effective radius (`rounded-full` on h-4 = 16/2 = 8px),
          so SV square and hue bar share the same outer silhouette. */}
      <div
        ref={svRef}
        onMouseDown={onSVMouseDown}
        className="relative aspect-square w-full cursor-crosshair overflow-hidden rounded-[8px] outline-1 -outline-offset-1 outline-border/50"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, rgb(${hueR}, ${hueG}, ${hueB}))`,
        }}
      >
        {current && (
          <div
            className="pointer-events-none absolute flex size-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10"
            style={{ left: svMarkerLeft, top: svMarkerTop }}
          >
            <div
              className="size-1.5 rounded-full ring-1 ring-inset ring-black/10"
              style={{ background: current.hex }}
            />
          </div>
        )}
      </div>

      {/* Hue slider. Pill thumb sits inside the bar (2px shorter), so the
          rainbow stays visible above/below it. Bar with overflow-hidden
          lives in a child so the pill's shadow can render outside it. */}
      <div
        ref={hueRef}
        onMouseDown={onHueMouseDown}
        className="relative h-4 w-full cursor-pointer"
      >
        <div
          className="h-full w-full overflow-hidden rounded-full"
          style={{
            background:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        />
        {current && (
          <div
            className="pointer-events-none absolute top-1/2 flex h-3.5 w-5.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10"
            style={{ left: hueMarkerLeft }}
          >
            <div
              className="size-1.5 rounded-full ring-1 ring-inset ring-black/10"
              style={{ background: `rgb(${hueR}, ${hueG}, ${hueB})` }}
            />
          </div>
        )}
      </div>

      {/* Presets (7 cols × 2 rows). Buttons fill cells so grid gap is
          uniform both horizontally and vertically. */}
      <div className="grid grid-cols-7 gap-1.5">
        {COLOR_PRESETS.map((p, i) => {
          const active = presetIsActive(i);
          const isMono = "special" in p;
          return (
            <button
              key={i}
              type="button"
              title={p.name}
              aria-label={p.name}
              aria-pressed={active}
              onClick={() => selectPreset(i)}
              className={cn(
                "aspect-square w-full overflow-hidden rounded-md",
                active
                  ? "ring-ring/60 ring-offset-background ring-1 ring-offset-1"
                  : "outline-1 -outline-offset-1 outline-border/50"
              )}
              style={isMono ? undefined : { background: p.hex }}
            >
              {isMono && <MonoSwatch />}
            </button>
          );
        })}
      </div>

      {/* Hex input with color swatch inside */}
      <InputGroup>
        <InputGroupInput
          type="text"
          placeholder="#000000"
          maxLength={7}
          value={current?.hex ?? ""}
          onChange={onHexChange}
          className="font-mono"
        />
        <InputGroupAddon align="inline-start">
          <div
            aria-hidden
            className="size-4 overflow-hidden rounded-[4px] outline-1 -outline-offset-1 outline-border/50"
          >
            {previewState === "color" && (
              <div className="h-full w-full" style={{ background: current!.hex }} />
            )}
            {previewState === "mono" && <MonoSwatch />}
            {previewState === "empty" && <EmptyStrikeSwatch />}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

// White rect + gray triangle bottom-right = clean diagonal split with no
// gradient anti-aliasing artifacts at rounded corners. Matches vanilla's
// linear-gradient(135deg, #fff 50%, #888 50%) intent. The container's
// 1px border is drawn via `outline` (paints above children) so the SVG
// can fill the box without covering it — see preset/swatch classNames.
function MonoSwatch() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="block h-full w-full"
      aria-hidden
    >
      <rect width="24" height="24" fill="#fff" />
      <polygon points="24,0 24,24 0,24" fill="#888" />
    </svg>
  );
}

// White rect + red diagonal stroke from corner to corner with rounded caps.
// Replaces the vanilla CSS gradient strikethrough — no soft-edge artifacts.
function EmptyStrikeSwatch() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="block h-full w-full"
      aria-hidden
    >
      <rect width="16" height="16" fill="#fff" />
      <line
        x1="0"
        y1="16"
        x2="16"
        y2="0"
        stroke="#e63946"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
