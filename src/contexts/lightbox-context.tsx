/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Bookmark, QuotedTweet } from "@/types/bookmark";

// Discriminated union: a quote-snapshot is genuinely a different kind of thing
// from a bookmark (snapshot captured because we bookmarked something that
// referenced it; never user-curated; lacks engagement/categories/threading).
// Modeling that at the type level keeps engagement-consuming code (sort,
// cards) free of "this might be missing" null checks — only the lightbox
// cares about both kinds.
export type LightboxTarget =
  | { kind: "bookmark"; bookmark: Bookmark; mediaUrl: string | null }
  | { kind: "quote"; quote: QuotedTweet; mediaUrl: string | null };

type LightboxContextValue = {
  target: LightboxTarget | null;
  open: (bookmark: Bookmark, mediaUrl?: string | null) => void;
  openQuote: (quote: QuotedTweet, mediaUrl?: string | null) => void;
  close: () => void;
};

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<LightboxTarget | null>(null);

  const open = useCallback(
    (bookmark: Bookmark, mediaUrl: string | null = null) => {
      setTarget({ kind: "bookmark", bookmark, mediaUrl });
    },
    []
  );
  const openQuote = useCallback(
    (quote: QuotedTweet, mediaUrl: string | null = null) => {
      setTarget({ kind: "quote", quote, mediaUrl });
    },
    []
  );
  const close = useCallback(() => setTarget(null), []);

  const value = useMemo(
    () => ({ target, open, openQuote, close }),
    [target, open, openQuote, close]
  );

  return (
    <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>
  );
}

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("useLightbox requires <LightboxProvider>");
  return ctx;
}
