import type { Tier } from "../data/mockData";

const icons: Record<Tier, string> = {
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
};
const labels: Record<Tier, string> = {
  Silver: "Silver",
  Gold: "Gold",
  Platinum: "Platinum",
};

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: Tier;
  size?: "sm" | "md" | "lg";
}) {
  const pad =
    size === "lg"
      ? "px-4 py-1.5 text-sm"
      : size === "md"
        ? "px-3 py-1 text-xs"
        : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold tier-badge-${tier.toLowerCase()} ${pad}`}
    >
      {icons[tier]} {labels[tier]}
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
