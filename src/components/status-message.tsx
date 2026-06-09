import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Page-level status banner used by view components for loading, error, and
// empty states. Owns the wrapper styling only — children compose freely so
// each call site can render headlines, body paragraphs, inline buttons,
// CopyableCode chips, or just a single line of text without prop bloat.
export function StatusMessage({
  variant = "default",
  children,
}: {
  variant?: "default" | "destructive";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "p-8 text-center text-sm",
        variant === "destructive" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}
