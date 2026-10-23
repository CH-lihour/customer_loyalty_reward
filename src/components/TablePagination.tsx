import { useState } from "react";

export const pageSizeOptions = [10, 30, 50, 100];
export const defaultPageSize = 30;
const pageSizeKey = "khmershop-admin-page-size";

const readPageSize = () => {
  try {
    const saved = Number(localStorage.getItem(pageSizeKey));
    return pageSizeOptions.includes(saved) ? saved : defaultPageSize;
  } catch {
    return defaultPageSize;
  }
};

/** Rows per page for admin tables. The choice is remembered in this browser and used by every table. */
export function usePageSize(): [number, (size: number) => void] {
  const [pageSize, setPageSize] = useState(readPageSize);
  const change = (size: number) => {
    setPageSize(size);
    try {
      localStorage.setItem(pageSizeKey, String(size));
    } catch {
      /* The size still applies until refresh. */
    }
  };
  return [pageSize, change];
}

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

/** Pages through rows held in the browser. Filtering that shrinks the list moves back to its last page. */
export function usePagedRows<T>(rows: T[]): { rows: T[]; pagination: PaginationProps } {
  const [pageSize, setPageSize] = usePageSize();
  const [page, setPage] = useState(1);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  return {
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
    pagination: {
      page: current,
      pageSize,
      total: rows.length,
      onPageChange: setPage,
      onPageSizeChange: (size) => {
        setPageSize(size);
        setPage(1);
      },
    },
  };
}

const navButton =
  "grid h-8 min-w-8 place-items-center rounded-lg border border-[var(--border)] px-2 text-xs hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40";

/** Footer for an admin table: the row range shown, a rows-per-page picker, and page controls. */
export function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
      <span>
        {total ? `Showing ${first}–${last} of ${total}` : "No rows"}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--foreground)]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <nav aria-label="Table pages" className="flex items-center gap-1">
          <button type="button" className={navButton} onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page">«</button>
          <button type="button" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
          <span className="px-2 text-[var(--foreground)]">Page {page} of {lastPage}</span>
          <button type="button" className={navButton} onClick={() => onPageChange(page + 1)} disabled={page >= lastPage} aria-label="Next page">›</button>
          <button type="button" className={navButton} onClick={() => onPageChange(lastPage)} disabled={page >= lastPage} aria-label="Last page">»</button>
        </nav>
      </div>
    </div>
  );
}
