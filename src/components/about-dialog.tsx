import { RiInformationLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Colophon-style About dialog. SVG wordmark + version top-left, ASCII Snell
// diagram absolutely positioned and centered in the header (decorative
// background; hidden under the sm breakpoint), then a dependencies table, the
// Refraction caustic mark, and copyright/disclaimer. Two SVG assets in
// /public/: wordmark.svg, refraction-mark.svg.
export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="About">
          <RiInformationLine />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[443px] max-w-[calc(100vw-2rem)] sm:max-w-none max-h-[calc(100vh-4rem)] gap-0 overflow-x-hidden overflow-y-auto">
        <DialogTitle className="sr-only">About index-n2</DialogTitle>

        {/* Header: wordmark + version on the left, Snell diagram centered behind */}
        <div className="relative h-36">
          <pre
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 hidden -translate-x-1/2 select-none whitespace-pre font-mono text-[12px] leading-[1] sm:block"
          >
{`                                          normal  ↑
                                              ╲   ┊
                                               ╲  ┊
                                                ╲ ┊
                                   θ₁ = 45.0°    ╲┊
──────────────────────────────────────────────────●──────────
                                                  ┊╲
                      n₂ = 1.500  crown glass     ┊ ╲
                                                  ┊  ╲
                                                  ┊   ╲
                                      n₁ sin θ₁ = n₂ sin θ₂`}
          </pre>
          <div className="space-y-1">
            <img src="/wordmark.svg" alt="index-n2" className="h-9" />
            <p className="text-xs font-medium tabular-nums">Version {__APP_VERSION__}</p>
          </div>
        </div>

        {/* Dependencies */}
        <dl className="mt-6 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="col-span-2 mb-1">Dependencies:</dt>
          <dt className="italic">MIT</dt>
          <dd>
            React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, cmdk,
            open, quantize, clsx, tailwind-merge
          </dd>
          <dt className="italic">Apache-2.0</dt>
          <dd>sharp, class-variance-authority</dd>
          <dt className="italic">OFL-1.1</dt>
          <dd>Inter</dd>
          <dt className="italic">Remix Icon License 1.0</dt>
          <dd>Remix Icon</dd>
        </dl>

        {/* Refraction mark — 28px gap from dependencies */}
        <img
          src="/refraction-mark.svg"
          alt="Refraction"
          className="mt-7 h-5 w-auto"
        />

        {/* Copyright — 10px gap from mark, one step smaller than body */}
        <div className="mt-2.5 space-y-0.5 text-[11px]">
          <p>Copyright © 2026 Refraction. MIT License.</p>
          <p className="italic">Not affiliated with Field Theory CLI.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
