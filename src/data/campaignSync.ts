import { useCallback, useEffect, useRef, useState } from "react";
import { apiCampaigns } from "./api";
import { useShop } from "./shop";

/**
 * Loads the campaigns from the API into the store, so order points use the admin's multipliers.
 * Does nothing without a staff token. `reload` refetches after a change.
 */
export function useApiCampaigns(token: string | null) {
  const { syncCampaigns } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncCampaigns);
  sync.current = syncCampaigns;
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (!token) return;
    sync.current(await apiCampaigns(token));
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
