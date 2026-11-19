import { useAnalytics, useDashboardStats } from "../../data/analytics";
import { useShop } from "../../data/shop";
import { TierBadge } from "../../components/TierBadge";
import { Icon } from "../../components/Icon";

export function AdminDashboardPage({ token = null }: { token?: string | null }) {
  const local = useAnalytics();
  const { orders, logs } = useShop();
  // Signed in as staff, every number comes from the API; the demo store is the fallback.
  const { stats, error, live } = useDashboardStats(token, "dashboard");
  const analytics = live ? (stats ?? { ...local, ...emptyStats }) : local;
  const activityLog = live ? (stats?.recentActivity ?? []) : logs;
  const statCards = [
    {
      label: "Total Customers",
      value: analytics.totalCustomers,
      icon: "users",
      sub: `${analytics.activeCustomers} active`,
    },
    {
      label: "Total Orders",
      value: analytics.totalOrders,
      icon: "orders",
      sub: `${analytics.completedOrders} completed`,
    },
    {
      label: "Points Issued",
      value: analytics.totalPointsIssued.toLocaleString(),
      icon: "star",
      sub: `${analytics.totalPointsRedeemed.toLocaleString()} redeemed`,
    },
    {
      label: "Rewards Redeemed",
      value: analytics.totalRewardsRedeemed,
      icon: "gift",
      sub: "total redemptions",
    },
    {
      label: "Referral Conversions",
      value: analytics.referralConversions,
      icon: "users",
      sub: "successful referrals",
    },
    {
      label: "Repeat Customers",
      value: analytics.repeatCustomers,
      icon: "repeat",
      sub: `${analytics.oneTimeCustomers} one-time`,
    },
  ];

  const tierDist = analytics.tierCounts;

  const recentOrders = live ? (stats?.recentOrders ?? []) : orders.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          KhmerShop Platform Overview
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]"
          >
            <div className="flex items-start justify-between mb-2">
              <Icon name={s.icon} className="h-6 w-6 text-[var(--gold-mid)]" />
            </div>
            <div className="font-mono-data text-2xl font-bold text-[var(--gold-mid)]">
              {s.value}
            </div>
            <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier distribution */}
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="font-semibold mb-4">Tier Distribution</h3>
          <div className="flex flex-col gap-3">
            {tierDist.map(({ tier, count }) => {
              const pct = analytics.totalCustomers ? Math.round((count / analytics.totalCustomers) * 100) : 0;
              return (
                <div key={tier}>
                  <div className="flex justify-between items-center mb-1">
                    <TierBadge tier={tier} />
                    <span className="font-mono-data text-sm font-semibold">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="flex flex-col gap-2">
            {activityLog.slice(0, 5).map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="text-[var(--muted-foreground)] shrink-0">
                  {log.timestamp.split(" ")[0]}
                </span>
                <span className="text-[var(--foreground)] truncate">
                  {log.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs">
                <th className="text-left pb-2 font-medium">Order ID</th>
                <th className="text-left pb-2 font-medium">Customer</th>
                <th className="text-left pb-2 font-medium">Date</th>
                <th className="text-right pb-2 font-medium">Total</th>
                <th className="text-right pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recentOrders.map((o) => (
                <tr key={o.id} className="text-sm">
                  <td className="py-2.5 font-mono-data text-xs">{o.id}</td>
                  <td className="py-2.5">{o.customerName}</td>
                  <td className="py-2.5 text-[var(--muted-foreground)]">
                    {o.createdAt}
                  </td>
                  <td className="py-2.5 text-right font-medium">${o.total}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        o.status === "COMPLETED"
                          ? "text-green-400 bg-green-400/10"
                          : o.status === "PROCESSING"
                            ? "text-orange-400 bg-orange-400/10"
                            : o.status === "SHIPPED"
                              ? "text-cyan-400 bg-cyan-400/10"
                              : "text-yellow-400 bg-yellow-400/10"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Shown while the API numbers load, so the cards don't flash the demo store's numbers. */
const emptyStats = {
  totalCustomers: 0, activeCustomers: 0, totalOrders: 0, completedOrders: 0, totalPointsIssued: 0, totalPointsRedeemed: 0,
  tierCounts: [], totalRewardsRedeemed: 0, referralConversions: 0, repeatCustomers: 0, oneTimeCustomers: 0,
  inactive30: 0, inactive60: 0, inactive90: 0,
};
