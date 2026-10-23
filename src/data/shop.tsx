import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENT_USER,
  activityLog,
  badges,
  customers,
  loyaltyTransactions,
  orders,
  productCategories,
  products,
  rewards,
  tierConfig,
  type Badge,
  type Customer,
  type LoyaltyTransaction,
  type Order,
  type OrderStatus,
  type Product,
  type ProductCategory,
  type Reward,
  type Tier,
} from "./mockData";
import { extraCustomers, extraProducts } from "./seedExtras";
import type { ApiProfile, ApiRole } from "./api";
import {
  adminPages,
  defaultAdminRoleLabels,
  defaultRolePermissions,
  defaultStockAuthority,
  initialAdminUsers,
  inventoryPages,
  type AdminPage,
  type AdminRole,
  type AdminUser,
} from "./adminAccess";
import {
  batchExpiries,
  buildStockSeed,
  computeLevels,
  defaultStockItem,
  initialLocations,
  initialStockItems,
  initialSuppliers,
  levelKey,
  pickBatches,
  stockAuthorityLabels,
  stockAuthorityRank,
  openRedemptionStatuses,
  totalsFor,
  variantIds,
  variantLabel,
  type Redemption,
  type RedemptionStatus,
  type RestockRequest,
  type StockAuthority,
  type StockItem,
  type StockLevel,
  type StockLocation,
  type StockMovement,
  type StockSettings,
  type Stocktake,
  type StocktakeLine,
  type Supplier,
} from "./stock";

export type { Redemption } from "./stock";
export type CartItem = { productId: string; qty: number };
export type Referral = {
  id: string;
  referrerId: string;
  customerId: string;
  completed: boolean;
  createdAt: string;
};
export type TierChange = {
  id: string;
  userId: string;
  from: Tier;
  to: Tier;
  reason: string;
  createdAt: string;
};
export type Campaign = {
  id: string;
  name: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  active: boolean;
};
export type LogEntry = {
  id: string;
  userId: string;
  userName: string;
  event: string;
  description: string;
  timestamp: string;
};
export type TierRule = {
  min: number;
  max: number;
  multiplier: number;
  color: string;
};
type State = {
  adminUsers: AdminUser[];
  roleLabels: Record<AdminRole, string>;
  rolePermissions: Record<AdminRole, AdminPage[]>;
  disabledCustomerIds: string[];
  customers: Customer[];
  products: Product[];
  categories: ProductCategory[];
  orders: Order[];
  transactions: LoyaltyTransaction[];
  rewards: Reward[];
  badges: Badge[];
  logs: LogEntry[];
  redemptions: Redemption[];
  referrals: Referral[];
  tierHistory: TierChange[];
  campaigns: Campaign[];
  tiers: Record<Tier, TierRule>;
  cart: CartItem[];
  currentUserId: string;
  currency: "USD" | "KHR";
  exchangeRate: number;
  qualifyingPoints: Record<string, number>;
  tierOverrides: Record<string, Tier | undefined>;
  stockLocations: StockLocation[];
  suppliers: Supplier[];
  stockItems: Record<string, StockItem>;
  stockMovements: StockMovement[];
  stocktakes: Stocktake[];
  restockRequests: RestockRequest[];
  stockSettings: StockSettings;
  stockAuthority: Record<AdminRole, "clerk" | "manager">;
};

/** Fields shared by every stock form: what, which variant, where, and how many. */
export type StockLineInput = {
  rewardId: string;
  variantId: string;
  locationId: string;
  qty: number;
  batch?: string;
  expiresAt?: string;
  serials?: string[];
};
export type ReceiveInput = StockLineInput & {
  source: "PURCHASE" | "DONATION";
  supplierId: string;
  unitCost: number;
  reference: string;
  note: string;
};
export type AdjustInput = StockLineInput & { direction: "in" | "out"; reason: string };
export type TransferInput = StockLineInput & { toLocationId: string; note: string };
export type WriteOffInput = StockLineInput & { kind: "DAMAGE" | "LOSS" | "EXPIRY"; reason: string };
export type ReturnInput = StockLineInput & { redemptionId: string; refundPoints: boolean; reason: string };

const stockSettingsDefault: StockSettings = { reservationHours: 72 };
const stockSeed = buildStockSeed(rewards, [...customers, ...extraCustomers], stockSettingsDefault.reservationHours);

const initial: State = {
  adminUsers: initialAdminUsers,
  roleLabels: defaultAdminRoleLabels,
  rolePermissions: defaultRolePermissions,
  disabledCustomerIds: [],
  customers: [...customers, ...extraCustomers],
  products: [...products, ...extraProducts],
  categories: productCategories,
  orders,
  transactions: [...stockSeed.transactions, ...loyaltyTransactions],
  rewards,
  badges,
  logs: activityLog,
  redemptions: stockSeed.redemptions,
  tierHistory: [],
  campaigns: [],
  referrals: [
    {
      id: "ref-seed",
      referrerId: "u1",
      customerId: "u3",
      completed: true,
      createdAt: "2026-01-20",
    },
  ],
  tiers: tierConfig,
  cart: [],
  currentUserId: CURRENT_USER.id,
  currency: "USD",
  exchangeRate: 4000,
  qualifyingPoints: Object.fromEntries(
    [...customers, ...extraCustomers].map((c) => [c.id, c.points]),
  ),
  tierOverrides: {},
  stockLocations: initialLocations,
  suppliers: initialSuppliers,
  stockItems: initialStockItems,
  stockMovements: stockSeed.movements,
  stocktakes: [],
  restockRequests: stockSeed.restockRequests,
  stockSettings: stockSettingsDefault,
  stockAuthority: defaultStockAuthority,
};
const key = "khmershop-frontend-v1";
const redemptionStatuses: RedemptionStatus[] = ["RESERVED", "BACKORDERED", "FULFILLED", "CANCELLED", "EXPIRED", "RETURNED"];

/** Brings saved state from before the stock module up to date. */
function restoreStock(parsed: Partial<State>, rewardList: Reward[], roleLabels: Record<AdminRole, string>) {
  const hasLedger = Array.isArray(parsed.stockMovements);
  const stockMovements = hasLedger ? parsed.stockMovements! : [...initial.stockMovements];
  if (!hasLedger) {
    // Rewards created before the ledger existed get an opening balance from their old stock field.
    for (const reward of rewardList) {
      if (initial.stockItems[reward.id] || !(reward.stock > 0)) continue;
      stockMovements.unshift({
        id: uid(), createdAt: now(), type: "RECEIVE", rewardId: reward.id, variantId: "", locationId: initialLocations[0].id,
        onHand: Math.floor(reward.stock), reserved: 0, unitCost: 0, reason: "Opening balance (migrated)", actorId: "system", actorName: "System",
      });
    }
  }
  const savedRedemptions = (parsed.redemptions ?? []).map((r): Redemption => ({
    ...r,
    variantId: r.variantId ?? "",
    status: redemptionStatuses.includes(r.status) ? r.status : "FULFILLED",
    legacy: r.legacy ?? !redemptionStatuses.includes(r.status),
  }));
  const redemptions = hasLedger
    ? savedRedemptions
    : [...savedRedemptions, ...initial.redemptions.filter((r) => !savedRedemptions.some((item) => item.id === r.id))];
  const transactions = hasLedger || !parsed.transactions
    ? parsed.transactions
    : [...stockSeed.transactions.filter((t) => !parsed.transactions!.some((item) => item.id === t.id)), ...parsed.transactions];
  const stockItems: Record<string, StockItem> = { ...initial.stockItems, ...parsed.stockItems };
  for (const reward of rewardList) stockItems[reward.id] ??= defaultStockItem(reward);
  const stockAuthority = { ...defaultStockAuthority };
  for (const [role, level] of Object.entries(parsed.stockAuthority ?? {})) {
    if (role !== "super_admin" && Object.prototype.hasOwnProperty.call(roleLabels, role) && (level === "clerk" || level === "manager"))
      stockAuthority[role] = level;
  }
  const hours = parsed.stockSettings?.reservationHours;
  return {
    stockMovements,
    redemptions,
    ...(transactions ? { transactions } : {}),
    stockItems,
    stockAuthority,
    stockLocations: parsed.stockLocations?.length ? parsed.stockLocations : initial.stockLocations,
    suppliers: parsed.suppliers ?? initial.suppliers,
    stocktakes: parsed.stocktakes ?? [],
    restockRequests: parsed.restockRequests ?? (hasLedger ? [] : initial.restockRequests),
    stockSettings: {
      reservationHours: typeof hours === "number" && Number.isInteger(hours) && hours >= 1 && hours <= 720 ? hours : stockSettingsDefault.reservationHours,
    },
  };
}
/** Keeps saved categories, adding seed ones for saves that predate the module and any name a product still uses. */
function restoreCategories(parsed: Partial<State>): ProductCategory[] {
  const categories = Array.isArray(parsed.categories) ? [...parsed.categories] : [...initial.categories];
  for (const product of parsed.products ?? []) {
    if (product.category && !categories.some((c) => c.name === product.category))
      categories.push({ id: `cat-${uid().slice(0, 8)}`, name: product.category, nameKh: "", description: "", active: true });
  }
  return categories;
}
/** Saves from before multi-image products kept one `image` URL; turn it into the cover image. */
function restoreProducts(parsed: Partial<State>): Product[] {
  if (!Array.isArray(parsed.products)) return initial.products;
  return parsed.products.map((product) => {
    if (Array.isArray(product.images)) return product;
    const legacy = (product as Product & { image?: string }).image;
    return { ...product, images: legacy ? [{ url: legacy }] : [] };
  });
}
function restoreState(saved: string | null): State {
  if (!saved) return initial;
  try {
    const parsed = JSON.parse(saved) as Partial<State>;
    const tiers = { ...initial.tiers, ...parsed.tiers };
    tiers.Platinum = { ...tiers.Platinum, max: Infinity };
    const roleLabels = { ...defaultAdminRoleLabels };
    for (const [id, label] of Object.entries(parsed.roleLabels ?? {})) {
      if (id.startsWith("role-") && typeof label === "string" && label.trim())
        roleLabels[id] = label.trim();
    }
    const rolePermissions = { ...defaultRolePermissions };
    for (const [id, pages] of Object.entries(parsed.rolePermissions ?? {})) {
      if (id === "super_admin" || !Object.prototype.hasOwnProperty.call(roleLabels, id) || !Array.isArray(pages)) continue;
      rolePermissions[id] = [
        ...adminPages.filter((page) => !["users", "roles", "profile", "exchange-rate"].includes(page) && pages.includes(page)),
        "profile",
      ];
    }
    return {
      ...initial, ...parsed, tiers,
      exchangeRate: typeof parsed.exchangeRate === "number" && Number.isSafeInteger(parsed.exchangeRate) && parsed.exchangeRate > 0 && parsed.exchangeRate <= 1_000_000_000
        ? parsed.exchangeRate
        : initial.exchangeRate,
      adminUsers: parsed.adminUsers?.length
        ? [...parsed.adminUsers, ...initial.adminUsers.filter((seed) => !parsed.adminUsers!.some((user) => user.id === seed.id || user.email.toLowerCase() === seed.email))]
        : initial.adminUsers,
      disabledCustomerIds: parsed.disabledCustomerIds ?? [],
      products: restoreProducts(parsed),
      categories: restoreCategories(parsed),
      roleLabels,
      rolePermissions,
      ...restoreStock(parsed, parsed.rewards ?? initial.rewards, roleLabels),
    };
  } catch {
    return initial;
  }
}
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const date = () => now().slice(0, 10);
const stamp = () => now().replace("T", " ").slice(0, 16);
const tierFor = (points: number, tiers: State["tiers"]): Tier =>
  points >= tiers.Platinum.min
    ? "Platinum"
    : points >= tiers.Gold.min
      ? "Gold"
      : "Silver";
