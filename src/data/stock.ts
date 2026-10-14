import type { Customer, LoyaltyTransaction, Reward } from "./mockData";

/** Super Admin is always "admin"; other staff roles are assigned clerk or manager. */
export type StockAuthority = "clerk" | "manager" | "admin";
export const stockAuthorityRank: Record<StockAuthority, number> = { clerk: 1, manager: 2, admin: 3 };
export const stockAuthorityLabels: Record<StockAuthority, string> = {
  clerk: "Stock clerk",
  manager: "Stock manager",
  admin: "Stock admin",
};

export type StockLocation = {
  id: string;
  name: string;
  nameKh: string;
  type: "warehouse" | "store" | "pickup";
  active: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  kind: "supplier" | "partner";
  contact: string;
  phone: string;
  email: string;
  active: boolean;
};

export type Tracking = "none" | "batch" | "serial";
export type RewardVariant = { id: string; size: string; color: string; sku: string };

/** Stock settings for a reward. Live quantities are never stored here; they come from the ledger. */
export type StockItem = {
  rewardId: string;
  sku: string;
  unitCost: number;
  supplierId: string;
  tracking: Tracking;
  variants: RewardVariant[];
  lowStockThreshold: number;
  reorderPoint: number;
  reorderQty: number;
  outOfStock: "hide" | "disable";
  allowBackorder: boolean;
};

export type StockMovementType =
  | "RECEIVE" | "RESERVE" | "RELEASE" | "FULFILL" | "RETURN" | "ADJUST"
  | "TRANSFER_OUT" | "TRANSFER_IN" | "DAMAGE" | "LOSS" | "EXPIRY" | "COUNT";

/** One append-only ledger row. `onHand` and `reserved` are signed deltas. */
export type StockMovement = {
  id: string;
  createdAt: string;
  type: StockMovementType;
  rewardId: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  batch?: string;
  expiresAt?: string;
  serials?: string[];
  unitCost: number;
  supplierId?: string;
  source?: "PURCHASE" | "DONATION";
  reference?: string;
  reason?: string;
  actorId: string;
  actorName: string;
};

export type RedemptionStatus = "RESERVED" | "BACKORDERED" | "FULFILLED" | "CANCELLED" | "EXPIRED" | "RETURNED";
export const openRedemptionStatuses: RedemptionStatus[] = ["RESERVED", "BACKORDERED", "FULFILLED"];

export type Redemption = {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  points: number;
  createdAt: string;
  status: RedemptionStatus;
  variantId: string;
  locationId?: string;
  reservedAt?: string;
  reservedUntil?: string;
  fulfilledAt?: string;
  fulfillment?: "SHIPPED" | "PICKED_UP";
  batch?: string;
  serial?: string;
  closedAt?: string;
  closeReason?: string;
  /** Redeemed before the stock ledger existed; excluded from reconciliation. */
  legacy?: boolean;
};

export type RestockRequest = {
  id: string;
  userId: string;
  rewardId: string;
  variantId: string;
  createdAt: string;
  notifiedAt?: string;
};

export type StocktakeLine = {
  rewardId: string;
  variantId: string;
  batch: string;
  serial?: string;
  expected: number;
  counted: number | null;
  systemAtPost?: number;
};

export type Stocktake = {
  id: string;
  locationId: string;
  category: string;
  status: "OPEN" | "POSTED" | "CANCELLED";
  note: string;
  createdAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
  lines: StocktakeLine[];
};

export type StockSettings = { reservationHours: number };

export const movementLabels: Record<StockMovementType, string> = {
  RECEIVE: "Receive",
  RESERVE: "Reserve",
  RELEASE: "Release",
  FULFILL: "Fulfil",
  RETURN: "Return",
  ADJUST: "Adjustment",
  TRANSFER_OUT: "Transfer out",
  TRANSFER_IN: "Transfer in",
  DAMAGE: "Damage write-off",
  LOSS: "Loss write-off",
  EXPIRY: "Expiry write-off",
  COUNT: "Stocktake variance",
};

export const todayDate = () => new Date().toISOString().slice(0, 10);

