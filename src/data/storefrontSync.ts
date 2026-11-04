import { useCallback, useEffect, useRef } from "react";
import { apiStorefront } from "./api";
import { inventoryPages } from "./adminAccess";
import { useShop } from "./shop";

/**
 * Loads what everyone browses from the API into the store: the catalog, rewards, tiers, badges, campaigns and
 * the exchange rate. `staffPages` is null for guests and customers. Staff keep the fuller lists their own pages
 * load, such as inactive rewards. Without a server the store keeps its demo data.
 */
export function useStorefront(staffPages: readonly string[] | null) {
  const shop = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const latest = useRef(shop);
  latest.current = shop;
  const access = staffPages?.join(",") ?? null;

  const reload = useCallback(async () => {
    const data = await apiStorefront();
    const pages = access?.split(",") ?? [];
    const { syncBadges, syncCampaigns, syncCatalog, syncExchangeRate, syncRewards, syncRewardStock, syncTiers } = latest.current;
    const staff = access !== null;
    if (Object.keys(data.tiers).length) syncTiers(data.tiers);
    syncBadges(data.badges);
    syncExchangeRate(data.exchangeRate);
    if (!staff || !pages.some((page) => page === "products" || page === "categories")) syncCatalog(data.categories, data.products);
    if (!staff || !pages.includes("campaigns")) syncCampaigns(data.campaigns);
    if (!staff || !pages.some((page) => page === "rewards" || inventoryPages.includes(page as (typeof inventoryPages)[number]))) {
      syncRewards(data.rewards);
      syncRewardStock(data.stockItems, data.availability);
    }
  }, [access]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return reload;
}
