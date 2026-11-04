import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiStock } from "./api";
import { useShop } from "./shop";

type StockApi = {
  token: string;
  loading: boolean;
  loadError: string;
  /** Refetches the stock snapshot into the store, after a change made through the API. */
  reload: () => Promise<void>;
};

const StockApiContext = createContext<StockApi | null>(null);

/**
 * Loads rewards' stock (rules, locations, suppliers, ledger and stocktakes) from the API into the store
 * while an inventory page is open, and gives its pages and dialogs the token and `reload`.
 */
export function StockApiProvider({ token, children }: { token: string; children: ReactNode }) {
  const { syncStock } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncStock);
  sync.current = syncStock;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    sync.current(await apiStock(token));
  }, [token]);

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

  return (
    <StockApiContext.Provider value={{ token, loading, loadError, reload }}>
      {loadError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">
          Could not load stock from the server: {loadError}
        </p>
      )}
      {children}
    </StockApiContext.Provider>
  );
}

export function useStockApi() {
  const api = useContext(StockApiContext);
  if (!api) throw new Error("useStockApi must be used inside StockApiProvider.");
  return api;
}

/**
 * Runs an API change, then reloads stock. Returns the error message, or null on success,
 * matching the store's mutation convention.
 */
export function useStockMutation() {
  const { reload } = useStockApi();
  return useCallback(
    async (change: () => Promise<unknown>): Promise<string | null> => {
      try {
        await change();
      } catch (error) {
        return (error as Error).message;
      }
      await reload().catch(() => {});
      return null;
    },
    [reload],
  );
}
