import { useState } from "react";
import { useShop } from "../../data/shop";
import { TierBadge } from "../../components/TierBadge";
import { useFeedback } from "../../components/FeedbackProvider";

export function RewardsPage() {
  const shop = useShop();
  const { notify, confirm } = useFeedback();
  const [filter, setFilter] = useState<"available" | "all">("available");
  const eligible = (id: string) => {
    const reward = shop.rewards.find((r) => r.id === id)!;
    return (
      reward.active &&
      (!reward.expiresAt ||
        reward.expiresAt >= new Date().toISOString().slice(0, 10)) &&
      reward.stock > 0 &&
      reward.pointsCost <= shop.currentUser.points &&
      shop.tiers[shop.currentUser.tier].min >= shop.tiers[reward.minTier].min &&
      !shop.redemptions.some(
        (r) => r.userId === shop.currentUser.id && r.rewardId === id,
      )
    );
  };
  const displayed = shop.rewards.filter(
    (r) =>
      r.active &&
      (!r.expiresAt || r.expiresAt >= new Date().toISOString().slice(0, 10)) &&
      (filter === "all" || eligible(r.id)),
  );
  const history = shop.redemptions.filter(
    (r) => r.userId === shop.currentUser.id,
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Rewards Catalog
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            You have{" "}
            <strong className="text-[var(--gold-mid)]">
              {shop.currentUser.points.toLocaleString()} points
            </strong>{" "}
            · <TierBadge tier={shop.currentUser.tier} />
          </p>
        </div>
        <div className="flex gap-2">
          {(["available", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs ${filter === f ? "bg-[var(--gold-mid)] text-[var(--background)]" : "bg-[var(--card)] border border-[var(--border)]"}`}
            >
              {f === "available" ? "Can Redeem" : "All Rewards"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((r) => (
          <div
            key={r.id}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
          >
            <div className="relative h-32">
              <img
                src={r.image}
                alt={r.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-2 top-2">
                <TierBadge tier={r.minTier} />
              </div>
            </div>
            <div className="space-y-2 p-4">
              <h2 className="font-semibold">{r.name}</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {r.nameKh}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {r.description}
              </p>
              <div className="flex justify-between text-sm">
                <strong className="text-[var(--gold-mid)]">
                  {r.pointsCost} pts
                </strong>
                <span>{r.stock} left</span>
              </div>
              <button
                disabled={!eligible(r.id)}
                onClick={() => {
                  void confirm(
                    `Redeem ${r.name} for ${r.pointsCost} points?`,
                  ).then((ok) => {
                    if (!ok) return;
                    const error = shop.redeem(r.id);
                    notify(
                      error ?? `Redeemed ${r.name}. Check your history below.`,
                      error ? "error" : "success",
                    );
                  });
                }}
                className="w-full rounded-lg bg-[var(--gold-mid)] py-2 font-semibold text-[var(--background)] disabled:bg-[var(--secondary)] disabled:text-[var(--muted-foreground)]"
              >
                {eligible(r.id)
                  ? "Redeem →"
                  : r.stock < 1
                    ? "Out of Stock"
                    : shop.redemptions.some(
                          (item) =>
                            item.userId === shop.currentUser.id &&
                            item.rewardId === r.id,
                        )
                      ? "Already Redeemed"
                      : shop.tiers[shop.currentUser.tier].min <
                          shop.tiers[r.minTier].min
                        ? `Requires ${r.minTier}`
                        : "Insufficient Points"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {!displayed.length && (
        <p className="py-12 text-center text-[var(--muted-foreground)]">
          No rewards available for this filter.
        </p>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">My Redemption History</h2>
        {history.length ? (
          history.map((r) => (
            <div
              key={r.id}
              className="flex justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
            >
              <span>
                {r.rewardName}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {r.createdAt}
                </span>
              </span>
              <span className="text-red-400">−{r.points} pts</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No redemptions yet.
          </p>
        )}
      </section>
    </div>
  );
}
