import * as React from "react"

import { useSettings } from "@/contexts/settings-context"

// Theme is part of the Settings schema — persisted via
// `~/.index-n2/settings.json` through `SettingsContext`, not
// localStorage. `ThemeApplier` is a thin effect-holder that watches
// `settings.theme` and keeps the `.light`/`.dark` class on <html> in sync.
// All mutation goes through `useSettings().update({ theme })`. Named
// `Applier` (not `Provider`) because it exposes no context of its own —
// it's purely a side-effect wrapper around children.
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │ KEEP IN SYNC WITH THE INLINE SCRIPT IN `index.html`.                │
// │                                                                     │
// │ Shared contract between the two:                                    │
// │   • Valid theme values: "light" | "dark" | "system"                 │
// │   • localStorage key: "theme"                                       │
// │   • "system" resolves via matchMedia("(prefers-color-scheme: dark)")│
// │                                                                     │
// │ The inline script runs synchronously before any JS bundle loads, so │
// │ it can't import from here — the duplication is structural (standard │
// │ pattern for SPA FOUC avoidance; same approach as next-themes). If   │
// │ you change any of the above, update index.html too.                 │
// └─────────────────────────────────────────────────────────────────────┘

export type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light"
}

// Suspend all transitions for one frame while swapping the theme class, to
// avoid the cross-fade flicker browsers do when `color`/`background-color`
// properties change simultaneously. Pattern from next-themes.
function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.textContent = `*,*::before,*::after{transition:none !important}`
  document.head.appendChild(style)
  return () => {
    // Force reflow before removing so the override actually takes effect.
    void window.getComputedStyle(document.body).opacity
    document.head.removeChild(style)
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === "system" ? getSystemTheme() : theme
  const restore = disableTransitionsTemporarily()
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  restore()
}

export function ThemeApplier({ children }: { children: React.ReactNode }) {
  // Couples to SettingsContext's `loaded` flag intentionally. Necessary,
  // not a smell: without it, the effect would fire with
  // `settings.theme === "system"` (the DEFAULT placeholder) before the
  // server fetch resolves, and would overwrite the inline script's correct
  // class. If the shape of `useSettings()` ever changes such that `loaded`
  // is renamed or removed, the flicker returns silently.
  const { settings, loaded } = useSettings()
  const { theme } = settings

  // Apply on mount + whenever the stored theme changes. The localStorage
  // write is a *write-only mirror* (not a source of truth) read by the
  // inline FOUC-avoidance script in index.html. Users who hand-edit the
  // cache will see it overwritten here on next apply.
  React.useEffect(() => {
    if (!loaded) return
    applyTheme(theme)
    try {
      localStorage.setItem("theme", theme)
    } catch { /* localStorage failure is non-fatal — write-only mirror */ }
  }, [theme, loaded])

  // Subscribe to the OS-level color scheme only while the user is on
  // "system". Switching to an explicit theme removes the listener;
  // switching back re-adds. Same `loaded` guard — no point listening until
  // we know the real theme.
  React.useEffect(() => {
    if (!loaded || theme !== "system") return
    const mq = window.matchMedia(COLOR_SCHEME_QUERY)
    const onChange = () => applyTheme("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme, loaded])

  return <>{children}</>
}
