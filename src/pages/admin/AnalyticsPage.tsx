import { useAnalytics } from "../../data/analytics";
import { useShop } from "../../data/shop";
import { TierBadge } from "../../components/TierBadge";

const riskIndicator = (lastOrder: string) => {
  const days = Math.floor(
    (Date.now() - new Date(lastOrder).getTime()) / 86400000,
  );
  if (days < 30)
    return {
      label: "Low Risk",
      color: "text-green-400 bg-green-400/10",
      note: "Recent activity",
      days,
    };
  if (days < 60)
    return {
      label: "Medium Risk",
      color: "text-yellow-400 bg-yellow-400/10",
      note: "No purchase 30–60 days",
      days,
    };
  return {
    label: "High Risk",
    color: "text-red-400 bg-red-400/10",
    note: "No purchase 60+ days",
    days,
  };
};

export function AdminAnalyticsPage() {
  const analytics = useAnalytics();
  const { customers } = useShop();
  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Customer retention & loyalty program performance
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: analytics.totalCustomers },
          { label: "Active Customers", value: analytics.activeCustomers },
          { label: "Repeat Customers", value: analytics.repeatCustomers },
          { label: "One-Time Customers", value: analytics.oneTimeCustomers },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]"
          >
            <div className="font-mono-data text-2xl font-bold text-[var(--gold-mid)]">
              {s.value}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Loyalty KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          {
            label: "Points Issued",
            value: analytics.totalPointsIssued.toLocaleString(),
            icon: "⭐",
          },
          {
            label: "Points Redeemed",
            value: analytics.totalPointsRedeemed.toLocaleString(),
            icon: "💰",
          },
          {
            label: "Redemption Rate",
            value: `${analytics.totalPointsIssued ? Math.round((analytics.totalPointsRedeemed / analytics.totalPointsIssued) * 100) : 0}%`,
            icon: "📊",
          },
          {
            label: "Rewards Redeemed",
            value: analytics.totalRewardsRedeemed,
            icon: "🎁",
          },
          {
            label: "Referral Conversions",
            value: analytics.referralConversions,
            icon: "🤝",
          },
          {
            label: "Completed Orders",
            value: analytics.completedOrders,
            icon: "📦",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]"
          >
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="font-mono-data text-xl font-bold text-[var(--gold-mid)]">
              {s.value}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top customers */}
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="font-semibold mb-4 text-sm">Top Customers by Spend</h3>
          <div className="flex flex-col gap-3">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="font-mono-data text-sm font-bold text-[var(--muted-foreground)] w-5">
                  {i + 1}
                </span>
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <TierBadge tier={c.tier} />
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono-data text-sm font-bold text-[var(--gold-mid)]">
                    ${c.totalSpent}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {c.ordersCount} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Churn risk (rule-based) */}
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold text-sm">
              Customer Engagement Indicator
            </h3>
            <span className="text-xs bg-[var(--secondary)] text-[var(--muted-foreground)] px-2 py-0.5 rounded-full">
              Rule-based · Not AI
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Engagement level is determined by days since last order — not an AI
            prediction model.
          </p>
          <div className="flex flex-col gap-2">
            {customers.map((c) => {
              const risk = riskIndicator(c.lastOrder);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)] last:border-0"
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted-foreground)]">
                      {risk.days}d ago
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full ${risk.color}`}
                    >
                      {risk.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inactive breakdown */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-3 text-sm">Inactivity Breakdown</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Inactive 30+ days",
              value: analytics.inactive30,
              color: "text-yellow-400",
            },
            {
              label: "Inactive 60+ days",
              value: analytics.inactive60,
              color: "text-orange-400",
            },
            {
              label: "Inactive 90+ days",
              value: analytics.inactive90,
              color: "text-red-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="text-center p-3 bg-[var(--secondary)] rounded-lg"
            >
              <div className={`font-mono-data text-xl font-bold ${s.color}`}>
                {s.value}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
