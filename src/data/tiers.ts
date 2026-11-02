import type { Tier } from "./mockData";
import type { TierRule } from "./shop";

/** Every tier's rule, keyed by tier name. */
export type TierTable = Record<Tier, TierRule>;

/** Used only when no tiers are set up at all. */
const fallbackRule: TierRule = { min: 0, max: Infinity, multiplier: 1, color: "#94a3b8" };

/** Tier names from the entry tier upwards. */
export const tierOrder = (tiers: TierTable): Tier[] =>
  Object.keys(tiers).sort((a, b) => tiers[a].min - tiers[b].min || a.localeCompare(b));

/** The highest tier whose minimum the points reach, or the entry tier when they reach none. */
export function tierFor(points: number, tiers: TierTable): Tier {
  const order = tierOrder(tiers);
  return order.filter((tier) => tiers[tier].min <= points).pop() ?? order[0] ?? "";
}

/** The tier's rule. A name no longer in use (renamed or deleted) falls back to the entry tier's rule. */
export const tierRule = (tiers: TierTable, tier: Tier): TierRule =>
  tiers[tier] ?? tiers[tierOrder(tiers)[0]] ?? fallbackRule;

/** The tier above this one, or null at the top. */
export function nextTier(tier: Tier, tiers: TierTable): Tier | null {
  const order = tierOrder(tiers);
  const index = order.indexOf(tier);
  return index >= 0 && index < order.length - 1 ? order[index + 1] : null;
}

/** Whether the tier sits at or above `required`, as rewards check their minimum tier. */
export const meetsTier = (tiers: TierTable, tier: Tier, required: Tier) =>
  tierRule(tiers, tier).min >= tierRule(tiers, required).min;