export const defaultStockItem = (reward: Pick<Reward, "id">): StockItem => ({
  rewardId: reward.id,
  sku: `RW-${reward.id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-8)}`,
  unitCost: 0,
  supplierId: "",
  tracking: "none",
  variants: [],
  lowStockThreshold: 5,
  reorderPoint: 10,
  reorderQty: 25,
  outOfStock: "disable",
  allowBackorder: false,
});

export const variantLabel = (item: StockItem | undefined, variantId: string) => {
  const variant = item?.variants.find((v) => v.id === variantId);
  if (!variant) return variantId ? "Unknown variant" : "Standard";
  return [variant.size, variant.color].filter(Boolean).join(" / ") || variant.sku || "Variant";
};

/** Every variant id that can hold stock for an item; "" when the item has no variants. */
export const variantIds = (item: StockItem) => (item.variants.length ? item.variants.map((v) => v.id) : [""]);

export type BatchLevel = { batch: string; onHand: number; expiresAt?: string };
export type StockLevel = {
  key: string;
  rewardId: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  expired: number;
  available: number;
  batches: BatchLevel[];
  serials: string[];
};

export const levelKey = (rewardId: string, variantId: string, locationId: string) =>
  `${rewardId}|${variantId}|${locationId}`;

/** Batch expiry dates, keyed by `${rewardId}|${batch}`. The first receipt of a batch sets its expiry. */
export function batchExpiries(movements: StockMovement[]) {
  const expiries = new Map<string, string>();
  for (let i = movements.length - 1; i >= 0; i--) {
    const m = movements[i];
    if (m.batch && m.expiresAt && !expiries.has(`${m.rewardId}|${m.batch}`))
      expiries.set(`${m.rewardId}|${m.batch}`, m.expiresAt);
  }
  return expiries;
}

const byExpiry = (a: BatchLevel, b: BatchLevel) =>
  (a.expiresAt ?? "9999-12-31").localeCompare(b.expiresAt ?? "9999-12-31") || a.batch.localeCompare(b.batch);

/** Replays the ledger (stored newest first) into per reward/variant/location levels. */
export function computeLevels(movements: StockMovement[], today = todayDate()): StockLevel[] {
  const expiries = batchExpiries(movements);
  const levels = new Map<string, { level: StockLevel; batches: Map<string, number>; serials: Set<string> }>();
  for (let i = movements.length - 1; i >= 0; i--) {
    const m = movements[i];
    const key = levelKey(m.rewardId, m.variantId, m.locationId);
    let entry = levels.get(key);
    if (!entry) {
      entry = {
        level: { key, rewardId: m.rewardId, variantId: m.variantId, locationId: m.locationId, onHand: 0, reserved: 0, expired: 0, available: 0, batches: [], serials: [] },
        batches: new Map(),
        serials: new Set(),
      };
      levels.set(key, entry);
    }
    entry.level.onHand += m.onHand;
    entry.level.reserved += m.reserved;
    if (m.onHand && m.batch) entry.batches.set(m.batch, (entry.batches.get(m.batch) ?? 0) + m.onHand);
    for (const serial of m.serials ?? []) {
      if (m.onHand > 0) entry.serials.add(serial);
      else if (m.onHand < 0) entry.serials.delete(serial);
    }
  }
  return [...levels.values()].map(({ level, batches, serials }) => {
    const batchLevels = [...batches]
      .filter(([, qty]) => qty !== 0)
      .map(([batch, onHand]) => ({ batch, onHand, expiresAt: expiries.get(`${level.rewardId}|${batch}`) }))
      .sort(byExpiry);
    const expired = batchLevels
      .filter((b) => b.expiresAt && b.expiresAt < today)
      .reduce((sum, b) => sum + b.onHand, 0);
    return {
      ...level,
      batches: batchLevels,
      serials: [...serials].sort(),
      expired,
      available: Math.max(0, level.onHand - expired - level.reserved),
    };
  });
}

