import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { apiSearchPointCustomers, type PointCustomer } from "../data/api";
import { Icon } from "./Icon";

/** How long typing must pause before searching, in milliseconds. */
const SEARCH_DELAY_MS = 300;

/**
 * A searchable customer picker. Typing searches the API by name, email or ID, so it reaches every customer
 * rather than one page of them.
 */
export function CustomerCombobox({
  token,
  value,
  onChange,
}: {
  token: string;
  value: PointCustomer | null;
  onChange: (customer: PointCustomer | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PointCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    const timer = setTimeout(() => {
      apiSearchPointCustomers(token, query.trim())
        .then(
          (found) => {
            if (cancelled) return;
            setResults(found);
            setActiveIndex(found.length ? 0 : -1);
          },
          (failure: Error) => {
            if (cancelled) return;
            setResults([]);
            setActiveIndex(-1);
            setLoadError(failure.message);
          },
        )
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, token]);

  // Clicking anywhere outside closes the list.
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex]);

  const choose = (customer: PointCustomer) => {
    onChange(customer);
    setQuery("");
    setOpen(false);
  };
  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return setOpen(true);
      if (!results.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % results.length);
    } else if (event.key === "Enter" && open) {
      // Picks the highlighted customer rather than submitting the form.
      event.preventDefault();
      if (results[activeIndex]) choose(results[activeIndex]);
    } else if (event.key === "Escape" && open) {
      // Closes the list without also closing the dialog around it.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-label="Customer"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        placeholder="Search name, email or ID…"
        value={open ? query : value ? `${value.name} · ${value.points.toLocaleString()} pts` : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full pl-3 pr-9 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50"
      />
      {(value || query) && (
        <button
          type="button"
          aria-label="Clear customer"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Customers"
          // In the page flow, not floating: the dialog scrolls and would clip it, so it grows instead.
          className="mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] py-1"
        >
          {results.map((customer, index) => (
            <li
              key={customer.id}
              id={optionId(index)}
              role="option"
              aria-selected={customer.id === value?.id}
              // Keeps focus in the input so the click lands before anything closes.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(customer)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-3 py-2 ${index === activeIndex ? "bg-[var(--secondary)]" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-[var(--foreground)]">{customer.name}</span>
                <span className="shrink-0 font-mono-data text-xs text-[var(--gold-mid)]">
                  {customer.points.toLocaleString()} pts
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 text-xs text-[var(--muted-foreground)]">
                <span className="truncate">{customer.email}</span>
                <span className="shrink-0">{customer.tier}</span>
              </div>
            </li>
          ))}
          {!results.length && (
            <li role="presentation" className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
              {loading ? "Searching…" : loadError || "No customers found"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
