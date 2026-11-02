import { useShop } from "./shop";
import { tierOrder } from "./tiers";

export function useAnalytics() {
  const { customers, orders, transactions, redemptions, referrals, tiers } = useShop();
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
    // Customers per tier, from the entry tier upwards.
    tierCounts: tierOrder(tiers).map((tier) => ({
      tier,
      count: customers.filter((c) => c.tier === tier).length,
    })),
    totalRewardsRedeemed: redemptions.length,
    referralConversions: referrals.filter((r) => r.completed).length,
    repeatCustomers: customers.filter((c) => c.ordersCount > 1).length,
    oneTimeCustomers: customers.filter((c) => c.ordersCount === 1).length,
    inactive30: customers.filter((c) => daysSince(c.lastOrder) >= 30).length,
    inactive60: customers.filter((c) => daysSince(c.lastOrder) >= 60).length,
    inactive90: customers.filter((c) => daysSince(c.lastOrder) >= 90).length,
  };
}