export type StockTotals = { onHand: number; reserved: number; expired: number; available: number };
export function totalsFor(
  levels: StockLevel[],
  filter: { rewardId?: string; variantId?: string; locationId?: string; locationIds?: string[] },
): StockTotals {
  const totals = { onHand: 0, reserved: 0, expired: 0, available: 0 };
  for (const l of levels) {
    if (filter.rewardId !== undefined && l.rewardId !== filter.rewardId) continue;
    if (filter.variantId !== undefined && l.variantId !== filter.variantId) continue;
    if (filter.locationId !== undefined && l.locationId !== filter.locationId) continue;
    if (filter.locationIds && !filter.locationIds.includes(l.locationId)) continue;
    totals.onHand += l.onHand;
    totals.reserved += l.reserved;
    totals.expired += l.expired;
    totals.available += l.available;
  }
  return totals;
}

export type StockStatus = "out" | "low" | "reorder" | "ok";
export const stockStatusLabels: Record<StockStatus, string> = {
  out: "Out of stock",
  low: "Low stock",
  reorder: "Reorder",
  ok: "In stock",
};
export function stockStatus(item: StockItem, available: number): StockStatus {
  if (available <= 0) return "out";
  if (available <= item.lowStockThreshold) return "low";
  if (available <= item.reorderPoint) return "reorder";
  return "ok";
}

/** Order-up-to policy: refill to reorder point + reorder qty, plus any backorders waiting. */
export function suggestedReorder(item: StockItem, available: number, backordered: number) {
  if (available > item.reorderPoint && !backordered) return 0;
  return Math.max(item.reorderQty, item.reorderPoint + item.reorderQty - available + backordered);
}

/**
 * Chooses batches first-expiry-first-out. `mode` "usable" skips expired batches,
 * "expired" uses only expired batches. Returns null when there is not enough.
 */
export function pickBatches(
  batches: BatchLevel[],
  qty: number,
  mode: "usable" | "expired" | "any",
  today = todayDate(),
): { batch: string; qty: number }[] | null {
  const picks: { batch: string; qty: number }[] = [];
  let remaining = qty;
  for (const b of batches) {
    const isExpired = !!b.expiresAt && b.expiresAt < today;
    if ((mode === "usable" && isExpired) || (mode === "expired" && !isExpired) || b.onHand <= 0) continue;
    const take = Math.min(b.onHand, remaining);
    picks.push({ batch: b.batch, qty: take });
    remaining -= take;
    if (!remaining) return picks;
  }
  return null;
}

/* ---------- Seed data ---------- */

export const initialLocations: StockLocation[] = [
  { id: "loc-pp", name: "Phnom Penh Central Warehouse", nameKh: "ឃ្លាំងកណ្ដាលភ្នំពេញ", type: "warehouse", active: true },
  { id: "loc-sr", name: "Siem Reap Store", nameKh: "ហាងសៀមរាប", type: "store", active: true },
  { id: "loc-btb", name: "Battambang Pickup Point", nameKh: "ចំណុចទទួលបាត់ដំបង", type: "pickup", active: true },
];

export const initialSuppliers: Supplier[] = [
  { id: "sup-print", name: "Mekong Print & Voucher", kind: "supplier", contact: "Rotha Prak", phone: "+855 23 880 120", email: "orders@mekongprint.example", active: true },
  { id: "sup-kampot", name: "Kampot Pepper Coffee Co.", kind: "supplier", contact: "Sreypov Nhem", phone: "+855 33 932 410", email: "sales@kampotcoffee.example", active: true },
  { id: "sup-snack", name: "Phsar Thmei Snack Traders", kind: "supplier", contact: "Heng Lay", phone: "+855 12 448 902", email: "heng@snacktraders.example", active: true },
  { id: "sup-krama", name: "Takeo Silk Weavers Cooperative", kind: "partner", contact: "Chenda Ouk", phone: "+855 32 210 755", email: "hello@takeosilk.example", active: true },
];

const voucher = (rewardId: string, sku: string): StockItem => ({
  ...defaultStockItem({ id: rewardId }),
  sku,
  unitCost: 0.1,
  supplierId: "sup-print",
  tracking: "batch",
  lowStockThreshold: 50,
  reorderPoint: 120,
  reorderQty: 500,
});

