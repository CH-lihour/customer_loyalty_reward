import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const options: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "system", label: "System", icon: "monitor" },
  { mode: "light", label: "Light", icon: "sun" },
  { mode: "dark", label: "Dark", icon: "moon" },
];

/** A button that opens a System / Light / Dark menu. `placement` picks which side the menu opens on. */
export function ThemeToggle({
  placement = "below-end",
  showLabel = false,
  className = "",
}: {
  placement?: "below-end" | "above-start";
  showLabel?: boolean;
  className?: string;
}) {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.mode === mode) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        className={`flex items-center gap-2 rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] ${showLabel ? "w-full border border-[var(--border)] px-3 py-2 text-xs" : "p-2"}`}
      >
        <Icon name={current.icon} className="h-4 w-4" />
        {showLabel && <span>Theme: {current.label}</span>}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-[70] w-36 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--toast-shadow)] ${placement === "above-start" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"}`}
        >
          {options.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option.mode}
              onClick={() => {
                setMode(option.mode);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${mode === option.mode ? "nav-link-active" : "text-[var(--foreground)] hover:bg-[var(--secondary)]"}`}
            >
              <Icon name={option.icon} className="h-4 w-4" />
              <span className="flex-1">{option.label}</span>
              {mode === option.mode && <Icon name="check" className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
