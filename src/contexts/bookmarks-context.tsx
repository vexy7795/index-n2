/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Bookmark } from "@/types/bookmark";

type BookmarksValue = {
  bookmarks: Bookmark[] | null;
  byId: ReadonlyMap<string, Bookmark>;
  error: Error | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const BookmarksContext = createContext<BookmarksValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (!res.ok) throw new Error(`/api/bookmarks → HTTP ${res.status}`);
      const data: Bookmark[] = await res.json();
      setBookmarks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    reload();
  }, [reload]);

  const byId = useMemo(() => {
    const m = new Map<string, Bookmark>();
    if (bookmarks) for (const b of bookmarks) m.set(b.id, b);
    return m;
  }, [bookmarks]);

  const value = useMemo<BookmarksValue>(
    () => ({
      bookmarks,
      byId,
      error,
      loading: bookmarks === null && error === null,
      reload,
    }),
    [bookmarks, byId, error, reload]
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks(): BookmarksValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error("useBookmarks requires <BookmarksProvider>");
  return ctx;
}
