import { useCallback, useEffect, useRef, useState } from "react";

export type SyncState = {
  running: boolean;
  step: string | null;
  unfetchedCount: number;
  // True while an ft child process is alive. False during the post-ft
  // rebuildCaches phase — cancel button disables itself there since there's
  // no subprocess to kill and the rebuild is short enough (~1s cached,
  // ~30s cold) that waiting through it is fine.
  canCancel: boolean;
};

const INITIAL: SyncState = { running: false, step: null, unfetchedCount: 0, canCancel: false };

export function useSync() {
  const [state, setState] = useState<SyncState>(INITIAL);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/sync-stream");
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        setState(JSON.parse(e.data));
      } catch {
        // ignore malformed messages
      }
    };
    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const startSync = useCallback(async (mode: "all" | "bookmarks-rebuild" | "media" | "gaps" = "all") => {
    const res = await fetch(`/api/sync?mode=${mode}`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Sync failed (${res.status})`);
    }
  }, []);

  // Fire-and-forget: the server emits the state change via SSE, so the local
  // state updates through the same path as normal progress events. No need to
  // wait on the POST response.
  const cancelSync = useCallback(async () => {
    await fetch("/api/sync/cancel", { method: "POST" }).catch(() => {});
  }, []);

  return { ...state, startSync, cancelSync };
}
