import { type ReactNode } from "react";

export type AdminPage =
  | "dashboard"
  | "customers"
  | "products"
  | "orders"
  | "points"
  | "tiers"
  | "campaigns"
  | "rewards"
  | "badges"
  | "referrals"
  | "logs"
  | "analytics";

const navItems: {
  id: AdminPage;
  label: string;
  icon: string;
  group?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "◉", group: "Overview" },
  { id: "analytics", label: "Analytics", icon: "📊", group: "Overview" },
  { id: "customers", label: "Customers", icon: "👥", group: "E-Commerce" },
  { id: "products", label: "Products", icon: "🛍", group: "E-Commerce" },
  { id: "orders", label: "Orders", icon: "📦", group: "E-Commerce" },
  { id: "points", label: "Points", icon: "⭐", group: "Loyalty" },
  { id: "tiers", label: "Tiers", icon: "🏆", group: "Loyalty" },
  { id: "campaigns", label: "Campaigns", icon: "🏷️", group: "Loyalty" },
  { id: "rewards", label: "Rewards", icon: "🎁", group: "Loyalty" },
  { id: "badges", label: "Badges", icon: "🏅", group: "Loyalty" },
  { id: "referrals", label: "Referrals", icon: "🤝", group: "Loyalty" },
  { id: "logs", label: "Activity Logs", icon: "📋", group: "System" },
];

interface Props {
  page: AdminPage;
  onNav: (p: AdminPage) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AdminLayout({ page, onNav, onLogout, children }: Props) {
  const groups = ["Overview", "E-Commerce", "Loyalty", "System"];

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇰🇭</span>
            <div>
              <div className="font-display text-sm font-semibold text-[var(--gold-mid)]">
                KhmerShop
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Admin Panel
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-4 pt-4">
          {groups.map((group) => {
            const items = navItems.filter((n) => n.group === group);
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
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border)]">
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
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`p-2 rounded-lg text-xs transition-colors ${page === item.id ? "nav-link-active" : "text-[var(--muted-foreground)]"}`}
                  title={item.label}
                >
                  {item.icon}
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
