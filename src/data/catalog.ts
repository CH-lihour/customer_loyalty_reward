import { useCallback, useEffect, useRef, useState } from "react";
import { apiCatalog } from "./api";
import { useShop } from "./shop";

/**
 * Loads categories and products from the API into the store when an admin page opens.
 * `reload` refetches after a change; pass `stock` to set counts the API does not keep.
 */
export function useApiCatalog(token: string) {
  const { syncCatalog } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncCatalog);
  sync.current = syncCatalog;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(
    async (stock?: Record<string, number>) => {
      const catalog = await apiCatalog(token);
      sync.current(catalog.categories, catalog.products, stock);
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload().then(
      () => {
        if (cancelled) return;
        setLoadError("");
        setLoading(false);
      },
      (error: Error) => {
        if (cancelled) return;
        setLoadError(error.message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { loading, loadError, reload };
}
