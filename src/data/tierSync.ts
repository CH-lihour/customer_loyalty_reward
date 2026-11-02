import { useCallback, useEffect, useRef, useState } from "react";
import { apiTiers, type AdminTier } from "./api";
import { useShop } from "./shop";
import type { TierTable } from "./tiers";

/**
 * Loads the membership tiers from the API into the store, so customers' tiers, multipliers and
 * reward checks follow them. Does nothing without a staff token. `reload` refetches after a change.
 */
export function useApiTiers(token: string | null) {
  const { syncTiers } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncTiers);
  sync.current = syncTiers;
  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (!token) return;
    const loaded = await apiTiers(token);
    setTiers(loaded);
    // Keep the demo tiers when the API has none, so the storefront still has an entry tier.
    if (loaded.length) {
      sync.current(
        Object.fromEntries(
          loaded.map((t): [string, TierTable[string]] => [
            t.name,
            { min: t.min, max: t.max, multiplier: t.multiplier, color: t.color },
          ]),
        ),
      );
    }
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

  return { tiers, loading, loadError, reload };
}