const log = (
  s: State,
  user: Customer,
  event: string,
  description: string,
): LogEntry[] => [
  {
    id: uid(),
    userId: user.id,
    userName: user.name,
    event,
    description,
    timestamp: now().replace("T", " ").slice(0, 16),
  },
  ...s.logs,
];
const awardBadges = (s: State, userId: string): State => {
  const user = s.customers.find((c) => c.id === userId);
  if (!user) return s;
  const earned = new Set(user.badges);
  const referrals = s.referrals.filter(
    (r) => r.referrerId === userId && r.completed,
  ).length;
  const checks: Record<string, boolean> = {
    FIRST_PURCHASE: user.ordersCount >= 1,
    FIVE_ORDERS: user.ordersCount >= 5,
    TEN_ORDERS: user.ordersCount >= 10,
    BIG_SPENDER: user.totalSpent >= 500,
    REFERRAL_CHAMPION: referrals >= 5,
    POINT_COLLECTOR: (s.qualifyingPoints[userId] ?? 0) >= 1000,
    LOYAL_CUSTOMER:
      new Date(user.joinedAt).getTime() <= Date.now() - 180 * 86400000 &&
      user.ordersCount > 0,
  };
  const gained = s.badges.filter((b) => {
    const value =
      b.metric === "orders"
        ? user.ordersCount
        : b.metric === "spend"
          ? user.totalSpent
          : b.metric === "referrals"
            ? referrals
            : b.metric === "qualifyingPoints"
              ? (s.qualifyingPoints[userId] ?? 0)
              : 0;
    return (
      (b.metric ? value >= (b.threshold ?? Infinity) : checks[b.code]) &&
      !earned.has(b.code)
    );
  });
  if (!gained.length) return s;
  return {
    ...s,
    customers: s.customers.map((c) =>
      c.id === userId
        ? { ...c, badges: [...c.badges, ...gained.map((b) => b.code)] }
        : c,
    ),
    logs: gained.reduce(
      (items, b) => [
        {
          id: uid(),
          userId,
          userName: user.name,
          event: "BADGE_AWARDED",
          description: `Earned badge: ${b.name}`,
          timestamp: now().replace("T", " ").slice(0, 16),
        },
        ...items,
      ],
      s.logs,
    ),
  };
};

const staffLog = (s: State, actor: { id: string; name: string }, event: string, description: string): LogEntry[] => [
  { id: uid(), userId: actor.id, userName: actor.name, event, description, timestamp: stamp() },
  ...s.logs,
];
const systemActor = { id: "system", name: "System" };
/** Keeps the API's page ids the frontend knows, in menu order. */
const toAdminPages = (pages: string[]): AdminPage[] => adminPages.filter((page) => pages.includes(page));
/** Staff accounts from the API use stable ids so sessions survive a reload of the staff list. */
export const toAdminUser = (profile: ApiProfile): AdminUser => ({
  id: `api-admin-${profile.id}`,
  name: profile.name,
  email: profile.email.trim().toLowerCase(),
  role: profile.role?.code ?? "",
  active: profile.is_active ?? true,
});
const authorityFor = (s: State, role: AdminRole): StockAuthority =>
  role === "super_admin" ? "admin" : (s.stockAuthority[role] ?? "clerk");
/** Returns the acting staff user, or an error when they lack the stock authority level. */
const stockActor = (s: State, actorId: string, need: StockAuthority): AdminUser | string => {
  const actor = s.adminUsers.find((user) => user.id === actorId && user.active);
  if (!actor) return "Staff account not found.";
  if (actor.role !== "super_admin" && !(s.rolePermissions[actor.role] ?? []).some((page) => inventoryPages.includes(page)))
    return "Your role has no inventory access.";
  if (stockAuthorityRank[authorityFor(s, actor.role)] < stockAuthorityRank[need])
    return `This action needs ${stockAuthorityLabels[need].toLowerCase()} authority.`;
  return actor;
};
const stockItemOf = (s: State, rewardId: string) => s.stockItems[rewardId] ?? defaultStockItem({ id: rewardId });
const activeLocationIds = (s: State) => s.stockLocations.filter((l) => l.active).map((l) => l.id);
const normalizeSerials = (serials: string[] = []) =>
  [...new Set(serials.map((serial) => serial.trim().toUpperCase()).filter(Boolean))];
const describeLine = (s: State, line: Pick<StockLineInput, "rewardId" | "variantId">, qty: number) => {
  const item = stockItemOf(s, line.rewardId);
  const name = s.rewards.find((r) => r.id === line.rewardId)?.name ?? line.rewardId;
  return `${qty} × ${name}${item.variants.length ? ` (${variantLabel(item, line.variantId)})` : ""} [${item.sku}]`;
};
const locationName = (s: State, id: string) => s.stockLocations.find((l) => l.id === id)?.name ?? id;

type StockPart = { qty: number; batch?: string; expiresAt?: string; serials?: string[] };

/** Checks the reward, variant, location and quantity shared by every stock form. */
const checkLine = (s: State, line: StockLineInput, needActiveLocation: boolean) => {
  const reward = s.rewards.find((r) => r.id === line.rewardId);
  if (!reward) return "Choose a reward item.";
  const item = stockItemOf(s, line.rewardId);
  if (!variantIds(item).includes(line.variantId)) return item.variants.length ? "Choose a variant." : "This item has no variants.";
  const location = s.stockLocations.find((l) => l.id === line.locationId);
  if (!location) return "Choose a location.";
  if (needActiveLocation && !location.active) return `${location.name} is inactive.`;
  if (!Number.isInteger(line.qty) || line.qty < 1) return "Enter a whole quantity of at least 1.";
  if (line.qty > 100000) return "Quantity is too large.";
  return { reward, item };
};

/** Works out batches or serials for stock coming in. */
const resolveIn = (s: State, levels: StockLevel[], item: StockItem, line: StockLineInput): StockPart[] | string => {
  if (item.tracking === "batch") {
    const batch = line.batch?.trim().toUpperCase() ?? "";
    if (!batch) return "Enter a batch or lot code.";
    const existing = batchExpiries(s.stockMovements).get(`${line.rewardId}|${batch}`);
    if (existing && line.expiresAt && line.expiresAt !== existing)
      return `Batch ${batch} already expires on ${existing}.`;
    return [{ qty: line.qty, batch, expiresAt: existing ? undefined : line.expiresAt || undefined }];
  }
  if (item.tracking === "serial") {
    const serials = normalizeSerials(line.serials);
    if (serials.length !== line.qty) return `Enter ${line.qty} unique serial number${line.qty === 1 ? "" : "s"} (one per unit).`;
    const inStock = new Set(levels.filter((l) => l.rewardId === line.rewardId).flatMap((l) => l.serials));
    const clash = serials.find((serial) => inStock.has(serial));
    if (clash) return `Serial ${clash} is already in stock.`;
    return [{ qty: line.qty, serials }];
  }
  return [{ qty: line.qty }];
};

/**
 * Works out batches or serials for stock going out.
 * "available": unreserved, unexpired stock (or explicitly chosen expired stock).
 * "reserved": stock already held by a reservation. "expired": expired batches only.
 */
