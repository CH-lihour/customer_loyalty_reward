export type AdminPage =
  | "dashboard" | "analytics" | "customers" | "products" | "categories" | "orders"
  | "points" | "tiers" | "campaigns" | "rewards" | "badges"
  | "referrals" | "stock-alerts" | "stock" | "stock-movements" | "fulfillment"
  | "stocktake" | "stock-reports" | "suppliers"
  | "logs" | "exchange-rate" | "users" | "roles" | "profile";

export type AdminRole = string;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
};

export const adminPageLabels: Record<AdminPage, string> = {
  dashboard: "Dashboard", analytics: "Analytics", customers: "Customers",
  products: "Products", categories: "Categories", orders: "Orders", points: "Points", tiers: "Tiers",
  campaigns: "Campaigns", rewards: "Rewards", badges: "Badges",
  referrals: "Referrals", "stock-alerts": "Low Stock", stock: "Stock Levels",
  "stock-movements": "Stock Movements", fulfillment: "Redemption Fulfilment",
  stocktake: "Stocktake", "stock-reports": "Stock Reports", suppliers: "Suppliers & Locations",
  logs: "Activity Logs", "exchange-rate": "Exchange Rate",
  users: "User Management",
  roles: "Role Permissions", profile: "My Profile",
};

export const defaultAdminRoleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  marketing_manager: "Marketing Manager",
  loyalty_manager: "Loyalty Program Manager",
  stock_manager: "Stock Manager",
  stock_clerk: "Stock Clerk",
};

export const inventoryPages: AdminPage[] = [
  "stock-alerts", "stock", "stock-movements", "fulfillment", "stocktake", "stock-reports", "suppliers",
];

export const adminPages = Object.keys(adminPageLabels) as AdminPage[];

export const defaultRolePermissions: Record<AdminRole, AdminPage[]> = {
  super_admin: adminPages,
  marketing_manager: ["dashboard", "analytics", "products", "categories", "campaigns", "rewards", "profile"],
  loyalty_manager: ["dashboard", "customers", "points", "tiers", "rewards", "badges", "referrals", "logs", "analytics", "profile"],
  stock_manager: ["dashboard", "rewards", ...inventoryPages, "profile"],
  stock_clerk: ["stock-alerts", "stock", "stock-movements", "fulfillment", "stocktake", "profile"],
};

/** Stock authority for non-Super Admin roles. Roles not listed default to clerk. */
export const defaultStockAuthority: Record<AdminRole, "clerk" | "manager"> = {
  stock_manager: "manager",
  stock_clerk: "clerk",
};

export const initialAdminUsers: AdminUser[] = [
  { id: "admin-super", name: "Demo Admin", email: "admin@khmershop.local", role: "super_admin", active: true },
  { id: "admin-stock-manager", name: "Kanha Srey", email: "stock.manager@khmershop.local", role: "stock_manager", active: true },
  { id: "admin-stock-clerk", name: "Ratanak Yim", email: "stock.clerk@khmershop.local", role: "stock_clerk", active: true },
];
