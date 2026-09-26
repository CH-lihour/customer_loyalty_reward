import type { Tier } from "../../data/mockData";
import { useShop } from "../../data/shop";
import { TierBadge } from "../../components/TierBadge";

interface Props {
  onNav: (p: string) => void;
  onAddToCart: (productId: string) => void;
}

export function HomePage({ onNav, onAddToCart }: Props) {
  const {
    currentUser: CURRENT_USER,
    products,
    rewards,
    transactions,
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

  const featured = products.filter((p) => p.featured).slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero loyalty card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{
          background:
            "linear-gradient(135deg, #1a1e2e 0%, #1e2330 50%, #16192a 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 50%, var(--gold-mid) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={CURRENT_USER.avatar}
              alt={CURRENT_USER.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[var(--gold-mid)]/50"
            />
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-0.5">
                Welcome back,
              </div>
              <div className="font-display text-xl font-semibold">
                {CURRENT_USER.name}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {CURRENT_USER.nameKh}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-8">
            <div className="text-center">
              <div className="font-mono-data text-2xl font-semibold text-[var(--gold-mid)]">
                {CURRENT_USER.points.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Points Balance
              </div>
            </div>
            <div className="text-center">
              <TierBadge tier={CURRENT_USER.tier} size="lg" />
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                Current Tier
              </div>
            </div>
            <div className="text-center">
              <div className="font-mono-data text-2xl font-semibold">
                {CURRENT_USER.ordersCount}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Orders
              </div>
            </div>
          </div>
        </div>

        {nextTier && (
          <div className="relative mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[var(--muted-foreground)]">
                Progress to {nextTier}
              </span>
              <span className="text-xs font-medium text-[var(--gold-mid)]">
                {ptsToNext.toLocaleString()} pts to go
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Points Balance",
            value: CURRENT_USER.points.toLocaleString(),
            icon: "⭐",
            sub: "available to redeem",
            onClick: () => onNav("points"),
          },
          {
            label: "Rewards Available",
            value: rewards
              .filter(
                (r) =>
                  r.active &&
                  r.stock > 0 &&
                  r.pointsCost <= CURRENT_USER.points &&
                  tierConfig[r.minTier].min <= tierConfig[tier].min,
              )
              .length.toString(),
            icon: "🎁",
            sub: "based on your tier",
            onClick: () => onNav("rewards"),
          },
          {
            label: "Badges Earned",
            value: CURRENT_USER.badges.length.toString(),
            icon: "🏅",
            sub: "keep collecting!",
            onClick: () => onNav("badges"),
          },
          {
            label: "Referral Bonus",
            value: "100 pts",
            icon: "🤝",
            sub: "per successful referral",
            onClick: () => onNav("referrals"),
          },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="text-left p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] card-glow transition-all hover:border-[var(--gold-mid)]/30"
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="font-mono-data text-lg font-semibold text-[var(--gold-mid)]">
              {stat.value}
            </div>
            <div className="text-xs font-medium mt-0.5">{stat.label}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {stat.sub}
            </div>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent Point Transactions</h2>
          <button
            onClick={() => onNav("points")}
            className="text-sm text-[var(--gold-mid)]"
          >
            View history →
          </button>
        </div>
        {transactions
          .filter((t) => t.userId === CURRENT_USER.id)
          .slice(0, 3)
          .map((t) => (
            <div
              key={t.id}
              className="flex justify-between border-t border-[var(--border)] py-2 text-sm"
            >
              <span>{t.reason}</span>
              <span
                className={t.points >= 0 ? "text-green-400" : "text-red-400"}
              >
                {t.points > 0 ? "+" : ""}
                {t.points} pts
              </span>
            </div>
          ))}
      </section>
      {/* Featured products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">
            Featured Products
          </h2>
          <button
            onClick={() => onNav("products")}
            className="text-sm text-[var(--gold-mid)] hover:underline"
          >
            View all →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {featured.map((p) => (
            <div
              key={p.id}
              className="bg-[var(--card)] rounded-xl overflow-hidden border border-[var(--border)] card-glow transition-all group"
            >
              <div className="relative overflow-hidden bg-[var(--secondary)] h-36">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {p.bonusMultiplier > 1 && (
                  <span className="absolute top-2 right-2 text-xs bg-[var(--gold-mid)] text-[var(--background)] font-bold px-1.5 py-0.5 rounded-full">
                    {p.bonusMultiplier}× pts
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-medium leading-snug">{p.name}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {p.nameKh}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-[var(--gold-mid)]">
                    {money(p.price)}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    +{p.normalPoints} pts
                  </span>
                </div>
                <button
                  onClick={() => onAddToCart(p.id)}
                  className="w-full mt-2 py-1.5 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-xs font-semibold hover:bg-[var(--gold-light)] transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier benefits banner */}
      <div className="rounded-xl p-5 bg-[var(--card)] border border-[var(--border)]">
        <h3 className="font-display text-base font-semibold mb-3">
          Your {tier} Benefits
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {tier === "Silver" &&
            [
              { icon: "⭐", text: "1× points on all purchases" },
              { icon: "🎁", text: "Basic reward catalog access" },
              { icon: "🛒", text: "Standard checkout perks" },
            ].map((b) => (
              <div
                key={b.text}
                className="flex items-center gap-2 text-[var(--muted-foreground)]"
              >
                <span>{b.icon}</span>
                {b.text}
              </div>
            ))}
          {tier === "Gold" &&
            [
              { icon: "⭐", text: "1.5× points on all purchases" },
              { icon: "🎁", text: "Gold reward catalog access" },
              { icon: "🏷", text: "Gold-exclusive promotions" },
            ].map((b) => (
              <div
                key={b.text}
                className="flex items-center gap-2 text-[var(--muted-foreground)]"
              >
                <span>{b.icon}</span>
                {b.text}
              </div>
            ))}
          {tier === "Platinum" &&
            [
              { icon: "⭐", text: "2× points on all purchases" },
              { icon: "💎", text: "Platinum-exclusive rewards" },
              { icon: "🚀", text: "Priority support & promotions" },
            ].map((b) => (
              <div
                key={b.text}
                className="flex items-center gap-2 text-[var(--muted-foreground)]"
              >
                <span>{b.icon}</span>
                {b.text}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
