import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Inline clickable code snippet that copies to clipboard on click and briefly
// flips its text to "copied". Visual style mirrors the search-match highlight
// in `lib/highlight.tsx` so the empty state's CLI hint reads as a copyable
// affordance, not decorated text.
export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : `Copy ${value}`}
          className="bg-foreground/5 hover:bg-foreground/10 inline-grid grid-cols-1 rounded-sm px-1 font-mono"
        >
          {/* Width-stable swap: the invisible span reserves `value`'s
              width so the "copied" state (shorter string) doesn't
              shrink the button and reflow surrounding inline text.
              Both spans occupy the same grid cell — cell width is
              `value`'s width, only the visible one is painted. */}
          <span className="invisible col-start-1 row-start-1" aria-hidden>
            {value}
          </span>
          <span className="col-start-1 row-start-1">
            {copied ? "copied" : value}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Click to copy"}</TooltipContent>
    </Tooltip>
  );
}
