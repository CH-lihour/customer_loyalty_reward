import { useEffect, useRef, useState } from "react";
import type { ApiPage } from "./api";
import { usePageSize, type PaginationProps } from "../components/TablePagination";

/**
 * Loads one page of an API list for an admin table. Changing `filterKey` (the filters in use)
 * goes back to page 1; `reload` refetches the current page after a change.
 */
export function useApiTable<T>(load: (page: number, perPage: number) => Promise<ApiPage<T>>, filterKey = "") {
  const [pageSize, setPageSize] = usePageSize();
  const [page, setPage] = useState(1);
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  const [result, setResult] = useState<ApiPage<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  // The loader closes over the page's filters; read the latest without refetching on every render.
  const loader = useRef(load);
  loader.current = load;

  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loader.current(page, pageSize).then(
      (next) => {
        if (cancelled) return;
        // A delete can empty the last page; step back to the new last page.
        if (page > next.meta.last_page && page > 1) return setPage(next.meta.last_page);
        setResult(next);
        setError("");
        setLoading(false);
      },
      (failure: Error) => {
        if (cancelled) return;
        setError(failure.message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, filterKey, version]);

  const pagination: PaginationProps = {
    page,
    pageSize,
    total: result?.meta.total ?? 0,
    onPageChange: setPage,
    onPageSizeChange: (size) => {
      setPageSize(size);
      setPage(1);
    },
  };

  return { rows: result?.rows ?? [], loading, error, reload: () => setVersion((v) => v + 1), pagination };
}
