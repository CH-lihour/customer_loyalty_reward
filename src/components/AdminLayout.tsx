import { type ReactNode } from "react";
import { Icon } from "./Icon";
import { adminRoleLabels, type AdminPage, type AdminRole } from "../data/adminAccess";

export type { AdminPage } from "../data/adminAccess";

const navItems: {
  id: AdminPage;
  label: string;
  icon: string;
  group?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "◉", group: "Overview" },
  { id: "analytics", label: "Analytics", icon: "chart", group: "Overview" },
  { id: "customers", label: "Customers", icon: "users", group: "E-Commerce" },
  { id: "products", label: "Products", icon: "products", group: "E-Commerce" },
  { id: "orders", label: "Orders", icon: "orders", group: "E-Commerce" },
  { id: "points", label: "Points", icon: "star", group: "Loyalty" },
  { id: "tiers", label: "Tiers", icon: "trophy", group: "Loyalty" },
  { id: "campaigns", label: "Campaigns", icon: "tag", group: "Loyalty" },
  { id: "rewards", label: "Rewards", icon: "gift", group: "Loyalty" },
  { id: "badges", label: "Badges", icon: "medal", group: "Loyalty" },
  { id: "referrals", label: "Referrals", icon: "users", group: "Loyalty" },
  { id: "logs", label: "Activity Logs", icon: "list", group: "System" },
  { id: "exchange-rate", label: "Exchange Rate", icon: "wallet", group: "System" },
  { id: "users", label: "User Management", icon: "users", group: "System" },
  { id: "roles", label: "Role Permissions", icon: "lock", group: "System" },
  { id: "profile", label: "My Profile", icon: "user", group: "Account" },
];

interface Props {
  page: AdminPage;
  onNav: (p: AdminPage) => void;
  onLogout: () => void;
  allowedPages: AdminPage[];
  userName: string;
  userRole: AdminRole;
  children: ReactNode;
}

export function AdminLayout({ page, onNav, onLogout, allowedPages, userName, userRole, children }: Props) {
  const groups = ["Overview", "E-Commerce", "Loyalty", "System", "Account"];

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Icon name="shop" className="h-6 w-6 text-[var(--gold-mid)]" />
            <div>
              <div className="font-display text-sm font-semibold text-[var(--gold-mid)]">
                KhmerShop
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {adminRoleLabels[userRole]}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-4 pt-4">
          {groups.map((group) => {
            const items = navItems.filter((n) => n.group === group && allowedPages.includes(n.id));
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-2 mb-1">
                  {group}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium text-left transition-colors mb-0.5 ${page === item.id ? "nav-link-active" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"}`}
                  >
                    <Icon name={item.icon} className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border)]">
          <button onClick={() => onNav("profile")} className="mb-2 w-full rounded-lg px-1 py-1 text-left text-xs text-[var(--muted-foreground)] hover:text-[var(--gold-mid)]">Signed in as {userName}</button>
          <button
            onClick={onLogout}
            className="w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--gold-mid)] border border-[var(--border)] rounded-lg px-3 py-2 transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm">
          <div className="px-4 h-14 flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-[var(--gold-mid)]">
              KhmerShop Admin
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs"
            >
              Sign out
            </button>
            <div className="flex gap-1 overflow-x-auto">
              {navItems.filter((item) => allowedPages.includes(item.id)).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`p-2 rounded-lg text-xs transition-colors ${page === item.id ? "nav-link-active" : "text-[var(--muted-foreground)]"}`}
                  title={item.label}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </header>

        <main
          key={page}
          className="animate-page-enter flex-1 p-4 md:p-6 overflow-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
