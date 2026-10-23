import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const storageKey = "khmershop-theme";
const lightQuery = "(prefers-color-scheme: light)";

const ThemeContext = createContext<{
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
} | null>(null);

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Without storage the choice simply isn't remembered. */
  }
  return "system";
}

const systemTheme = (): Theme => (window.matchMedia(lightQuery).matches ? "light" : "dark");

/** Holds the viewer's theme choice, follows the OS setting in "system" mode, and sets `data-theme` on <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = mode === "system" ? system : mode;

  useEffect(() => {
    const query = window.matchMedia(lightQuery);
    const onChange = () => setSystem(query.matches ? "light" : "dark");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Cross-fade between themes (View Transitions where supported, a short colour fade otherwise);
  // the first paint and reduced-motion users switch instantly.
  const latestTheme = useRef(theme);
  latestTheme.current = theme;
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme === theme) return;
    // Read the latest choice when the swap runs, so a quick second switch can't be undone by a pending transition.
    const apply = () => {
      root.dataset.theme = latestTheme.current;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    if (document.startViewTransition) {
      document.startViewTransition(apply);
      return;
    }
    root.classList.add("theme-transition");
    apply();
    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 400);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove("theme-transition");
    };
  }, [theme]);

  // Keep other open tabs in step with a change made here.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) setModeState(readMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = (next: ThemeMode) => {
    try {
      if (next === "system") localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, next);
    } catch {
      /* The choice still applies for this visit. */
    }
    setModeState(next);
  };

  return <ThemeContext.Provider value={{ mode, theme, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
