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
import { DEFAULT_SETTINGS, type Settings } from "@/types/settings";

type SettingsValue = {
  settings: Settings;
  // Partial patch — server merges and returns the full object, which we
  // reconcile into local state.
  update: (patch: Partial<Settings>) => void;
  loaded: boolean;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  // Serialize POSTs through a promise chain. Without this, two rapid
  // update() calls race on the server: each POST reads settings.json,
  // merges its patch, writes. If POST2 reads before POST1 writes, POST2
  // overwrites POST1's change on disk. Chaining each request through
  // .then() makes them wait for the previous response before starting.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  const resyncFromServer = useCallback(() => {
    return fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Partial<Settings>) => {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      });
  }, []);

  useEffect(() => {
    resyncFromServer()
      .catch((e) => console.error("Failed to load settings:", e))
      .finally(() => setLoaded(true));
  }, [resyncFromServer]);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      // Optimistic local update. The functional setState form reads the
      // latest committed value, so no ref-tracked mirror is needed here
      // (unlike hidden-context, where the consumer builds `next` from the
      // current set and the closure-vs-latest distinction matters).
      setSettings((prev) => ({ ...prev, ...patch }));
      chainRef.current = chainRef.current.then(async () => {
        try {
          const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const next: Partial<Settings> = await res.json();
          setSettings({ ...DEFAULT_SETTINGS, ...next });
        } catch (e) {
          console.error("Failed to persist settings:", e);
          // Snap UI back to disk truth so the optimistic merge doesn't
          // linger as a lie. User sees the setting revert — an honest
          // signal without a toast surface. If resync also fails (server
          // unreachable), the optimistic state stays until next reload.
          try {
            await resyncFromServer();
          } catch (e2) {
            console.error("Failed to resync settings after persist error:", e2);
          }
        }
      });
    },
    [resyncFromServer],
  );

  const value = useMemo(
    () => ({ settings, update, loaded }),
    [settings, update, loaded]
  );
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings requires <SettingsProvider>");
  return ctx;
}
