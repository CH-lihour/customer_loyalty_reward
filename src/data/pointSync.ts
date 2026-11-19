import { useEffect, useRef } from "react";
import { apiMyPoints, apiProfile, type ApiProfile } from "./api";
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
        if (!cancelled)
          sync.current(userId, profile.points_balance ?? 0, profile.qualifying_points ?? 0, rows, profile.referral_code, account(profile));
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [token, userId]);
}

/** Loads the customer's balance and ledger once, e.g. right after an order earned points. */
export async function refreshCustomerPoints(
  token: string,
  userId: string,
  sync: ReturnType<typeof useShop>["syncCustomerPoints"],
) {
  const [profile, rows] = await Promise.all([apiProfile("customer", token), apiMyPoints(token)]);
  sync(userId, profile.points_balance ?? 0, profile.qualifying_points ?? 0, rows, profile.referral_code, account(profile));
}

/** The account details the profile adds beyond points: tier, lifetime spend and order count. */
const account = (profile: ApiProfile) => ({
  tier: profile.tier,
  totalSpent: profile.total_spent === undefined ? undefined : Number(profile.total_spent),
  ordersCount: profile.orders_count,
});
