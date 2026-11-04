import { useCallback, useEffect, useRef } from "react";
import { apiActivityLogs, apiCustomers, apiOrders, apiReferrals, apiReportTotals } from "./api";
import { useShop } from "./shop";

/**
 * Loads what staff work from into the store, limited to what their pages may read: customers, orders, referrals,
 * the activity log and the dashboard totals. Reloads when `openPage` changes. Does nothing without a staff token,
 * and a list that fails to load leaves the store's copy as it was. Returns the reload for pages that change things.
 */
export function useApiOperations(token: string | null, pages: readonly string[], openPage: string) {
  const shop = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const latest = useRef(shop);
  latest.current = shop;
  const access = pages.join(",");

  const reload = useCallback(async () => {
    if (!token) return;
    const allowed = access.split(",");
    const canRead = (...wanted: string[]) => wanted.some((page) => allowed.includes(page));
    const { syncCustomers, syncLogs, syncOrders, syncReferrals, syncReportTotals } = latest.current;
    await Promise.allSettled([
      canRead("customers", "users", "dashboard", "analytics", "logs", "referrals", "fulfillment")
        ? apiCustomers(token).then(syncCustomers)
        : null,
      canRead("orders", "customers", "dashboard", "analytics") ? apiOrders(token).then(syncOrders) : null,
      canRead("referrals", "analytics") ? apiReferrals(token).then(syncReferrals) : null,
      canRead("logs", "dashboard") ? apiActivityLogs(token).then(syncLogs) : null,
      canRead("dashboard", "analytics") ? apiReportTotals(token).then(syncReportTotals) : null,
    ]);
  }, [token, access]);

  useEffect(() => {
    void reload();
  }, [reload, openPage]);

  return reload;
}