const resolveOut = (
  level: StockLevel | undefined,
  item: StockItem,
  line: StockLineInput,
  mode: "available" | "reserved" | "expired",
): StockPart[] | string => {
  if (!level || level.onHand <= 0) return "There is no stock of this item at that location.";
  const today = date();
  const usable = level.onHand - level.expired;
  if (item.tracking === "batch") {
    const chosen = line.batch?.trim().toUpperCase();
    if (chosen) {
      const batch = level.batches.find((b) => b.batch === chosen);
      if (!batch || batch.onHand < line.qty) return `Batch ${chosen} has only ${batch?.onHand ?? 0} on hand here.`;
      const expired = !!batch.expiresAt && batch.expiresAt < today;
      if (mode === "expired" && !expired) return `Batch ${chosen} has not expired.`;
      if (mode === "reserved" && expired) return `Batch ${chosen} has expired.`;
      if (mode === "available" && !expired && line.qty > level.available)
        return `Only ${level.available} unreserved unit${level.available === 1 ? "" : "s"} available here.`;
      return [{ qty: line.qty, batch: chosen }];
    }
    if (mode === "available" && line.qty > level.available)
      return `Only ${level.available} unreserved unit${level.available === 1 ? "" : "s"} available here.`;
    const picks = pickBatches(level.batches, line.qty, mode === "expired" ? "expired" : "usable", today);
    if (!picks) return mode === "expired" ? "Not enough expired stock here." : "Not enough unexpired stock here.";
    return picks.map((p) => ({ qty: p.qty, batch: p.batch }));
  }
  if (mode === "expired") return "This item does not track expiry dates.";
  const capacity = mode === "reserved" ? usable : level.available;
  if (line.qty > capacity) return `Only ${capacity} unit${capacity === 1 ? "" : "s"} available here.`;
  if (item.tracking === "serial") {
    let serials = normalizeSerials(line.serials);
    if (!serials.length && mode === "reserved") serials = level.serials.slice(0, line.qty);
    if (serials.length !== line.qty) return `Choose ${line.qty} serial number${line.qty === 1 ? "" : "s"}.`;
    const missing = serials.find((serial) => !level.serials.includes(serial));
    if (missing) return `Serial ${missing} is not in stock here.`;
    return [{ qty: line.qty, serials }];
  }
  return [{ qty: line.qty }];
};

type MovementBase = Pick<StockMovement, "type" | "rewardId" | "variantId" | "locationId"> &
  Partial<Pick<StockMovement, "reference" | "reason" | "supplierId" | "source" | "unitCost">>;
const buildMovements = (
  s: State,
  actor: { id: string; name: string },
  base: MovementBase,
  parts: StockPart[],
  sign: 1 | -1,
  reservedDelta = 0,
): StockMovement[] => {
  const createdAt = now();
  return parts.map((part) => ({
    id: uid(),
    createdAt,
    unitCost: stockItemOf(s, base.rewardId).unitCost,
    ...base,
    onHand: sign * part.qty,
    reserved: reservedDelta,
    batch: part.batch,
    expiresAt: part.expiresAt,
    serials: part.serials,
    actorId: actor.id,
    actorName: actor.name,
  }));
};
const appendMovements = (s: State, movements: StockMovement[]): State =>
  movements.length ? { ...s, stockMovements: [...[...movements].reverse(), ...s.stockMovements] } : s;
const reservationEnd = (s: State, from = Date.now()) =>
  new Date(from + s.stockSettings.reservationHours * 3600000).toISOString();

/** Allocates freed stock to backorders (oldest first) and flags "notify me" requests that can now be met. */
const settleStock = (s: State): State => {
  const backorders = s.redemptions.filter((r) => r.status === "BACKORDERED").reverse();
  const pending = s.restockRequests.filter((r) => !r.notifiedAt);
  if (!backorders.length && !pending.length) return s;
  const locations = activeLocationIds(s);
  const available = new Map(computeLevels(s.stockMovements).map((l) => [l.key, l.available]));
  let next = s;
  for (const redemption of backorders) {
    const best = locations
      .map((id) => ({ id, qty: available.get(levelKey(redemption.rewardId, redemption.variantId, id)) ?? 0 }))
      .sort((a, b) => b.qty - a.qty)[0];
    if (!best || best.qty < 1) continue;
    available.set(levelKey(redemption.rewardId, redemption.variantId, best.id), best.qty - 1);
    next = appendMovements(next, buildMovements(next, systemActor, {
      type: "RESERVE", rewardId: redemption.rewardId, variantId: redemption.variantId, locationId: best.id,
      reference: redemption.id, reason: "Backorder allocated",
    }, [{ qty: 0 }], 1, 1));
    next = {
      ...next,
      redemptions: next.redemptions.map((r) => r.id === redemption.id
        ? { ...r, status: "RESERVED", locationId: best.id, reservedAt: now(), reservedUntil: reservationEnd(next) }
        : r),
    };
    const user = next.customers.find((c) => c.id === redemption.userId);
    if (user) next = { ...next, logs: log(next, user, "BACKORDER_RESERVED", `${redemption.rewardName} is back in stock and reserved at ${locationName(next, best.id)}`) };
  }
  const notified = pending.filter((request) => {
    const reward = next.rewards.find((r) => r.id === request.rewardId);
    return reward?.active && locations.some((id) => (available.get(levelKey(request.rewardId, request.variantId, id)) ?? 0) > 0);
  });
  if (notified.length) {
    const ids = new Set(notified.map((r) => r.id));
    next = { ...next, restockRequests: next.restockRequests.map((r) => ids.has(r.id) ? { ...r, notifiedAt: now() } : r) };
    for (const request of notified) {
      const user = next.customers.find((c) => c.id === request.userId);
      const reward = next.rewards.find((r) => r.id === request.rewardId);
      if (user && reward) next = { ...next, logs: log(next, user, "RESTOCK_NOTIFIED", `${reward.name} is back in stock`) };
    }
  }
  return next;
};

/** Ends a reserved or backordered redemption: releases its stock and refunds the points. */
const closeRedemption = (
  s: State,
  redemption: Redemption,
  status: "CANCELLED" | "EXPIRED",
  reason: string,
  actor: { id: string; name: string },
): State => {
  let next = s;
  if (redemption.status === "RESERVED" && redemption.locationId)
    next = appendMovements(next, buildMovements(next, actor, {
      type: "RELEASE", rewardId: redemption.rewardId, variantId: redemption.variantId, locationId: redemption.locationId,
      reference: redemption.id, reason,
    }, [{ qty: 0 }], 1, -1));
  next = refundPoints(next, redemption, reason);
  return {
    ...next,
    redemptions: next.redemptions.map((r) => r.id === redemption.id ? { ...r, status, closedAt: now(), closeReason: reason } : r),
  };
};
const refundPoints = (s: State, redemption: Redemption, reason: string): State => {
  const user = s.customers.find((c) => c.id === redemption.userId);
  if (!user) return s;
  return {
    ...s,
    customers: s.customers.map((c) => c.id === user.id ? { ...c, points: c.points + redemption.points } : c),
    transactions: [{
      id: uid(), userId: user.id, userName: user.name, type: "REFUND", points: redemption.points,
      balanceBefore: user.points, balanceAfter: user.points + redemption.points,
      reason: `Refund for ${redemption.rewardName}: ${reason}`, createdAt: date(),
    }, ...s.transactions],
    logs: log(s, user, "POINTS_REFUNDED", `Refunded ${redemption.points} points for ${redemption.rewardName} (${reason})`),
  };
};
const expireReservations = (s: State): State => {
  const cutoff = now();
  const expired = s.redemptions.filter((r) => r.status === "RESERVED" && r.reservedUntil && r.reservedUntil < cutoff);
  if (!expired.length) return s;
  return settleStock(expired.reduce(
    (next, redemption) => closeRedemption(next, redemption, "EXPIRED", "Reservation timed out", systemActor),
    s,
  ));
};

