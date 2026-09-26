import { useShop } from "../../data/shop";
import { TierBadge } from "../../components/TierBadge";
import { type Tier } from "../../data/mockData";

export function TierPage() {
  const { currentUser, tiers, qualifyingPoints, tierOverrides, tierHistory } =
    useShop();
  const progress = qualifyingPoints[currentUser.id] ?? currentUser.points;
  const names: Tier[] = ["Silver", "Gold", "Platinum"];
  const next =
    currentUser.tier === "Silver"
      ? "Gold"
      : currentUser.tier === "Gold"
        ? "Platinum"
        : null;
  const percent = next
    ? Math.min(100, Math.max(0, (progress / tiers[next].min) * 100))
    : 100;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Tier</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Membership benefits and progress
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center gap-3">
          <TierBadge tier={currentUser.tier} size="lg" />
          <span className="text-sm">
            {tiers[currentUser.tier].multiplier}× points on purchases
          </span>
        </div>
        <p className="mt-4 text-sm">
          {progress.toLocaleString()} qualifying points
        </p>
        {next ? (
          <>
            <div className="mt-2 progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {Math.max(0, tiers[next].min - progress).toLocaleString()} more
              qualifying points to {next}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--gold-mid)]">
            You have reached the highest tier.
          </p>
        )}
        {tierOverrides[currentUser.id] && (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Your tier has an admin override.
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {names.map((t) => (
          <div
            key={t}
            className={`rounded-xl border bg-[var(--card)] p-5 ${t === currentUser.tier ? "border-[var(--gold-mid)]" : "border-[var(--border)]"}`}
          >
            <TierBadge tier={t} size="md" />
            <p className="mt-4 text-sm">
              From {tiers[t].min.toLocaleString()} qualifying points
            </p>
            <p className="mt-2 text-sm text-[var(--gold-mid)]">
              {tiers[t].multiplier}× purchase points
            </p>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {t} rewards and promotions
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        Qualifying points are earned from completed orders. Redeeming rewards
        changes your available balance but keeps your tier progress.
      </p>
      <section className="space-y-2">
        <h2 className="font-semibold">Tier History</h2>
        {tierHistory
          .filter((change) => change.userId === currentUser.id)
          .map((change) => (
            <div
              key={change.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
            >
              {change.from} → {change.to} · {change.createdAt}
              <p className="text-xs text-[var(--muted-foreground)]">
                {change.reason}
              </p>
            </div>
          ))}
      </section>
    </div>
  );
}
