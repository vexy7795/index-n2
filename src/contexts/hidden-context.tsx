/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type HiddenValue = {
  hiddenIds: ReadonlySet<string>;
  isHidden: (id: string) => boolean;
  archive: (ids: string[]) => void;
  restore: (ids: string[]) => void;
};

const HiddenContext = createContext<HiddenValue | null>(null);

export function HiddenProvider({ children }: { children: ReactNode }) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  // Ref-tracked mirror of hiddenIds so two synchronous archive()/restore()
  // calls both read the latest computed state. Without this, React's async
  // setState lets two rapid clicks share the same pre-change closure value:
  // the second call's `next` is built from stale `hiddenIds`, omits the
  // first call's id, and that id is lost on disk after both POSTs land.
  const hiddenIdsRef = useRef<Set<string>>(new Set());
  // Serialize POSTs through a promise chain. Without this, two in-flight
  // requests can resolve out of order — the later POST's body overwrites
  // the earlier one's on disk even when the user expected the later state
  // to win, because the server just stores whatever payload it received last.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  const resyncFromServer = useCallback(() => {
    return fetch("/api/archive")
      .then((r) => r.json())
      .then((ids: string[]) => {
        const set = new Set(ids);
        hiddenIdsRef.current = set;
        setHiddenIds(set);
      });
  }, []);

  useEffect(() => {
    resyncFromServer().catch((e) =>
      console.error("Failed to load hidden bookmarks:", e),
    );
  }, [resyncFromServer]);

  const persist = useCallback(
    (next: Set<string>) => {
      hiddenIdsRef.current = next;
      setHiddenIds(next);
      chainRef.current = chainRef.current.then(async () => {
        try {
          const res = await fetch("/api/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([...next]),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (e) {
          console.error("Failed to persist hidden bookmarks:", e);
          // Snap UI back to disk truth on failure. Without this, the
          // optimistic state lies until the next reload — user thinks the
          // archive took when it didn't. Resyncing means the bookmark
          // visibly un-archives itself, which is an honest signal even
          // without a toast surface. If the resync also fails (server
          // unreachable), we log and leave the optimistic state — the user
          // will see the truth on next successful resync or page reload.
          try {
            await resyncFromServer();
          } catch (e2) {
            console.error("Failed to resync after persist error:", e2);
          }
        }
      });
    },
    [resyncFromServer],
  );

  const archive = useCallback(
    (ids: string[]) => {
      const next = new Set(hiddenIdsRef.current);
      for (const id of ids) next.add(id);
      persist(next);
    },
    [persist],
  );

  const restore = useCallback(
    (ids: string[]) => {
      const next = new Set(hiddenIdsRef.current);
      for (const id of ids) next.delete(id);
      persist(next);
    },
    [persist],
  );

  const isHidden = useCallback(
    (id: string) => hiddenIds.has(id),
    [hiddenIds],
  );

  const value = useMemo<HiddenValue>(
    () => ({ hiddenIds, isHidden, archive, restore }),
    [hiddenIds, isHidden, archive, restore],
  );

  return (
    <HiddenContext.Provider value={value}>{children}</HiddenContext.Provider>
  );
}

export function useHidden(): HiddenValue {
  const ctx = useContext(HiddenContext);
  if (!ctx) throw new Error("useHidden requires <HiddenProvider>");
  return ctx;
}