type Shop = State & {
  setCustomerActive: (actorId: string, userId: string, active: boolean) => string | null;
  /** Replaces staff users, role labels, role pages, and stock authority with those loaded from the API. */
  syncStaff: (roles: ApiRole[], users: ApiProfile[]) => void;
  updateAdminProfile: (userId: string, fields: Pick<AdminUser, "name" | "email">) => string | null;
  currentUser: Customer;
  /** Products customers can browse: those whose category is active. */
  storefrontProducts: Product[];
  setCurrency: (currency: "USD" | "KHR") => void;
  saveExchangeRate: (actorId: string, rate: number) => string | null;
  money: (usd: number) => string;
  setCart: (cart: CartItem[]) => void;
  addToCart: (id: string, qty?: number) => void;
  checkout: (address: string, phone: string) => string | null;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  redeem: (id: string, variantId?: string) => string | null;
  adjustPoints: (
    userId: string,
    amount: number,
    reason: string,
  ) => string | null;
  /**
   * Replaces the catalog with the one loaded from the API. `stock` overrides counts by product id;
   * other products keep the count the store already has. Cart lines for removed products are dropped.
   */
  syncCatalog: (categories: ProductCategory[], products: Product[], stock?: Record<string, number>) => void;
  /** Adds a staff activity-log entry for a change made through the API. */
  logStaffAction: (actorId: string, event: string, description: string) => void;
  saveReward: (reward: Reward) => void;
  deleteReward: (id: string) => string | null;
  saveTier: (tier: Tier, rule: TierRule) => void;
  overrideTier: (
    userId: string,
    tier: Tier | undefined,
    reason: string,
  ) => void;
  saveBadge: (badge: Badge) => void;
  deleteBadge: (id: string) => void;
  saveCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  updateProfile: (
    fields: Pick<Customer, "name" | "phone" | "province">,
  ) => void;
  registerCustomer: (fields: {
    name: string;
    email: string;
    phone: string;
    province: string;
    referralCode: string;
  }) => { error?: string; userId?: string };
  selectCustomer: (id: string) => void;
  recordLogin: (userId: string | null, adminUserId?: string) => void;
  /** Returns the demo customer for an API account, creating one by email if needed. */
  linkApiCustomer: (profile: ApiProfile) => string;
  /** Adds or updates the staff user for an API account, with the role and pages the API sent. Returns its id. */
  linkApiAdmin: (profile: ApiProfile) => string;
  stockLevels: StockLevel[];
  /** Redeemable units across active locations. */
  availableFor: (rewardId: string, variantId?: string) => number;
  stockItemFor: (rewardId: string) => StockItem;
  stockAuthorityOf: (actorId: string) => StockAuthority | null;
  receiveStock: (actorId: string, input: ReceiveInput) => string | null;
  adjustStock: (actorId: string, input: AdjustInput) => string | null;
  transferStock: (actorId: string, input: TransferInput) => string | null;
  writeOffStock: (actorId: string, input: WriteOffInput) => string | null;
  returnStock: (actorId: string, input: ReturnInput) => string | null;
  fulfillRedemption: (actorId: string, id: string, method: "SHIPPED" | "PICKED_UP", serial?: string) => string | null;
  cancelRedemption: (actorId: string, id: string, reason: string) => string | null;
  extendReservation: (actorId: string, id: string, hours: number) => string | null;
  saveStockItem: (actorId: string, item: StockItem) => string | null;
  saveStockLocation: (actorId: string, location: StockLocation) => string | null;
  saveSupplier: (actorId: string, supplier: Supplier) => string | null;
  saveStockSettings: (actorId: string, settings: StockSettings) => string | null;
  createStocktake: (actorId: string, locationId: string, category: string, note: string) => { id?: string; error?: string };
  recordCount: (actorId: string, stocktakeId: string, line: number, counted: number | null) => string | null;
  postStocktake: (actorId: string, id: string) => string | null;
  cancelStocktake: (actorId: string, id: string) => string | null;
  cancelMyRedemption: (id: string) => string | null;
  requestRestock: (rewardId: string, variantId: string) => string | null;
  dismissRestock: (id: string) => void;
};
const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setRawState] = useState<State>(() => {
    try {
      return restoreState(localStorage.getItem(key));
    } catch {
      return initial;
    }
  });
  // Updates apply to this ref synchronously, so back-to-back mutations (a double-clicked
  // redeem, two staff actions in one tick) each see the previous one's result.
  const stateRef = useRef(state);
  const savedRef = useRef<string | null>(null);
  const persist = (next: State) => {
    try {
      const raw = JSON.stringify(next);
      savedRef.current = raw;
      localStorage.setItem(key, raw);
    } catch {
      /* storage may be unavailable */
    }
  };
  const setState = useCallback((action: State | ((s: State) => State)) => {
    const next = typeof action === "function" ? action(stateRef.current) : action;
    if (next === stateRef.current) return;
    stateRef.current = next;
    persist(next);
    setRawState(next);
  }, []);
  /**
   * Runs a validated mutation against the latest state, including writes another tab made
   * that have not arrived as a storage event yet. Returns the error, or null when applied.
   */
  const commit = useCallback((mutate: (s: State) => State | string): string | null => {
    try {
      const raw = localStorage.getItem(key);
      if (raw && savedRef.current !== null && raw !== savedRef.current) {
        savedRef.current = raw;
        stateRef.current = restoreState(raw);
        setRawState(stateRef.current);
      }
    } catch {
      /* storage may be unavailable */
    }
    const result = mutate(stateRef.current);
    if (typeof result === "string") return result;
    setState(result);
    return null;
  }, [setState]);
  useEffect(() => {
    persist(stateRef.current);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      savedRef.current = event.newValue;
      stateRef.current = restoreState(event.newValue);
      setRawState(stateRef.current);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    const tick = () => setState(expireReservations);
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, [setState]);
  const stockLevels = useMemo(() => computeLevels(state.stockMovements), [state.stockMovements]);
  const currentUser =
    state.customers.find((c) => c.id === state.currentUserId) ??
    state.customers[0];

  const storefrontProducts = useMemo(() => {
    const hidden = new Set(state.categories.filter((c) => !c.active).map((c) => c.name));
    return state.products.filter((p) => !hidden.has(p.category));
  }, [state.products, state.categories]);

  const shop = useMemo<Shop>(
    () => ({
      ...state,
      currentUser,
      storefrontProducts,
      updateAdminProfile: (userId, fields) => {
        const user = state.adminUsers.find((item) => item.id === userId && item.active);
        if (!user) return "Admin account not found.";
        const name = fields.name.trim();
        const email = fields.email.trim().toLowerCase();
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return "Enter a name and valid email address.";
        if (state.adminUsers.some((item) => item.id !== userId && item.email.toLowerCase() === email))
          return "An admin user already has that email address.";
        setState((s) => ({
          ...s,
          adminUsers: s.adminUsers.map((item) => item.id === userId ? { ...item, name, email } : item),
          logs: [{ id: uid(), userId, userName: name, event: "ADMIN_PROFILE_UPDATED", description: "Updated admin profile", timestamp: now().replace("T", " ").slice(0, 16) }, ...s.logs],
        }));
        return null;
      },
      syncStaff: (roles, users) =>
        setState((s) => {
          const roleLabels: Record<AdminRole, string> = {};
          const rolePermissions: Record<AdminRole, AdminPage[]> = {};
          const stockAuthority: Record<AdminRole, "clerk" | "manager"> = {};
          for (const role of roles) {
            roleLabels[role.code] = role.label;
            rolePermissions[role.code] = toAdminPages(role.pages);
            if (role.stock_authority) stockAuthority[role.code] = role.stock_authority;
          }
          return { ...s, roleLabels, rolePermissions, stockAuthority, adminUsers: users.map(toAdminUser) };
        }),
      setCustomerActive: (actorId, userId, active) => {
        const actor = state.adminUsers.find((item) => item.id === actorId && item.active);
        if (actor?.role !== "super_admin") return "Only Super Admin can manage users.";
        const customer = state.customers.find((item) => item.id === userId);
        if (!customer) return "Customer not found.";
        setState((s) => ({
          ...s,
          disabledCustomerIds: active
            ? s.disabledCustomerIds.filter((id) => id !== userId)
            : [...new Set([...s.disabledCustomerIds, userId])],
          logs: [{ id: uid(), userId: actor.id, userName: actor.name, event: "CUSTOMER_STATUS", description: `${active ? "Enabled" : "Disabled"} customer ${customer.email}`, timestamp: now().replace("T", " ").slice(0, 16) }, ...s.logs],
        }));
        return null;
      },
      setCurrency: (currency) => setState((s) => ({ ...s, currency })),
      saveExchangeRate: (actorId, rate) => {
        const actor = state.adminUsers.find((item) => item.id === actorId && item.active);
        if (actor?.role !== "super_admin") return "Only Super Admin can change the exchange rate.";
        if (!Number.isSafeInteger(rate) || rate < 1 || rate > 1_000_000_000)
          return "Enter a whole-number KHR rate between 1 and 1,000,000,000.";
        setState((s) => ({
          ...s,
          exchangeRate: rate,
          logs: [{ id: uid(), userId: actor.id, userName: actor.name, event: "EXCHANGE_RATE_UPDATED", description: `Changed exchange rate from ${s.exchangeRate.toLocaleString()} to ${rate.toLocaleString()} KHR per USD`, timestamp: now().replace("T", " ").slice(0, 16) }, ...s.logs],
        }));
        return null;
      },
      money: (usd) =>
        state.currency === "KHR"
          ? `៛${Math.round(usd * state.exchangeRate).toLocaleString()}`
          : `$${usd.toFixed(2)}`,
      setCart: (cart) => setState((s) => ({ ...s, cart })),
      addToCart: (id, qty = 1) =>
        setState((s) => {
          const product = s.products.find((p) => p.id === id);
          const inCart = s.cart.find((c) => c.productId === id)?.qty ?? 0;
          if (!product || !Number.isInteger(qty) || qty < 1 || product.stock < inCart + qty) return s;
          return {
            ...s,
            cart: inCart
              ? s.cart.map((c) =>
                  c.productId === id ? { ...c, qty: c.qty + qty } : c,
                )
              : [...s.cart, { productId: id, qty }],
          };
        }),
      checkout: (address, phone) => {
        if (!address.trim() || !phone.trim())
          return "Enter a delivery address and phone number.";
        if (!/^\+?\d[\d\s-]{7,14}$/.test(phone.trim()))
          return "Enter a valid phone number.";
        if (!state.cart.length) return "Your cart is empty.";
        const items = state.cart.map((ci) => ({
          ci,
          product: state.products.find((p) => p.id === ci.productId),
        }));
        if (
          items.some(
            ({ ci, product }) =>
              !product || ci.qty < 1 || ci.qty > product.stock,
          )
        )
          return "An item is unavailable or exceeds stock.";
        const order: Order = {
          id: `ORD-${Date.now()}`,
          customerId: currentUser.id,
          customerName: currentUser.name,
          items: items.map(({ ci, product }) => ({
            productId: ci.productId,
            name: product!.name,
            qty: ci.qty,
            price: product!.price,
            basePoints: product!.normalPoints,
            bonusMultiplier: product!.bonusMultiplier,
          })),
          total: items.reduce(
            (sum, { ci, product }) => sum + ci.qty * product!.price,
            0,
          ),
          status: "PENDING",
          pointsEarned: 0,
          createdAt: date(),
          deliveryAddress: address.trim(),
          deliveryPhone: phone.trim(),
        };
        setState((s) => ({
          ...s,
          orders: [order, ...s.orders],
          cart: [],
          products: s.products.map((p) => ({
            ...p,
            stock:
              p.stock - (s.cart.find((c) => c.productId === p.id)?.qty ?? 0),
          })),
          logs: log(
            s,
            currentUser,
            "ORDER_CREATED",
            `Created order ${order.id} for $${order.total.toFixed(2)}`,
          ),
        }));
        return null;
      },
      updateOrderStatus: (id, status) =>
        setState((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status === status ||
            ["COMPLETED", "CANCELLED"].includes(order.status)
          )
            return s;
          const allowed: Record<OrderStatus, OrderStatus[]> = {
            PENDING: ["CONFIRMED", "CANCELLED"],
            CONFIRMED: ["PROCESSING", "CANCELLED"],
            PROCESSING: ["SHIPPED", "CANCELLED"],
            SHIPPED: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
          };
          if (!allowed[order.status].includes(status)) return s;
          const user = s.customers.find((c) => c.id === order.customerId);
          if (!user) return s;
          let next: State = {
            ...s,
            orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
            logs: log(
              s,
              user,
              `ORDER_${status}`,
              `Order ${id} ${status.toLowerCase()}`,
            ),
          };
          if (status === "CANCELLED")
            next.products = next.products.map((p) => ({
              ...p,
              stock:
                p.stock +
                (order.items.find((i) => i.productId === p.id)?.qty ?? 0),
            }));
          if (status === "COMPLETED") {
            const base = order.items.reduce((sum, item) => {
              return (
                sum +
                (item.basePoints ?? Math.floor(item.price)) *
                  (item.bonusMultiplier ?? 1) *
                  item.qty
              );
            }, 0);
            const campaignMultiplier = Math.max(
              1,
              ...s.campaigns
                .filter(
                  (c) =>
                    c.active && c.startDate <= date() && c.endDate >= date(),
                )
                .map((c) => c.multiplier),
            );
            const earned = Math.floor(
              base * s.tiers[user.tier].multiplier * campaignMultiplier,
            );
            next.orders = next.orders.map((o) =>
              o.id === id ? { ...o, pointsEarned: earned } : o,
            );
            next.transactions = [
              {
                id: uid(),
                userId: user.id,
                userName: user.name,
                type: "EARN",
                points: earned,
                balanceBefore: user.points,
                balanceAfter: user.points + earned,
                reason: `Completed order ${id}`,
                orderId: id,
                createdAt: date(),
              },
              ...next.transactions,
            ];
            next.qualifyingPoints = {
              ...next.qualifyingPoints,
              [user.id]:
                (next.qualifyingPoints[user.id] ?? user.points) + earned,
            };
            const computedTier =
              s.tierOverrides[user.id] ??
              tierFor(next.qualifyingPoints[user.id], s.tiers);
            next.customers = next.customers.map((c) =>
              c.id === user.id
                ? {
                    ...c,
                    points: c.points + earned,
                    totalSpent: c.totalSpent + order.total,
                    ordersCount: c.ordersCount + 1,
                    lastOrder: date(),
                    tier: computedTier,
                  }
                : c,
            );
            next.logs = log(
              next,
              user,
              "POINTS_EARNED",
              `Earned ${earned} points from ${id}`,
            );
            if (computedTier !== user.tier) {
              next.logs = log(
                next,
                user,
                "TIER_CHANGED",
                `${user.tier} → ${computedTier}`,
              );
              next.tierHistory = [
                {
                  id: uid(),
                  userId: user.id,
                  from: user.tier,
                  to: computedTier,
                  reason: `Completed order ${id}`,
                  createdAt: date(),
                },
                ...next.tierHistory,
              ];
            }
            const referral = next.referrals.find(
              (r) => r.customerId === user.id && !r.completed,
            );
            if (
              referral &&
              user.ordersCount === 0 &&
              referral.referrerId !== user.id
            ) {
              next.referrals = next.referrals.map((r) =>
                r.id === referral.id ? { ...r, completed: true } : r,
              );
              for (const [customerId, bonus] of [
                [referral.referrerId, 100],
                [user.id, 50],
              ] as const) {
                const recipient = next.customers.find(
                  (c) => c.id === customerId,
                );
                if (!recipient) continue;
                next.transactions = [
                  {
                    id: uid(),
                    userId: customerId,
                    userName: recipient.name,
                    type: "REFERRAL",
                    points: bonus,
                    balanceBefore: recipient.points,
                    balanceAfter: recipient.points + bonus,
                    reason: `Referral conversion for ${user.name}`,
                    createdAt: date(),
                  },
                  ...next.transactions,
                ];
                next.customers = next.customers.map((c) =>
                  c.id === customerId ? { ...c, points: c.points + bonus } : c,
                );
                next.logs = log(
                  next,
                  recipient,
                  "REFERRAL_CONVERTED",
                  `Earned ${bonus} points from ${user.name}'s first order`,
                );
              }
              next = awardBadges(next, referral.referrerId);
            }
            next = awardBadges(next, user.id);
          }
          return next;
        }),
      redeem: (id, variantId = "") =>
        commit((s) => {
          const user = s.customers.find((c) => c.id === s.currentUserId);
          const reward = s.rewards.find((r) => r.id === id);
          if (!user) return "Sign in to redeem rewards.";
          if (!reward || !reward.active || (reward.expiresAt && reward.expiresAt < date()))
            return "Reward unavailable.";
          const item = stockItemOf(s, id);
          if (!variantIds(item).includes(variantId)) return "Choose an option for this reward.";
          if (s.redemptions.some((r) => r.userId === user.id && r.rewardId === id && openRedemptionStatuses.includes(r.status)))
            return "You already redeemed this reward.";
          if (user.points < reward.pointsCost) return "Insufficient points.";
          if (s.tiers[user.tier].min < s.tiers[reward.minTier].min)
            return `Requires ${reward.minTier} tier.`;
          // Reserve from the location holding the most redeemable stock. Points and stock change in one update.
          const levels = computeLevels(s.stockMovements);
          const best = activeLocationIds(s)
            .map((locationId) => ({ locationId, qty: levels.find((l) => l.key === levelKey(id, variantId, locationId))?.available ?? 0 }))
            .sort((a, b) => b.qty - a.qty)[0];
          const inStock = !!best && best.qty > 0;
          if (!inStock && !item.allowBackorder) return "Reward is out of stock.";
          const rewardName = item.variants.length ? `${reward.name} (${variantLabel(item, variantId)})` : reward.name;
          const redemption: Redemption = {
            id: uid(), userId: user.id, rewardId: id, rewardName, points: reward.pointsCost, createdAt: date(), variantId,
            status: inStock ? "RESERVED" : "BACKORDERED",
            ...(inStock ? { locationId: best.locationId, reservedAt: now(), reservedUntil: reservationEnd(s) } : {}),
          };
          const next: State = {
            ...s,
            customers: s.customers.map((c) => c.id === user.id ? { ...c, points: c.points - reward.pointsCost } : c),
            transactions: [{
              id: uid(), userId: user.id, userName: user.name, type: "SPEND", points: -reward.pointsCost,
              balanceBefore: user.points, balanceAfter: user.points - reward.pointsCost,
              reason: `Redeemed: ${rewardName}`, createdAt: date(),
            }, ...s.transactions],
            redemptions: [redemption, ...s.redemptions],
            logs: log(s, user, "REWARD_REDEEMED", `Redeemed ${rewardName} for ${reward.pointsCost} points${inStock ? "" : " (backordered)"}`),
          };
          return inStock
            ? appendMovements(next, buildMovements(next, user, {
                type: "RESERVE", rewardId: id, variantId, locationId: best.locationId, reference: redemption.id, reason: "Online redemption",
              }, [{ qty: 0 }], 1, 1))
            : next;
        }),
      cancelMyRedemption: (id) =>
        commit((s) => {
          const user = s.customers.find((c) => c.id === s.currentUserId);
          const redemption = s.redemptions.find((r) => r.id === id && r.userId === user?.id);
          if (!user || !redemption) return "Redemption not found.";
          if (redemption.status !== "RESERVED" && redemption.status !== "BACKORDERED")
            return "Only reserved or backordered redemptions can be cancelled.";
          return settleStock(closeRedemption(s, redemption, "CANCELLED", "Cancelled by customer", user));
        }),
      requestRestock: (rewardId, variantId) =>
        commit((s) => {
          const user = s.customers.find((c) => c.id === s.currentUserId);
          const reward = s.rewards.find((r) => r.id === rewardId);
          if (!user || !reward) return "Reward not found.";
          if (!variantIds(stockItemOf(s, rewardId)).includes(variantId)) return "Choose an option for this reward.";
          if (s.restockRequests.some((r) => r.userId === user.id && r.rewardId === rewardId && r.variantId === variantId && !r.notifiedAt))
            return "You will already be notified when this is back in stock.";
          return {
            ...s,
            restockRequests: [{ id: uid(), userId: user.id, rewardId, variantId, createdAt: now() }, ...s.restockRequests],
            logs: log(s, user, "RESTOCK_REQUESTED", `Asked to be notified when ${reward.name} is back in stock`),
          };
        }),
      dismissRestock: (id) =>
        setState((s) => ({ ...s, restockRequests: s.restockRequests.filter((r) => !(r.id === id && r.userId === s.currentUserId)) })),
      stockLevels,
      availableFor: (rewardId, variantId) =>
        totalsFor(stockLevels, { rewardId, variantId, locationIds: activeLocationIds(state) }).available,
      stockItemFor: (rewardId) => stockItemOf(state, rewardId),
      stockAuthorityOf: (actorId) => {
        const actor = state.adminUsers.find((user) => user.id === actorId && user.active);
        return actor ? authorityFor(state, actor.role) : null;
      },
      receiveStock: (actorId, input) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          const checked = checkLine(s, input, true);
          if (typeof checked === "string") return checked;
          if (input.supplierId && !s.suppliers.some((x) => x.id === input.supplierId)) return "Choose a valid supplier or partner.";
          if (!Number.isFinite(input.unitCost) || input.unitCost < 0) return "Enter a unit cost of zero or more.";
          const parts = resolveIn(s, computeLevels(s.stockMovements), checked.item, input);
          if (typeof parts === "string") return parts;
          let next = appendMovements(s, buildMovements(s, actor, {
            type: "RECEIVE", rewardId: input.rewardId, variantId: input.variantId, locationId: input.locationId,
            supplierId: input.supplierId || undefined, source: input.source, unitCost: input.unitCost,
            reference: input.reference.trim() || undefined,
            reason: input.note.trim() || (input.source === "DONATION" ? "Partner donation" : "Purchase receipt"),
          }, parts, 1));
          next = { ...next, logs: staffLog(next, actor, "STOCK_RECEIVED", `Received ${describeLine(s, input, input.qty)} at ${locationName(s, input.locationId)}`) };
          return settleStock(next);
        }),
      adjustStock: (actorId, input) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          if (!input.reason.trim()) return "A reason is required for manual adjustments.";
          const checked = checkLine(s, input, input.direction === "in");
          if (typeof checked === "string") return checked;
          const levels = computeLevels(s.stockMovements);
          const parts = input.direction === "in"
            ? resolveIn(s, levels, checked.item, input)
            : resolveOut(levels.find((l) => l.key === levelKey(input.rewardId, input.variantId, input.locationId)), checked.item, input, "available");
          if (typeof parts === "string") return parts;
          let next = appendMovements(s, buildMovements(s, actor, {
            type: "ADJUST", rewardId: input.rewardId, variantId: input.variantId, locationId: input.locationId, reason: input.reason.trim(),
          }, parts, input.direction === "in" ? 1 : -1));
          next = { ...next, logs: staffLog(next, actor, "STOCK_ADJUSTED", `${input.direction === "in" ? "+" : "−"}${describeLine(s, input, input.qty)} at ${locationName(s, input.locationId)}: ${input.reason.trim()}`) };
          return settleStock(next);
        }),
      transferStock: (actorId, input) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          const checked = checkLine(s, input, false);
          if (typeof checked === "string") return checked;
          const to = s.stockLocations.find((l) => l.id === input.toLocationId);
          if (!to || !to.active) return "Choose an active destination.";
          if (to.id === input.locationId) return "Choose a different destination.";
          const parts = resolveOut(computeLevels(s.stockMovements).find((l) => l.key === levelKey(input.rewardId, input.variantId, input.locationId)), checked.item, input, "available");
          if (typeof parts === "string") return parts;
          const reference = `TRF-${uid().slice(0, 8).toUpperCase()}`;
          const reason = input.note.trim() || `Transfer to ${to.name}`;
          const base = { rewardId: input.rewardId, variantId: input.variantId, reference, reason };
          let next = appendMovements(s, [
            ...buildMovements(s, actor, { ...base, type: "TRANSFER_OUT", locationId: input.locationId }, parts, -1),
            ...buildMovements(s, actor, { ...base, type: "TRANSFER_IN", locationId: to.id }, parts, 1),
          ]);
          next = { ...next, logs: staffLog(next, actor, "STOCK_TRANSFERRED", `Moved ${describeLine(s, input, input.qty)} from ${locationName(s, input.locationId)} to ${to.name} (${reference})`) };
          return settleStock(next);
        }),
      writeOffStock: (actorId, input) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          if (!input.reason.trim()) return "A reason is required for write-offs.";
          if (!["DAMAGE", "LOSS", "EXPIRY"].includes(input.kind)) return "Choose a write-off type.";
          const checked = checkLine(s, input, false);
          if (typeof checked === "string") return checked;
          const parts = resolveOut(computeLevels(s.stockMovements).find((l) => l.key === levelKey(input.rewardId, input.variantId, input.locationId)), checked.item, input, input.kind === "EXPIRY" ? "expired" : "available");
          if (typeof parts === "string") return parts;
          const next = appendMovements(s, buildMovements(s, actor, {
            type: input.kind, rewardId: input.rewardId, variantId: input.variantId, locationId: input.locationId, reason: input.reason.trim(),
          }, parts, -1));
          return { ...next, logs: staffLog(next, actor, "STOCK_WRITTEN_OFF", `${input.kind.toLowerCase()} write-off of ${describeLine(s, input, input.qty)} at ${locationName(s, input.locationId)}: ${input.reason.trim()}`) };
        }),
      returnStock: (actorId, input) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          if (!input.reason.trim()) return "A reason is required for returns.";
          const redemption = input.redemptionId ? s.redemptions.find((r) => r.id === input.redemptionId) : undefined;
          if (input.redemptionId && redemption?.status !== "FULFILLED") return "Only fulfilled redemptions can be returned.";
          if (input.refundPoints && (!redemption || stockAuthorityRank[authorityFor(s, actor.role)] < stockAuthorityRank.manager))
            return "Refunding points needs stock manager authority and a linked redemption.";
          const line: StockLineInput = redemption
            ? { rewardId: redemption.rewardId, variantId: redemption.variantId, locationId: input.locationId, qty: 1,
                batch: redemption.batch ?? input.batch, serials: redemption.serial ? [redemption.serial] : input.serials }
            : input;
          const checked = checkLine(s, line, true);
          if (typeof checked === "string") return checked;
          const parts = resolveIn(s, computeLevels(s.stockMovements), checked.item, line);
          if (typeof parts === "string") return parts;
          let next = appendMovements(s, buildMovements(s, actor, {
            type: "RETURN", rewardId: line.rewardId, variantId: line.variantId, locationId: line.locationId,
            reference: redemption?.id, reason: input.reason.trim(),
          }, parts, 1));
          if (redemption) {
            if (input.refundPoints) next = refundPoints(next, redemption, "Returned to stock");
            next = { ...next, redemptions: next.redemptions.map((r) => r.id === redemption.id ? { ...r, status: "RETURNED", closedAt: now(), closeReason: input.reason.trim() } : r) };
          }
          next = { ...next, logs: staffLog(next, actor, "STOCK_RETURNED", `Returned ${describeLine(s, line, line.qty)} to ${locationName(s, line.locationId)}${redemption ? ` from redemption by ${s.customers.find((c) => c.id === redemption.userId)?.name ?? redemption.userId}` : ""}`) };
          return settleStock(next);
        }),
      fulfillRedemption: (actorId, id, method, serial) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          const redemption = s.redemptions.find((r) => r.id === id);
          if (!redemption || redemption.status !== "RESERVED" || !redemption.locationId)
            return "Only reserved redemptions can be fulfilled.";
          const line = { rewardId: redemption.rewardId, variantId: redemption.variantId, locationId: redemption.locationId, qty: 1, serials: serial ? [serial] : [] };
          const parts = resolveOut(computeLevels(s.stockMovements).find((l) => l.key === levelKey(line.rewardId, line.variantId, line.locationId)), stockItemOf(s, line.rewardId), line, "reserved");
          if (typeof parts === "string") return parts;
          const next = appendMovements(s, buildMovements(s, actor, {
            type: "FULFILL", ...line, reference: redemption.id, reason: method === "SHIPPED" ? "Shipped to customer" : "Picked up by customer",
          }, parts, -1, -1));
          const customer = s.customers.find((c) => c.id === redemption.userId)?.name ?? redemption.userId;
          return {
            ...next,
            redemptions: next.redemptions.map((r) => r.id === id
              ? { ...r, status: "FULFILLED", fulfilledAt: now(), fulfillment: method, batch: parts[0].batch, serial: parts[0].serials?.[0] }
              : r),
            logs: staffLog(next, actor, "REDEMPTION_FULFILLED", `${method === "SHIPPED" ? "Shipped" : "Handed over"} ${redemption.rewardName} to ${customer}`),
          };
        }),
      cancelRedemption: (actorId, id, reason) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          if (!reason.trim()) return "A reason is required to cancel a redemption.";
          const redemption = s.redemptions.find((r) => r.id === id);
          if (!redemption || (redemption.status !== "RESERVED" && redemption.status !== "BACKORDERED"))
            return "Only reserved or backordered redemptions can be cancelled.";
          const next = closeRedemption(s, redemption, "CANCELLED", reason.trim(), actor);
          return settleStock({ ...next, logs: staffLog(next, actor, "REDEMPTION_CANCELLED", `Cancelled ${redemption.rewardName}: ${reason.trim()}`) });
        }),
      extendReservation: (actorId, id, hours) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          if (!Number.isInteger(hours) || hours < 1 || hours > 168) return "Extend by 1 to 168 hours.";
          const redemption = s.redemptions.find((r) => r.id === id);
          if (!redemption || redemption.status !== "RESERVED") return "Only reserved redemptions can be extended.";
          const from = Math.max(Date.now(), new Date(redemption.reservedUntil ?? 0).getTime());
          const reservedUntil = new Date(from + hours * 3600000).toISOString();
          return {
            ...s,
            redemptions: s.redemptions.map((r) => r.id === id ? { ...r, reservedUntil } : r),
            logs: staffLog(s, actor, "RESERVATION_EXTENDED", `Extended ${redemption.rewardName} reservation by ${hours}h`),
          };
        }),
      saveStockItem: (actorId, item) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          const reward = s.rewards.find((r) => r.id === item.rewardId);
          if (!reward) return "Reward not found.";
          const sku = item.sku.trim().toUpperCase();
          if (!sku) return "Enter a SKU.";
          if (Object.values(s.stockItems).some((other) => other.rewardId !== item.rewardId && s.rewards.some((r) => r.id === other.rewardId) && other.sku.toUpperCase() === sku))
            return "Another reward already uses that SKU.";
          if (!Number.isFinite(item.unitCost) || item.unitCost < 0) return "Enter a unit cost of zero or more.";
          if (![item.lowStockThreshold, item.reorderPoint].every((n) => Number.isInteger(n) && n >= 0) || !Number.isInteger(item.reorderQty) || item.reorderQty < 1)
            return "Thresholds must be whole numbers, and reorder quantity at least 1.";
          if (item.supplierId && !s.suppliers.some((x) => x.id === item.supplierId)) return "Choose a valid supplier.";
          const variants = item.variants.map((v, index) => ({
            id: v.id, size: v.size.trim(), color: v.color.trim(), sku: v.sku.trim().toUpperCase() || `${sku}-${index + 1}`,
          }));
          if (variants.some((v) => !v.size && !v.color)) return "Each variant needs a size or colour.";
          if (new Set(variants.map((v) => v.id)).size !== variants.length || new Set(variants.map((v) => v.sku)).size !== variants.length)
            return "Variant SKUs must be unique.";
          const old = stockItemOf(s, item.rewardId);
          const levels = computeLevels(s.stockMovements).filter((l) => l.rewardId === item.rewardId);
          const held = (variantId: string) =>
            levels.some((l) => l.variantId === variantId && (l.onHand !== 0 || l.reserved !== 0)) ||
            s.redemptions.some((r) => r.rewardId === item.rewardId && r.variantId === variantId && (r.status === "RESERVED" || r.status === "BACKORDERED"));
          const kept = variantIds({ ...old, variants });
          const dropped = variantIds(old).find((id) => !kept.includes(id) && held(id));
          if (dropped !== undefined)
            return `${variantLabel(old, dropped)} still has stock or open redemptions. Move it to zero first.`;
          if (item.tracking !== old.tracking && levels.some((l) => l.onHand !== 0 || l.reserved !== 0))
            return "Tracking can only change while the item has no stock on hand or reserved.";
          const saved: StockItem = { ...item, sku, variants };
          return settleStock({
            ...s,
            stockItems: { ...s.stockItems, [item.rewardId]: saved },
            logs: staffLog(s, actor, "STOCK_ITEM_UPDATED", `Updated stock settings for ${reward.name} [${sku}]`),
          });
        }),
      saveStockLocation: (actorId, location) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          const name = location.name.trim();
          if (!name) return "Enter a location name.";
          if (!["warehouse", "store", "pickup"].includes(location.type)) return "Choose a location type.";
          const existing = s.stockLocations.find((l) => l.id === location.id);
          if (existing?.active && !location.active) {
            const totals = totalsFor(computeLevels(s.stockMovements), { locationId: location.id });
            if (totals.onHand || totals.reserved) return "Transfer or write off this location's stock before deactivating it.";
            if (s.stockLocations.filter((l) => l.active).length < 2) return "Keep at least one active location.";
          }
          const saved: StockLocation = { ...location, id: location.id || `loc-${uid().slice(0, 8)}`, name, nameKh: location.nameKh.trim() };
          return settleStock({
            ...s,
            stockLocations: existing ? s.stockLocations.map((l) => l.id === saved.id ? saved : l) : [...s.stockLocations, saved],
            logs: staffLog(s, actor, existing ? "LOCATION_UPDATED" : "LOCATION_CREATED", `${existing ? "Updated" : "Created"} stock location ${name}`),
          });
        }),
      saveSupplier: (actorId, supplier) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          const name = supplier.name.trim();
          const email = supplier.email.trim();
          if (!name) return "Enter a supplier or partner name.";
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
          const existing = s.suppliers.some((x) => x.id === supplier.id);
          const saved: Supplier = { ...supplier, id: supplier.id || `sup-${uid().slice(0, 8)}`, name, email, contact: supplier.contact.trim(), phone: supplier.phone.trim() };
          return {
            ...s,
            suppliers: existing ? s.suppliers.map((x) => x.id === saved.id ? saved : x) : [...s.suppliers, saved],
            logs: staffLog(s, actor, existing ? "SUPPLIER_UPDATED" : "SUPPLIER_CREATED", `${existing ? "Updated" : "Added"} ${saved.kind} ${name}`),
          };
        }),
      saveStockSettings: (actorId, settings) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "admin");
          if (typeof actor === "string") return actor;
          if (!Number.isInteger(settings.reservationHours) || settings.reservationHours < 1 || settings.reservationHours > 720)
            return "Reservation timeout must be 1 to 720 hours.";
          return {
            ...s,
            stockSettings: { ...s.stockSettings, reservationHours: settings.reservationHours },
            logs: staffLog(s, actor, "STOCK_SETTINGS_UPDATED", `Reservation timeout set to ${settings.reservationHours}h`),
          };
        }),
      createStocktake: (actorId, locationId, category, note) => {
        let id = "";
        const error = commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          const location = s.stockLocations.find((l) => l.id === locationId);
          if (!location?.active) return "Choose an active location.";
          if (s.stocktakes.some((t) => t.locationId === locationId && t.status === "OPEN"))
            return `${location.name} already has an open stocktake.`;
          const levels = computeLevels(s.stockMovements).filter((l) => l.locationId === locationId);
          const lines: StocktakeLine[] = [];
          for (const reward of s.rewards.filter((r) => !category || r.category === category)) {
            const item = stockItemOf(s, reward.id);
            for (const variantId of variantIds(item)) {
              const level = levels.find((l) => l.rewardId === reward.id && l.variantId === variantId);
              const base = { rewardId: reward.id, variantId, counted: null };
              if (item.tracking === "batch")
                for (const b of level?.batches ?? []) lines.push({ ...base, batch: b.batch, expected: b.onHand });
              else if (item.tracking === "serial")
                for (const serial of level?.serials ?? []) lines.push({ ...base, batch: "", serial, expected: 1 });
              else if (level || reward.active) lines.push({ ...base, batch: "", expected: level?.onHand ?? 0 });
            }
          }
          if (!lines.length) return "Nothing to count at this location for that category.";
          id = `ST-${uid().slice(0, 6).toUpperCase()}`;
          return {
            ...s,
            stocktakes: [{ id, locationId, category, status: "OPEN", note: note.trim(), createdAt: now(), createdBy: actor.name, lines }, ...s.stocktakes],
            logs: staffLog(s, actor, "STOCKTAKE_STARTED", `Started stocktake ${id} at ${location.name}${category ? ` (${category})` : ""}`),
          };
        });
        return error ? { error } : { id };
      },
      recordCount: (actorId, stocktakeId, index, counted) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "clerk");
          if (typeof actor === "string") return actor;
          const take = s.stocktakes.find((t) => t.id === stocktakeId);
          if (!take || take.status !== "OPEN") return "This stocktake is closed.";
          const line = take.lines[index];
          if (!line) return "Count line not found.";
          if (counted !== null && (!Number.isInteger(counted) || counted < 0 || counted > 100000 || (line.serial && counted > 1)))
            return line.serial ? "Serial lines are counted as 0 or 1." : "Enter a whole count of zero or more.";
          return {
            ...s,
            stocktakes: s.stocktakes.map((t) => t.id === stocktakeId
              ? { ...t, lines: t.lines.map((l, i) => i === index ? { ...l, counted } : l) }
              : t),
          };
        }),
      postStocktake: (actorId, id) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          const take = s.stocktakes.find((t) => t.id === id);
          if (!take || take.status !== "OPEN") return "Only open stocktakes can be posted.";
          if (take.lines.some((l) => l.counted === null)) return "Count every line before posting.";
          const levels = computeLevels(s.stockMovements);
          const movements: StockMovement[] = [];
          const lines: StocktakeLine[] = [];
          for (const line of take.lines) {
            const level = levels.find((l) => l.key === levelKey(line.rewardId, line.variantId, take.locationId));
            const system = line.serial
              ? (level?.serials.includes(line.serial) ? 1 : 0)
              : line.batch
                ? (level?.batches.find((b) => b.batch === line.batch)?.onHand ?? 0)
                : (level?.onHand ?? 0);
            lines.push({ ...line, systemAtPost: system });
            const variance = (line.counted ?? 0) - system;
            if (!variance) continue;
            if (line.serial && variance > 0 && levels.some((l) => l.rewardId === line.rewardId && l.serials.includes(line.serial!)))
              return `Serial ${line.serial} is recorded at another location. Transfer it instead.`;
            movements.push(...buildMovements(s, actor, {
              type: "COUNT", rewardId: line.rewardId, variantId: line.variantId, locationId: take.locationId,
              reference: take.id, reason: `Stocktake ${take.id} variance`,
            }, [{ qty: Math.abs(variance), batch: line.batch || undefined, serials: line.serial ? [line.serial] : undefined }], variance > 0 ? 1 : -1));
          }
          const units = movements.reduce((sum, m) => sum + m.onHand, 0);
          const next = appendMovements(s, movements);
          return settleStock({
            ...next,
            stocktakes: next.stocktakes.map((t) => t.id === id ? { ...t, status: "POSTED", postedAt: now(), postedBy: actor.name, lines } : t),
            logs: staffLog(next, actor, "STOCKTAKE_POSTED", `Posted stocktake ${id}: ${movements.length} variance line${movements.length === 1 ? "" : "s"}, net ${units > 0 ? "+" : ""}${units} units`),
          });
        }),
      cancelStocktake: (actorId, id) =>
        commit((s) => {
          const actor = stockActor(s, actorId, "manager");
          if (typeof actor === "string") return actor;
          const take = s.stocktakes.find((t) => t.id === id);
          if (!take || take.status !== "OPEN") return "Only open stocktakes can be cancelled.";
          return {
            ...s,
            stocktakes: s.stocktakes.map((t) => t.id === id ? { ...t, status: "CANCELLED" } : t),
            logs: staffLog(s, actor, "STOCKTAKE_CANCELLED", `Cancelled stocktake ${id}`),
          };
        }),
      adjustPoints: (userId, amount, reason) => {
        const user = state.customers.find((c) => c.id === userId);
        if (
          !user ||
          !Number.isInteger(amount) ||
          amount === 0 ||
          !reason.trim()
        )
          return "Choose a customer, whole point amount, and reason.";
        if (user.points + amount < 0)
          return "Adjustment would make the balance negative.";
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            c.id === userId ? { ...c, points: c.points + amount } : c,
          ),
          transactions: [
            {
              id: uid(),
              userId,
              userName: user.name,
              type: "ADJUST",
              points: amount,
              balanceBefore: user.points,
              balanceAfter: user.points + amount,
              reason: `Manual adjustment: ${reason.trim()}`,
              createdAt: date(),
            },
            ...s.transactions,
          ],
          logs: log(
            s,
            user,
            "POINTS_ADJUSTED",
            `${amount > 0 ? "+" : ""}${amount} points: ${reason.trim()}`,
          ),
        }));
        return null;
      },
      syncCatalog: (categories, products, stock = {}) =>
        setState((s) => {
          // Stock is not in the API: keep the store's count, matching by id, then by name for seeded products.
          const byId = new Map(s.products.map((p) => [p.id, p.stock]));
          const byName = new Map(s.products.map((p) => [p.name.toLowerCase(), p.stock]));
          const next = products.map((p) => ({
            ...p,
            stock: stock[p.id] ?? byId.get(p.id) ?? byName.get(p.name.toLowerCase()) ?? 0,
          }));
          const ids = new Set(next.map((p) => p.id));
          return { ...s, categories, products: next, cart: s.cart.filter((c) => ids.has(c.productId)) };
        }),
      logStaffAction: (actorId, event, description) =>
        setState((s) => {
          const actor = s.adminUsers.find((user) => user.id === actorId);
          return actor ? { ...s, logs: staffLog(s, actor, event, description) } : s;
        }),
      saveReward: (reward) =>
        setState((s) => ({
          ...s,
          rewards: s.rewards.some((r) => r.id === reward.id)
            ? s.rewards.map((r) => (r.id === reward.id ? reward : r))
            : [reward, ...s.rewards],
          stockItems: s.stockItems[reward.id] ? s.stockItems : { ...s.stockItems, [reward.id]: defaultStockItem(reward) },
        })),
      deleteReward: (id) =>
        commit((s) => {
          const totals = totalsFor(computeLevels(s.stockMovements), { rewardId: id });
          if (totals.onHand || totals.reserved) return "Write off or transfer this reward's stock to zero before deleting it.";
          if (s.redemptions.some((r) => r.rewardId === id && (r.status === "RESERVED" || r.status === "BACKORDERED")))
            return "This reward has open redemptions. Fulfil or cancel them first.";
          return {
            ...s,
            rewards: s.rewards.filter((r) => r.id !== id),
            restockRequests: s.restockRequests.filter((r) => r.rewardId !== id),
          };
        }),
      saveTier: (tier, rule) =>
        setState((s) => {
          const tiers = { ...s.tiers, [tier]: rule };
          const updated = s.customers.map((c) => ({
            ...c,
            tier:
              s.tierOverrides[c.id] ??
              tierFor(s.qualifyingPoints[c.id] ?? c.points, tiers),
          }));
          const changes = updated
            .filter((c, i) => c.tier !== s.customers[i].tier)
            .map((c, i) => ({
              id: uid(),
              userId: c.id,
              from: s.customers.find((old) => old.id === c.id)!.tier,
              to: c.tier,
              reason: "Tier rule updated",
              createdAt: date(),
            }));
          return {
            ...s,
            tiers,
            customers: updated,
            tierHistory: [...changes, ...s.tierHistory],
          };
        }),
      overrideTier: (userId, tier, reason) =>
        setState((s) => {
          const user = s.customers.find((c) => c.id === userId);
          if (!user || !reason.trim()) return s;
          const nextTier =
            tier ?? tierFor(s.qualifyingPoints[userId] ?? user.points, s.tiers);
          return {
            ...s,
            tierOverrides: { ...s.tierOverrides, [userId]: tier },
            customers: s.customers.map((c) =>
              c.id === userId ? { ...c, tier: nextTier } : c,
            ),
            tierHistory:
              user.tier === nextTier
                ? s.tierHistory
                : [
                    {
                      id: uid(),
                      userId,
                      from: user.tier,
                      to: nextTier,
                      reason: reason.trim(),
                      createdAt: date(),
                    },
                    ...s.tierHistory,
                  ],
            logs: log(
              s,
              user,
              "TIER_CHANGED",
              `${user.tier} → ${nextTier}: ${reason.trim()}`,
            ),
          };
        }),
      saveBadge: (badge) =>
        setState((s) => ({
          ...s,
          badges: s.badges.some((b) => b.id === badge.id)
            ? s.badges.map((b) => (b.id === badge.id ? badge : b))
            : [badge, ...s.badges],
        })),
      deleteBadge: (id) =>
        setState((s) => ({
          ...s,
          badges: s.badges.filter((b) => b.id !== id),
        })),
      saveCampaign: (campaign) =>
        setState((s) => ({
          ...s,
          campaigns: s.campaigns.some((c) => c.id === campaign.id)
            ? s.campaigns.map((c) => (c.id === campaign.id ? campaign : c))
            : [campaign, ...s.campaigns],
        })),
      deleteCampaign: (id) =>
        setState((s) => ({
          ...s,
          campaigns: s.campaigns.filter((c) => c.id !== id),
        })),
      updateProfile: (fields) =>
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            c.id === s.currentUserId ? { ...c, ...fields } : c,
          ),
        })),
      registerCustomer: (fields) => {
        if (
          !fields.name.trim() ||
          !fields.email.includes("@") ||
          !/^\+?\d[\d\s-]{7,14}$/.test(fields.phone) ||
          !fields.province
        )
          return { error: "Complete all fields with a valid email and phone." };
        if (
          state.customers.some(
            (c) => c.email.toLowerCase() === fields.email.toLowerCase(),
          )
        )
          return { error: "This email is already in the demo." };
        const referrer = state.customers.find(
          (c) =>
            c.referralCode.toLowerCase() ===
            fields.referralCode.trim().toLowerCase(),
        );
        if (fields.referralCode.trim() && !referrer)
          return { error: "Referral code was not found." };
        const id = uid();
        const user: Customer = {
          id,
          name: fields.name.trim(),
          nameKh: "",
          email: fields.email.trim(),
          phone: fields.phone.trim(),
          province: fields.province,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fields.name)}&background=262a36&color=e8a634`,
          tier: "Silver",
          points: 0,
          totalSpent: 0,
          joinedAt: date(),
          lastOrder: "",
          referralCode: `KHMER-${fields.name.trim().split(" ")[0].toUpperCase()}-${id.slice(0, 4).toUpperCase()}`,
          badges: [],
          ordersCount: 0,
        };
        setState((s) => ({
          ...s,
          customers: [user, ...s.customers],
          currentUserId: id,
          cart: [],
          qualifyingPoints: { ...s.qualifyingPoints, [id]: 0 },
          referrals: referrer
            ? [
                {
                  id: uid(),
                  referrerId: referrer.id,
                  customerId: id,
                  completed: false,
                  createdAt: date(),
                },
                ...s.referrals,
              ]
            : s.referrals,
          logs: log(
            s,
            user,
            "USER_REGISTER",
            `New demo customer registered${referrer ? ` using ${referrer.referralCode}` : ""}`,
          ),
        }));
        return { userId: id };
      },
      selectCustomer: (id) =>
        setState((s) =>
          s.customers.some((c) => c.id === id)
            ? { ...s, currentUserId: id, cart: [] }
            : s,
        ),
      recordLogin: (userId, adminUserId) => setState((s) => {
        const user = userId ? s.customers.find((customer) => customer.id === userId) : null;
        const admin = adminUserId ? s.adminUsers.find((item) => item.id === adminUserId) : null;
        const entry: LogEntry = {
          id: uid(), userId: user?.id ?? admin?.id ?? "admin", userName: user?.name ?? admin?.name ?? "Demo Admin",
          event: "USER_LOGIN", description: user ? "Customer signed in" : "Admin signed in",
          timestamp: now().replace("T", " ").slice(0, 16),
        };
        return { ...s, logs: [entry, ...s.logs] };
      }),
      linkApiCustomer: (profile) => {
        const email = profile.email.trim().toLowerCase();
        const existing = state.customers.find((c) => c.email.toLowerCase() === email);
        if (existing) return existing.id;
        // A stable id keeps repeated calls from adding the same account twice.
        const id = `api-customer-${profile.id}`;
        const points = Math.max(0, Math.floor(profile.points_balance ?? 0));
        setState((s) => {
          if (s.customers.some((c) => c.id === id || c.email.toLowerCase() === email)) return s;
          const user: Customer = {
            id,
            name: profile.name,
            nameKh: "",
            email,
            phone: profile.phone ?? "",
            province: "",
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=262a36&color=e8a634`,
            tier: tierFor(points, s.tiers),
            points,
            totalSpent: 0,
            joinedAt: date(),
            lastOrder: "",
            referralCode: `KHMER-${profile.name.trim().split(" ")[0].toUpperCase()}-${String(profile.id).padStart(4, "0")}`,
            badges: [],
            ordersCount: 0,
          };
          return {
            ...s,
            customers: [user, ...s.customers],
            qualifyingPoints: { ...s.qualifyingPoints, [id]: points },
            logs: log(s, user, "API_ACCOUNT_LINKED", "Customer account linked from the API"),
          };
        });
        return id;
      },
      linkApiAdmin: (profile) => {
        const user = toAdminUser(profile);
        const role = profile.role;
        setState((s) => ({
          ...s,
          // Replace any earlier copy of this account, including a demo user with the same email.
          adminUsers: [...s.adminUsers.filter((u) => u.id !== user.id && u.email.toLowerCase() !== user.email), user],
          ...(role && {
            roleLabels: { ...s.roleLabels, [role.code]: role.label },
            rolePermissions: { ...s.rolePermissions, [role.code]: toAdminPages(profile.pages ?? []) },
            stockAuthority: role.stock_authority ? { ...s.stockAuthority, [role.code]: role.stock_authority } : s.stockAuthority,
          }),
        }));
        return user.id;
      },
    }),
    [state, currentUser, storefrontProducts, stockLevels, commit, setState],
  );
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("ShopProvider is missing");
  return shop;
}
