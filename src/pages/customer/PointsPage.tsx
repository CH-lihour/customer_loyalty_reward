import { useShop } from "../../data/shop";
import type { Tier } from "../../data/mockData";

const typeColors: Record<string, string> = {
  EARN: "text-green-400",
  SPEND: "text-red-400",
  ADJUST: "text-blue-400",
  REFERRAL: "text-purple-400",
};

const typeIcons: Record<string, string> = {
  EARN: "↑",
  SPEND: "↓",
  ADJUST: "⟳",
  REFERRAL: "🤝",
};

export function PointsPage() {
  const {
    currentUser: CURRENT_USER,
    transactions: loyaltyTransactions,
    tiers: tierConfig,
    qualifyingPoints,
    money,
  } = useShop();
  const tier = CURRENT_USER.tier;
  const config = tierConfig[tier];
  const nextTier =
    tier === "Silver" ? "Gold" : tier === "Gold" ? "Platinum" : null;
  const nextConfig = nextTier ? tierConfig[nextTier as Tier] : null;
  const qualifying = qualifyingPoints[CURRENT_USER.id] ?? CURRENT_USER.points;
  const progress = nextConfig
    ? Math.min(
        100,
        ((qualifying - config.min) / (nextConfig.min - config.min)) * 100,
      )
    : 100;
  const ptsToNext = nextConfig ? Math.max(0, nextConfig.min - qualifying) : 0;

  const myTxs = loyaltyTransactions.filter((t) => t.userId === CURRENT_USER.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">My Points</h1>

      {/* Balance card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #1a1e2e 0%, #1e2330 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 40%, var(--gold-mid) 0%, transparent 50%)",
          }}
        />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Current Balance
            </div>
            <div className="font-mono-data text-4xl font-bold text-[var(--gold-mid)]">
              {CURRENT_USER.points.toLocaleString()}
            </div>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">
              loyalty points
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Current Tier
            </div>
            <div className="font-display text-2xl font-semibold">{tier}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {config.multiplier}× point multiplier
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Total Spent
            </div>
            <div className="font-mono-data text-2xl font-semibold">
              {money(CURRENT_USER.totalSpent)}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              across all orders
            </div>
          </div>
        </div>

        {nextTier && (
          <div className="relative mt-6">
            <div className="flex justify-between mb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">
                Progress to {nextTier}
              </span>
              <span className="text-[var(--gold-mid)] font-semibold">
                {qualifying.toLocaleString()} /{" "}
                {nextConfig!.min.toLocaleString()} qualifying pts
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1.5">
              {ptsToNext.toLocaleString()} more points needed for {nextTier}
            </div>
          </div>
        )}
        {!nextTier && (
          <div className="relative mt-4 text-sm text-[var(--gold-light)] font-semibold">
            🏆 You've reached the highest tier!
          </div>
        )}
      </div>

      {/* Earning rules */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-3">How to Earn Points</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            {
              icon: "🛒",
              label: "$1 spent = 1 base point",
              note: `× ${config.multiplier} with your ${tier} tier`,
            },
            {
              icon: "🏷",
              label: "Bonus products",
              note: "Up to 3× on selected items",
            },
            {
              icon: "🤝",
              label: "Refer a friend",
              note: "+100 pts when they complete first order",
            },
            {
              icon: "📅",
              label: "Weekend campaign",
              note: "2× points (when active)",
            },
          ].map((e) => (
            <div
              key={e.label}
              className="flex gap-3 p-3 rounded-lg bg-[var(--secondary)]"
            >
              <span className="text-xl">{e.icon}</span>
              <div>
                <div className="font-medium">{e.label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {e.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="font-semibold mb-3">Transaction History</h3>
        <div className="flex flex-col gap-2">
          {myTxs.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-4 bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${typeColors[tx.type]} bg-current/10`}
              >
                <span>{typeIcons[tx.type]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{tx.reason}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {tx.createdAt}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-mono-data font-semibold ${tx.points > 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {tx.points > 0 ? "+" : ""}
                  {tx.points} pts
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  bal: {tx.balanceAfter.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