export const initialStockItems: Record<string, StockItem> = {
  r1: voucher("r1", "VCH-002"),
  r2: voucher("r2", "VCH-005"),
  r3: { ...defaultStockItem({ id: "r3" }), sku: "FP-KPC-250", unitCost: 4.5, supplierId: "sup-kampot", tracking: "batch", lowStockThreshold: 8, reorderPoint: 15, reorderQty: 40 },
  r4: voucher("r4", "VCH-SHIP"),
  r5: { ...defaultStockItem({ id: "r5" }), sku: "FP-SNK-BOX", unitCost: 6, supplierId: "sup-snack", tracking: "batch", lowStockThreshold: 5, reorderPoint: 10, reorderQty: 30, outOfStock: "hide" },
  r6: { ...voucher("r6", "VCH-015"), lowStockThreshold: 10, reorderPoint: 25, reorderQty: 100 },
  r7: {
    ...defaultStockItem({ id: "r7" }),
    sku: "GF-KRAMA",
    unitCost: 18,
    supplierId: "sup-krama",
    tracking: "serial",
    variants: [
      { id: "v-red", size: "Standard", color: "Red", sku: "GF-KRAMA-RED" },
      { id: "v-indigo", size: "Standard", color: "Indigo", sku: "GF-KRAMA-IND" },
      { id: "v-gold", size: "Standard", color: "Gold", sku: "GF-KRAMA-GLD" },
    ],
    lowStockThreshold: 2,
    reorderPoint: 4,
    reorderQty: 10,
    allowBackorder: true,
  },
  r8: {
    ...defaultStockItem({ id: "r8" }),
    sku: "GF-TASTE",
    unitCost: 9.5,
    supplierId: "sup-kampot",
    variants: [
      { id: "v-small", size: "Small", color: "", sku: "GF-TASTE-S" },
      { id: "v-large", size: "Large", color: "", sku: "GF-TASTE-L" },
    ],
    lowStockThreshold: 3,
    reorderPoint: 6,
    reorderQty: 12,
  },
};

const DAY = 86400000;
const isoAgo = (days: number, minute = 0) =>
  new Date(Date.now() - days * DAY + minute * 60000).toISOString();
const dateIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

