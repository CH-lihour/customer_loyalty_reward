import { useShop } from "./shop";

export function useAnalytics() {
  const { customers, orders, transactions, redemptions, referrals } = useShop();
  const completed = orders.filter((o) => o.status === "COMPLETED");
  const daysSince = (date: string) =>
    date
      ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
      : Infinity;
  return {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c) => daysSince(c.lastOrder) < 30)
      .length,
    totalOrders: orders.length,
    completedOrders: completed.length,
    totalPointsIssued: transactions
      .filter((t) => t.points > 0)
      .reduce((n, t) => n + t.points, 0),
    totalPointsRedeemed: -transactions
      .filter((t) => t.type === "SPEND")
      .reduce((n, t) => n + t.points, 0),
    silverCustomers: customers.filter((c) => c.tier === "Silver").length,
    goldCustomers: customers.filter((c) => c.tier === "Gold").length,
    platinumCustomers: customers.filter((c) => c.tier === "Platinum").length,
    totalRewardsRedeemed: redemptions.length,
    referralConversions: referrals.filter((r) => r.completed).length,
    repeatCustomers: customers.filter((c) => c.ordersCount > 1).length,
    oneTimeCustomers: customers.filter((c) => c.ordersCount === 1).length,
    inactive30: customers.filter((c) => daysSince(c.lastOrder) >= 30).length,
    inactive60: customers.filter((c) => daysSince(c.lastOrder) >= 60).length,
    inactive90: customers.filter((c) => daysSince(c.lastOrder) >= 90).length,
  };
}
