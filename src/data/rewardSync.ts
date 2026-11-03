import { useCallback, useEffect, useRef, useState } from "react";
import { apiRewards } from "./api";
import { useShop } from "./shop";

/**
 * Loads the rewards from the API into the store, so the customer catalog, redemptions and stock pages
 * follow them. Does nothing without a staff token. `reload` refetches after a change.
 */
export function useApiRewards(token: string | null) {
  const { syncRewards } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncRewards);
  sync.current = syncRewards;
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (!token) return;
    sync.current(await apiRewards(token));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setLoading(Boolean(token));
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
  }, [reload, token]);

  return { loading, loadError, reload };
}
