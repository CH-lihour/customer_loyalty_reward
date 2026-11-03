import { useCallback, useEffect, useRef, useState } from "react";
import { apiBadges, type AdminBadge } from "./api";
import { useShop } from "./shop";

/**
 * Loads the badges from the API into the store, so customers earn and see the same badges the
 * admin manages. Does nothing without a staff token. `reload` refetches after a change.
 */
export function useApiBadges(token: string | null) {
  const { syncBadges } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncBadges);
  sync.current = syncBadges;
  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (!token) return;
    const loaded = await apiBadges(token);
    setBadges(loaded);
    sync.current(loaded.map(({ customerCount: _, ...badge }) => badge));
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

  return { badges, loading, loadError, reload };
}
