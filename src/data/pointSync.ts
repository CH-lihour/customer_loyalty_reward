import { useEffect, useRef } from "react";
import { apiMyPoints, apiProfile } from "./api";
import { useShop } from "./shop";

/**
 * Loads a signed-in customer's balance and points ledger from the API into the store, so changes staff make
 * show on their pages. Does nothing without a customer token. A failure leaves the store as it was: the
 * session check already handles a token the API rejects.
 */
export function useCustomerPoints(token: string | null, userId: string | null) {
  const { syncCustomerPoints } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncCustomerPoints);
  sync.current = syncCustomerPoints;

  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    Promise.all([apiProfile("customer", token), apiMyPoints(token)]).then(
      ([profile, rows]) => {
        if (!cancelled) sync.current(userId, profile.points_balance ?? 0, profile.qualifying_points ?? 0, rows);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [token, userId]);
}
