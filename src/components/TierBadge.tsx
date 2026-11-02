import type { Tier } from "../data/mockData";
import { useShop } from "../data/shop";
import { nextTier, tierRule } from "../data/tiers";
import { Icon } from "./Icon";

export function TierBadge({
  tier,
  size = "sm",
  color,
}: {
  tier: Tier;
  size?: "sm" | "md" | "lg";
  /** Overrides the tier's stored color, e.g. to preview an unsaved edit. */
  color?: string;
}) {
  const { tiers } = useShop();
  const tint = color ?? tierRule(tiers, tier).color;
  const pad =
    size === "lg"
      ? "px-4 py-1.5 text-sm"
      : size === "md"
        ? "px-3 py-1 text-xs"
        : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold text-[var(--foreground)] ${pad}`}
      style={{ backgroundColor: `${tint}33`, borderColor: `${tint}99` }}
    >
      <span className="inline-flex" style={{ color: tint }}>
        <Icon
          name={tiers[tier] && !nextTier(tier, tiers) ? "gem" : "medal"}
          className="h-3.5 w-3.5"
        />
      </span>{" "}
      {tier}
    </span>
  );
}

export function PointsBadge({ points }: { points: number }) {
  return (
    <span className="font-mono-data text-sm font-semibold text-[var(--gold-mid)]">
      {points.toLocaleString()} pts
    </span>
  );
}
