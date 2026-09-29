import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  products,
  rewards,
  tierConfig,
  type Badge,
  type Customer,
  type LoyaltyTransaction,
  type Order,
  type OrderStatus,
  type Product,
  type Reward,
  type Tier,
} from "./mockData";
import { extraCustomers, extraProducts } from "./seedExtras";
import {
  adminPages,
  defaultRolePermissions,
  initialAdminUsers,
  type AdminPage,
  type AdminRole,
  type AdminUser,
} from "./adminAccess";

export type CartItem = { productId: string; qty: number };
export type Redemption = {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  points: number;
  createdAt: string;
};
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
  rolePermissions: Record<AdminRole, AdminPage[]>;
  disabledCustomerIds: string[];
  customers: Customer[];
  products: Product[];
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
};

const initial: State = {
  adminUsers: initialAdminUsers,
  rolePermissions: defaultRolePermissions,
  disabledCustomerIds: [],
  customers: [...customers, ...extraCustomers],
  products: [...products, ...extraProducts],
  orders,
  transactions: loyaltyTransactions,
  rewards,
  badges,
  logs: activityLog,
  redemptions: [],
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
};
const key = "khmershop-frontend-v1";
function restoreState(saved: string | null): State {
  if (!saved) return initial;
  try {
    const parsed = JSON.parse(saved) as Partial<State>;
    const tiers = { ...initial.tiers, ...parsed.tiers };
    tiers.Platinum = { ...tiers.Platinum, max: Infinity };
    return {
      ...initial, ...parsed, tiers,
      exchangeRate: typeof parsed.exchangeRate === "number" && Number.isSafeInteger(parsed.exchangeRate) && parsed.exchangeRate > 0 && parsed.exchangeRate <= 1_000_000_000
        ? parsed.exchangeRate
        : initial.exchangeRate,
      adminUsers: parsed.adminUsers?.length ? parsed.adminUsers : initial.adminUsers,
      disabledCustomerIds: parsed.disabledCustomerIds ?? [],
      rolePermissions: {
        ...initial.rolePermissions,
        ...parsed.rolePermissions,
        marketing_manager: [...new Set([...(parsed.rolePermissions?.marketing_manager ?? initial.rolePermissions.marketing_manager), "profile" as AdminPage])],
        loyalty_manager: [...new Set([...(parsed.rolePermissions?.loyalty_manager ?? initial.rolePermissions.loyalty_manager), "profile" as AdminPage])],
        super_admin: adminPages,
      },
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

type Shop = State & {
  saveAdminUser: (actorId: string, user: Omit<AdminUser, "id"> & { id?: string }) => string | null;
  setAdminUserActive: (actorId: string, userId: string, active: boolean) => string | null;
  setCustomerActive: (actorId: string, userId: string, active: boolean) => string | null;
  saveRolePermissions: (actorId: string, role: AdminRole, pages: AdminPage[]) => string | null;
  updateAdminProfile: (userId: string, fields: Pick<AdminUser, "name" | "email">) => string | null;
  currentUser: Customer;
  setCurrency: (currency: "USD" | "KHR") => void;
  saveExchangeRate: (actorId: string, rate: number) => string | null;
  money: (usd: number) => string;
  setCart: (cart: CartItem[]) => void;
  addToCart: (id: string, qty?: number) => void;
  checkout: (address: string, phone: string) => string | null;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  redeem: (id: string) => string | null;
  adjustPoints: (
    userId: string,
    amount: number,
    reason: string,
  ) => string | null;
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  saveReward: (reward: Reward) => void;
  deleteReward: (id: string) => void;
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
};
const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => {
    try {
      return restoreState(localStorage.getItem(key));
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key && event.newValue) setState(restoreState(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage may be unavailable */
    }
  }, [state]);
  const currentUser =
    state.customers.find((c) => c.id === state.currentUserId) ??
    state.customers[0];

  const shop = useMemo<Shop>(
    () => ({
      ...state,
      currentUser,
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
      saveAdminUser: (actorId, user) => {
        const actor = state.adminUsers.find((item) => item.id === actorId && item.active);
        if (actor?.role !== "super_admin") return "Only Super Admin can manage users.";
        const name = user.name.trim();
        const email = user.email.trim().toLowerCase();
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return "Enter a name and valid email address.";
        if (!["super_admin", "marketing_manager", "loyalty_manager"].includes(user.role))
          return "Choose a valid staff role.";
        if (state.adminUsers.some((item) => item.email.toLowerCase() === email && item.id !== user.id))
          return "An admin user already has that email address.";
        const existing = state.adminUsers.find((item) => item.id === user.id);
        if (existing?.id === "admin-super" && (user.role !== "super_admin" || !user.active))
          return "The primary Super Admin must stay active.";
        const saved: AdminUser = { id: user.id || uid(), name, email, role: user.role, active: user.active };
        setState((s) => ({
          ...s,
          adminUsers: existing
            ? s.adminUsers.map((item) => item.id === saved.id ? saved : item)
            : [...s.adminUsers, saved],
          logs: [{ id: uid(), userId: actor.id, userName: actor.name, event: existing ? "ADMIN_USER_UPDATED" : "ADMIN_USER_CREATED", description: `${existing ? "Updated" : "Created"} staff user ${saved.email} (${saved.role})`, timestamp: now().replace("T", " ").slice(0, 16) }, ...s.logs],
        }));
        return null;
      },
      setAdminUserActive: (actorId, userId, active) => {
        const actor = state.adminUsers.find((item) => item.id === actorId && item.active);
        if (actor?.role !== "super_admin") return "Only Super Admin can manage users.";
        if (userId === "admin-super" && !active) return "The primary Super Admin must stay active.";
        if (userId === actorId && !active) return "You cannot disable your own account.";
        if (!state.adminUsers.some((item) => item.id === userId)) return "User not found.";
        setState((s) => ({ ...s, adminUsers: s.adminUsers.map((item) => item.id === userId ? { ...item, active } : item), logs: [{ id: uid(), userId: actor.id, userName: actor.name, event: "ADMIN_USER_STATUS", description: `${active ? "Enabled" : "Disabled"} staff user ${userId}`, timestamp: now().replace("T", " ").slice(0, 16) }, ...s.logs] }));
        return null;
      },
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
      saveRolePermissions: (actorId, role, pages) => {
        const actor = state.adminUsers.find((item) => item.id === actorId && item.active);
        if (actor?.role !== "super_admin") return "Only Super Admin can change permissions.";
        if (role === "super_admin") return "Super Admin always has full access.";
        const allowed = adminPages.filter((page) => page !== "users" && page !== "roles" && page !== "profile" && page !== "exchange-rate" && pages.includes(page));
        if (!allowed.length) return "Select at least one section for this role.";
        allowed.push("profile");
        setState((s) => ({ ...s, rolePermissions: { ...s.rolePermissions, [role]: allowed }, logs: [{ id: uid(), userId: actor.id, userName: actor.name, event: "ROLE_PERMISSIONS_UPDATED", description: `Updated ${role} permissions: ${allowed.join(", ")}`, timestamp: now().replace("T", " ").slice(0, 16) }, ...s.logs] }));
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
      redeem: (id) => {
        const reward = state.rewards.find((r) => r.id === id);
        if (
          !reward ||
          !reward.active ||
          (reward.expiresAt && reward.expiresAt < date())
        )
          return "Reward unavailable.";
        if (reward.stock < 1) return "Reward is out of stock.";
        if (
          state.redemptions.some(
            (r) => r.userId === currentUser.id && r.rewardId === id,
          )
        )
          return "You already redeemed this reward.";
        if (currentUser.points < reward.pointsCost)
          return "Insufficient points.";
        if (state.tiers[currentUser.tier].min < state.tiers[reward.minTier].min)
          return `Requires ${reward.minTier} tier.`;
        setState((s) => {
          const user = s.customers.find((c) => c.id === currentUser.id)!;
          const target = s.rewards.find((r) => r.id === id);
          if (
            !target ||
            !target.active ||
            (target.expiresAt && target.expiresAt < date()) ||
            target.stock < 1 ||
            user.points < target.pointsCost ||
            s.tiers[user.tier].min < s.tiers[target.minTier].min ||
            s.redemptions.some((r) => r.userId === user.id && r.rewardId === id)
          )
            return s;
          return {
            ...s,
            customers: s.customers.map((c) =>
              c.id === user.id
                ? { ...c, points: c.points - target.pointsCost }
                : c,
            ),
            rewards: s.rewards.map((r) =>
              r.id === id ? { ...r, stock: r.stock - 1 } : r,
            ),
            transactions: [
              {
                id: uid(),
                userId: user.id,
                userName: user.name,
                type: "SPEND",
                points: -target.pointsCost,
                balanceBefore: user.points,
                balanceAfter: user.points - target.pointsCost,
                reason: `Redeemed: ${target.name}`,
                createdAt: date(),
              },
              ...s.transactions,
            ],
            redemptions: [
              {
                id: uid(),
                userId: user.id,
                rewardId: id,
                rewardName: target.name,
                points: target.pointsCost,
                createdAt: date(),
              },
              ...s.redemptions,
            ],
            logs: log(
              s,
              user,
              "REWARD_REDEEMED",
              `Redeemed ${target.name} for ${target.pointsCost} points`,
            ),
          };
        });
        return null;
      },
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
      saveProduct: (product) =>
        setState((s) => ({
          ...s,
          products: s.products.some((p) => p.id === product.id)
            ? s.products.map((p) => (p.id === product.id ? product : p))
            : [product, ...s.products],
        })),
      deleteProduct: (id) =>
        setState((s) => ({
          ...s,
          products: s.products.filter((p) => p.id !== id),
          cart: s.cart.filter((c) => c.productId !== id),
        })),
      saveReward: (reward) =>
        setState((s) => ({
          ...s,
          rewards: s.rewards.some((r) => r.id === reward.id)
            ? s.rewards.map((r) => (r.id === reward.id ? reward : r))
            : [reward, ...s.rewards],
        })),
      deleteReward: (id) =>
        setState((s) => ({
          ...s,
          rewards: s.rewards.filter((r) => r.id !== id),
        })),
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
    }),
    [state, currentUser],
  );
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("ShopProvider is missing");
  return shop;
}