export function buildStockSeed(rewards: Reward[], customers: Customer[], reservationHours: number) {
  const movements: StockMovement[] = [];
  let n = 0;
  const cost = (rewardId: string) => initialStockItems[rewardId]?.unitCost ?? 0;
  const add = (daysAgo: number, m: Omit<StockMovement, "id" | "createdAt" | "unitCost" | "actorId" | "actorName" | "reserved"> & Partial<Pick<StockMovement, "reserved" | "actorId" | "actorName">>) => {
    n += 1;
    movements.unshift({
      id: `sm-seed-${n}`,
      createdAt: isoAgo(daysAgo, n),
      unitCost: cost(m.rewardId),
      actorId: "admin-super",
      actorName: "Demo Admin",
      reserved: 0,
      ...m,
    });
  };
  const receive = (daysAgo: number, rewardId: string, locationId: string, qty: number, extra: Partial<StockMovement> = {}) =>
    add(daysAgo, { type: "RECEIVE", rewardId, variantId: "", locationId, onHand: qty, supplierId: initialStockItems[rewardId]?.supplierId, source: "PURCHASE", reason: "Opening balance", ...extra });
  const issue = (daysAgo: number, rewardId: string, locationId: string, qty: number, extra: Partial<StockMovement> = {}) =>
    add(daysAgo, { type: "FULFILL", rewardId, variantId: "", locationId, onHand: -qty, reference: `POS-${String(n + 1).padStart(4, "0")}`, reason: "In-store issue at POS counter", ...extra });

  // Opening balances, 75 days ago. Vouchers share one print run per reward.
  const voucherBatch = { batch: "VCH-2026Q3", expiresAt: dateIn(78) };
  for (const [id, qty] of [["r1", 999], ["r2", 500], ["r4", 999], ["r6", 100]] as const) {
    const store = Math.round(qty * 0.2);
    receive(75, id, "loc-pp", qty - store, voucherBatch);
    receive(75, id, "loc-sr", store, voucherBatch);
  }
  receive(75, "r3", "loc-pp", 30, { batch: "KPC-0726", expiresAt: dateIn(18) });
  receive(75, "r3", "loc-pp", 35, { batch: "KPC-0926", expiresAt: dateIn(190) });
  receive(75, "r5", "loc-sr", 4, { batch: "SNK-08", expiresAt: dateIn(-5) });
  receive(75, "r5", "loc-pp", 26, { batch: "SNK-09", expiresAt: dateIn(55) });
  for (const [variantId, code] of [["v-red", "R"], ["v-indigo", "I"], ["v-gold", "G"]] as const) {
    receive(75, "r7", "loc-pp", 3, { variantId, serials: [1, 2, 3].map((i) => `KR-${code}-00${i}`), source: "DONATION", reason: "Opening balance (partner donation)" });
    if (code !== "G") receive(75, "r7", "loc-sr", 2, { variantId, serials: [4, 5].map((i) => `KR-${code}-00${i}`), source: "DONATION", reason: "Opening balance (partner donation)" });
  }
  receive(75, "r8", "loc-pp", 12, { variantId: "v-small" });
  receive(75, "r8", "loc-pp", 8, { variantId: "v-large" });

  // Eight weeks of POS issues, so fast and slow movers have history.
  const weekly: [string, string, number, Partial<StockMovement>][] = [
    ["r1", "loc-pp", 6, { batch: "VCH-2026Q3" }],
    ["r4", "loc-pp", 8, { batch: "VCH-2026Q3" }],
    ["r2", "loc-sr", 2, { batch: "VCH-2026Q3" }],
    ["r3", "loc-pp", 1, { batch: "KPC-0726" }],
    ["r5", "loc-pp", 1, { batch: "SNK-09" }],
  ];
  for (let week = 8; week >= 1; week--) {
    for (const [rewardId, locationId, base, extra] of weekly)
      issue(week * 7, rewardId, locationId, base + (week % 3), extra);
  }
  for (const [days, locationId, qty] of [[40, "loc-pp", 30], [25, "loc-pp", 35], [9, "loc-pp", 10], [9, "loc-sr", 15]] as const)
    issue(days, "r6", locationId, qty, { batch: "VCH-2026Q3" });
  for (let i = 0; i < 7; i++) issue(50 - i * 6, "r8", "loc-pp", 1, { variantId: "v-large" });
  issue(33, "r7", "loc-pp", 1, { variantId: "v-gold", serials: ["KR-G-002"] });
  issue(21, "r7", "loc-pp", 1, { variantId: "v-gold", serials: ["KR-G-003"] });

  add(30, { type: "TRANSFER_OUT", rewardId: "r3", variantId: "", locationId: "loc-pp", onHand: -5, batch: "KPC-0926", reference: "TRF-SEED-1", reason: "Stock pickup point for Battambang customers" });
  add(30, { type: "TRANSFER_IN", rewardId: "r3", variantId: "", locationId: "loc-btb", onHand: 5, batch: "KPC-0926", reference: "TRF-SEED-1", reason: "Stock pickup point for Battambang customers" });
  add(26, { type: "DAMAGE", rewardId: "r8", variantId: "v-small", locationId: "loc-pp", onHand: -1, reason: "Box crushed in transit" });
  add(18, { type: "LOSS", rewardId: "r1", variantId: "", locationId: "loc-sr", onHand: -3, batch: "VCH-2026Q3", reason: "Voucher cards missing from counter drawer" });
  add(14, { type: "ADJUST", rewardId: "r5", variantId: "", locationId: "loc-pp", onHand: 2, batch: "SNK-09", reason: "Found two boxes during shelf check" });
  add(10, { type: "RECEIVE", rewardId: "r3", variantId: "", locationId: "loc-pp", onHand: 20, batch: "KPC-1026", expiresAt: dateIn(220), supplierId: "sup-kampot", source: "PURCHASE", reference: "PO-2026-118", reason: "Monthly coffee order" });
  add(6, { type: "RETURN", rewardId: "r8", variantId: "v-small", locationId: "loc-pp", onHand: 1, reason: "Unopened kit returned at counter" });

  // Online redemptions with matching ledger rows.
  const name = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const reward = (id: string) => rewards.find((r) => r.id === id);
  const redemptions: Redemption[] = [];
  const transactions: LoyaltyTransaction[] = [];
  const redemption = (
    id: string, userId: string, rewardId: string, daysAgo: number, balanceAfter: number,
    rest: Partial<Redemption> & Pick<Redemption, "status">,
  ) => {
    const r = reward(rewardId);
    if (!r) return;
    const reservedAt = isoAgo(daysAgo);
    redemptions.push({
      id, userId, rewardId, rewardName: r.name, points: r.pointsCost,
      createdAt: reservedAt.slice(0, 10), variantId: "", reservedAt,
      reservedUntil: new Date(new Date(reservedAt).getTime() + reservationHours * 3600000).toISOString(),
      ...rest,
    });
    transactions.push({
      id: `lt-${id}`, userId, userName: name(userId), type: "SPEND", points: -r.pointsCost,
      balanceBefore: balanceAfter + r.pointsCost, balanceAfter, reason: `Redeemed: ${r.name}`, createdAt: reservedAt.slice(0, 10),
    });
  };
  const reserve = (daysAgo: number, id: string, rewardId: string, variantId: string, locationId: string) =>
    add(daysAgo, { type: "RESERVE", rewardId, variantId, locationId, onHand: 0, reserved: 1, reference: id, reason: "Online redemption", actorId: "system", actorName: "System" });
  const fulfil = (daysAgo: number, id: string, rewardId: string, variantId: string, locationId: string, extra: Partial<StockMovement>) =>
    add(daysAgo, { type: "FULFILL", rewardId, variantId, locationId, onHand: -1, reserved: -1, reference: id, reason: "Redemption fulfilled", ...extra });

  reserve(20, "red-seed-1", "r3", "", "loc-pp");
  fulfil(19, "red-seed-1", "r3", "", "loc-pp", { batch: "KPC-0726" });
  redemption("red-seed-1", "u2", "r3", 20, 9000, { status: "FULFILLED", locationId: "loc-pp", fulfilledAt: isoAgo(19), fulfillment: "SHIPPED", batch: "KPC-0726" });

  reserve(12, "red-seed-2", "r7", "v-gold", "loc-pp");
  fulfil(11, "red-seed-2", "r7", "v-gold", "loc-pp", { serials: ["KR-G-001"] });
  redemption("red-seed-2", "u5", "r7", 12, 12400, { status: "FULFILLED", variantId: "v-gold", locationId: "loc-pp", fulfilledAt: isoAgo(11), fulfillment: "SHIPPED", serial: "KR-G-001" });

  reserve(5, "red-seed-3", "r1", "", "loc-sr");
  fulfil(4, "red-seed-3", "r1", "", "loc-sr", { batch: "VCH-2026Q3" });
  redemption("red-seed-3", "u4", "r1", 5, 3100, { status: "FULFILLED", locationId: "loc-sr", fulfilledAt: isoAgo(4), fulfillment: "PICKED_UP", batch: "VCH-2026Q3" });

  reserve(1, "red-seed-4", "r8", "v-large", "loc-pp");
  redemption("red-seed-4", "u7", "r8", 1, 4200, { status: "RESERVED", variantId: "v-large", locationId: "loc-pp" });

  const nearExpiry = (reservationHours - 6) / 24;
  reserve(nearExpiry, "red-seed-5", "r5", "", "loc-pp");
  redemption("red-seed-5", "u2", "r5", nearExpiry, 8200, { status: "RESERVED", locationId: "loc-pp" });

  redemption("red-seed-6", "u18", "r7", 2, 6200, { status: "BACKORDERED", variantId: "v-gold", reservedAt: undefined, reservedUntil: undefined });

  const restockRequests: RestockRequest[] = [
    { id: "rr-seed-1", userId: "u10", rewardId: "r8", variantId: "v-large", createdAt: isoAgo(3) },
  ];

  return {
    movements: movements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    redemptions: redemptions.sort((a, b) => (b.reservedAt ?? b.createdAt).localeCompare(a.reservedAt ?? a.createdAt)),
    transactions: transactions.reverse(),
    restockRequests,
  };
}
