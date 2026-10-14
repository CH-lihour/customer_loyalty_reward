import { useState } from "react";
import { useShop } from "../../data/shop";
import { TierBadge } from "../../components/TierBadge";
import { useFeedback } from "../../components/FeedbackProvider";
import { ImagePreviewDialog } from "../../components/ImagePreviewDialog";
import { useModalState } from "../../components/useModalState";
import { openRedemptionStatuses, variantIds, variantLabel, type Redemption } from "../../data/stock";
import type { Reward } from "../../data/mockData";

const statusLabels: Record<Redemption["status"], { text: string; tone: string }> = {
  RESERVED: { text: "Reserved for you", tone: "bg-purple-400/10 text-purple-300" },
  BACKORDERED: { text: "Backordered", tone: "bg-amber-400/10 text-amber-300" },
  FULFILLED: { text: "Delivered", tone: "bg-green-400/10 text-green-400" },
  CANCELLED: { text: "Cancelled · refunded", tone: "bg-[var(--secondary)] text-[var(--muted-foreground)]" },
  EXPIRED: { text: "Expired · refunded", tone: "bg-orange-400/10 text-orange-400" },
  RETURNED: { text: "Returned", tone: "bg-cyan-400/10 text-cyan-400" },
};

export function RewardsPage() {
  const shop = useShop();
  const { notify, confirm } = useFeedback();
  const [filter, setFilter] = useState<"available" | "all">("available");
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [previewId, setPreviewId, previewClosing] = useModalState<string | null>(null);
  const previewReward = shop.rewards.find((reward) => reward.id === previewId);
  const today = new Date().toISOString().slice(0, 10);
  const user = shop.currentUser;

  const variantOf = (r: Reward) => variants[r.id] ?? variantIds(shop.stockItemFor(r.id))[0];
  const alreadyRedeemed = (id: string) =>
    shop.redemptions.some((r) => r.userId === user.id && r.rewardId === id && openRedemptionStatuses.includes(r.status));
  const state = (r: Reward, variantId = variantOf(r)) => {
    const item = shop.stockItemFor(r.id);
    const available = shop.availableFor(r.id, variantId);
    const stocked = available > 0 || item.allowBackorder;
    const tierOk = shop.tiers[user.tier].min >= shop.tiers[r.minTier].min;
    const blocker = alreadyRedeemed(r.id) ? "Already Redeemed"
      : !tierOk ? `Requires ${r.minTier}`
        : user.points < r.pointsCost ? "Insufficient Points"
          : !stocked ? "Out of Stock" : null;
    return { item, variantId, available, eligible: !blocker, blocker, backorder: available < 1 };
  };
  // Out-of-stock rewards set to "hide" leave the storefront entirely, unless backorders are allowed.
  const visible = shop.rewards.filter((r) => {
    if (!r.active || (r.expiresAt && r.expiresAt < today)) return false;
    const item = shop.stockItemFor(r.id);
    return !(item.outOfStock === "hide" && !item.allowBackorder && shop.availableFor(r.id) < 1);
  });
  // A reward stays listed while any of its options can be redeemed, so picking a sold-out option doesn't hide the card.
  const displayed = visible.filter((r) => filter === "all" || variantIds(shop.stockItemFor(r.id)).some((v) => state(r, v).eligible));
  const history = shop.redemptions.filter((r) => r.userId === user.id);
  const myRequests = shop.restockRequests.filter((r) => r.userId === user.id);
  const backInStock = myRequests.filter((r) => r.notifiedAt);

  const redeem = (r: Reward) => {
    const { variantId, backorder, item } = state(r);
    const option = item.variants.length ? ` (${variantLabel(item, variantId)})` : "";
    void confirm(backorder
      ? `Backorder ${r.name}${option} for ${r.pointsCost} points? Points are deducted now and the reward is reserved for you as soon as stock arrives.`
      : `Redeem ${r.name}${option} for ${r.pointsCost} points? It will be held for you for ${shop.stockSettings.reservationHours} hours while we prepare it.`,
    ).then((ok) => {
      if (!ok) return;
      const error = shop.redeem(r.id, variantId);
      notify(error ?? (backorder ? `${r.name} backordered. We'll reserve it when stock arrives.` : `Redeemed ${r.name}. It's reserved for you.`), error ? "error" : "success");
    });
  };
  const notifyMe = (r: Reward) => {
    const error = shop.requestRestock(r.id, variantOf(r));
    notify(error ?? `We'll let you know when ${r.name} is back in stock.`, error ? "info" : "success");
  };
  const cancel = (r: Redemption) => {
    void confirm(`Cancel ${r.rewardName}? Your ${r.points} points will be refunded.`).then((ok) => {
      if (!ok) return;
      const error = shop.cancelMyRedemption(r.id);
      notify(error ?? `Cancelled. ${r.points} points refunded.`, error ? "error" : "success");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Rewards Catalog</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            You have{" "}
            <strong className="text-[var(--gold-mid)]">{user.points.toLocaleString()} points</strong>{" "}
            · <TierBadge tier={user.tier} />
          </p>
        </div>
        <div className="flex gap-2">
          {(["available", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs ${filter === f ? "bg-[var(--gold-mid)] text-[var(--background)]" : "bg-[var(--card)] border border-[var(--border)]"}`}>
              {f === "available" ? "Can Redeem" : "All Rewards"}
            </button>
          ))}
        </div>
      </div>

      {backInStock.map((request) => {
        const reward = shop.rewards.find((r) => r.id === request.rewardId);
        if (!reward) return null;
        return (
          <div key={request.id} role="status" className="flex items-center justify-between gap-3 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm">
            <span><strong>{reward.name}</strong> is back in stock{request.variantId ? ` (${variantLabel(shop.stockItemFor(reward.id), request.variantId)})` : ""}. Redeem it before it runs out.</span>
            <button type="button" onClick={() => shop.dismissRestock(request.id)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Dismiss</button>
          </div>
        );
      })}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((r) => {
          const { item, variantId, available, eligible, blocker, backorder } = state(r);
          const waiting = myRequests.some((x) => x.rewardId === r.id && x.variantId === variantId && !x.notifiedAt);
          return (
            <div key={r.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="relative h-32">
                <button type="button" onClick={() => setPreviewId(r.id)} aria-label={`Inspect image of ${r.name}`} className="h-full w-full cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-mid)]">
                  <img src={r.image} alt={r.name} className={`h-full w-full object-cover ${available < 1 ? "opacity-50 grayscale" : ""}`} />
                </button>
                <div className="pointer-events-none absolute left-2 top-2"><TierBadge tier={r.minTier} /></div>
              </div>
              <div className="space-y-2 p-4">
                <h2 className="font-semibold">{r.name}</h2>
                <p className="text-xs text-[var(--muted-foreground)]">{r.nameKh}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{r.description}</p>
                {item.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${r.name} options`}>
                    {item.variants.map((v) => {
                      const left = shop.availableFor(r.id, v.id);
                      const selected = v.id === variantId;
                      return (
                        <button key={v.id} type="button" role="radio" aria-checked={selected} onClick={() => setVariants((m) => ({ ...m, [r.id]: v.id }))}
                          className={`rounded-lg border px-2 py-1 text-xs ${selected ? "border-[var(--gold-mid)] text-[var(--gold-mid)]" : "border-[var(--border)]"} ${left < 1 ? "line-through opacity-60" : ""}`}>
                          {variantLabel(item, v.id)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <strong className="text-[var(--gold-mid)]">{r.pointsCost} pts</strong>
                  <span className={available < 1 ? "text-red-400" : available <= item.lowStockThreshold ? "text-orange-400" : ""}>
                    {available > 0 ? (available <= item.lowStockThreshold ? `Only ${available} left` : `${available} left`) : item.allowBackorder ? "Backorder only" : "Out of stock"}
                  </span>
                </div>
                <button disabled={!eligible} onClick={() => redeem(r)}
                  className="w-full rounded-lg bg-[var(--gold-mid)] py-2 font-semibold text-[var(--background)] disabled:bg-[var(--secondary)] disabled:text-[var(--muted-foreground)]">
                  {eligible ? (backorder ? "Backorder →" : "Redeem →") : blocker}
                </button>
                {available < 1 && !item.allowBackorder && !alreadyRedeemed(r.id) && (
                  <button type="button" disabled={waiting} onClick={() => notifyMe(r)}
                    className="w-full rounded-lg border border-[var(--border)] py-1.5 text-xs text-[var(--gold-mid)] disabled:text-[var(--muted-foreground)]">
                    {waiting ? "We'll notify you when it's back" : "Notify me when back in stock"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!displayed.length && <p className="py-12 text-center text-[var(--muted-foreground)]">No rewards available for this filter.</p>}

      <section className="space-y-3">
        <h2 className="font-semibold">My Redemption History</h2>
        {history.length ? history.map((r) => {
          const status = statusLabels[r.status];
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
              <span>
                {r.rewardName}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {r.createdAt}
                  {r.status === "RESERVED" && r.reservedUntil && ` · held until ${new Date(r.reservedUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.text}</span>
                {(r.status === "RESERVED" || r.status === "BACKORDERED") && (
                  <button type="button" onClick={() => cancel(r)} className="text-xs text-red-400 hover:underline">Cancel</button>
                )}
                <span className={r.status === "CANCELLED" || r.status === "EXPIRED" ? "text-[var(--muted-foreground)] line-through" : "text-red-400"}>−{r.points} pts</span>
              </span>
            </div>
          );
        }) : <p className="text-sm text-[var(--muted-foreground)]">No redemptions yet.</p>}
      </section>
      {previewReward && <ImagePreviewDialog image={previewReward.image} name={previewReward.name} onClose={() => setPreviewId(null)} closing={previewClosing} />}
    </div>
  );
}
