export type AdminPage =
  | "dashboard" | "analytics" | "customers" | "products" | "orders"
  | "points" | "tiers" | "campaigns" | "rewards" | "badges"
  | "referrals" | "logs" | "exchange-rate" | "users" | "roles" | "profile";

export type AdminRole = "super_admin" | "marketing_manager" | "loyalty_manager";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
};

export const adminPageLabels: Record<AdminPage, string> = {
  dashboard: "Dashboard", analytics: "Analytics", customers: "Customers",
  products: "Products", orders: "Orders", points: "Points", tiers: "Tiers",
  campaigns: "Campaigns", rewards: "Rewards", badges: "Badges",
  referrals: "Referrals", logs: "Activity Logs", "exchange-rate": "Exchange Rate",
  users: "User Management",
  roles: "Role Permissions", profile: "My Profile",
};

export const adminRoleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  marketing_manager: "Marketing Manager",
  loyalty_manager: "Loyalty Program Manager",
};

export const adminPages = Object.keys(adminPageLabels) as AdminPage[];

export const defaultRolePermissions: Record<AdminRole, AdminPage[]> = {
  super_admin: adminPages,
  marketing_manager: ["dashboard", "analytics", "products", "campaigns", "rewards", "profile"],
  loyalty_manager: ["dashboard", "customers", "points", "tiers", "rewards", "badges", "referrals", "logs", "analytics", "profile"],
};

export const initialAdminUsers: AdminUser[] = [
  { id: "admin-super", name: "Demo Admin", email: "admin@khmershop.local", role: "super_admin", active: true },
];
