import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { type AdminPage } from "../data/adminAccess";

export type { AdminPage } from "../data/adminAccess";

const navItems: {
  id: AdminPage;
  label: string;
  icon: string;
  group?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "◉", group: "Overview" },
  { id: "analytics", label: "Analytics", icon: "chart", group: "Overview" },
  { id: "customers", label: "Customers", icon: "users", group: "Sales" },
  { id: "orders", label: "Orders", icon: "orders", group: "Sales" },
  { id: "referrals", label: "Referrals", icon: "users", group: "Sales" },
  { id: "products", label: "Products", icon: "products", group: "Catalog" },
  { id: "categories", label: "Categories", icon: "category", group: "Catalog" },
  { id: "points", label: "Points", icon: "star", group: "Loyalty" },
  { id: "tiers", label: "Tiers", icon: "trophy", group: "Loyalty" },
  { id: "campaigns", label: "Campaigns", icon: "tag", group: "Loyalty" },
  { id: "rewards", label: "Rewards", icon: "gift", group: "Loyalty" },
  { id: "badges", label: "Badges", icon: "medal", group: "Loyalty" },
  { id: "stock-alerts", label: "Low Stock", icon: "alert", group: "Stock" },
  { id: "stock", label: "Stock Levels", icon: "warehouse", group: "Stock" },
  { id: "stock-movements", label: "Movements", icon: "swap", group: "Stock" },
  { id: "stocktake", label: "Stocktake", icon: "clipboard", group: "Stock" },
  { id: "stock-reports", label: "Stock Reports", icon: "chart", group: "Stock" },
  { id: "fulfillment", label: "Fulfilment", icon: "truck", group: "Supply" },
  { id: "suppliers", label: "Suppliers", icon: "supplier", group: "Supply" },
  { id: "users", label: "User Management", icon: "users", group: "Administration" },
  { id: "roles", label: "Role Permissions", icon: "lock", group: "Administration" },
  { id: "exchange-rate", label: "Exchange Rate", icon: "wallet", group: "Administration" },
  { id: "logs", label: "Activity Logs", icon: "list", group: "Administration" },
  { id: "profile", label: "My Profile", icon: "user", group: "Account" },
];

/** Sidebar groups, in order. "Account" (My Profile) is reached from the top bar's profile button instead. */
const groups = ["Overview", "Sales", "Catalog", "Loyalty", "Stock", "Supply", "Administration"];

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

interface Props {
  page: AdminPage;
  onNav: (p: AdminPage) => void;
  onLogout: () => void;
  allowedPages: AdminPage[];
  userName: string;
  userRoleLabel: string;
  children: ReactNode;
}

export function AdminLayout({ page, onNav, onLogout, allowedPages, userName, userRoleLabel, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentItem = navItems.find((item) => item.id === page);
  const activeGroup = currentItem?.group;
  // Accordion: at most one group is open. Going to a page opens that page's group.
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup ?? null);

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  const toggleGroup = (group: string) => setOpenGroup((current) => (current === group ? null : group));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navigate = (next: AdminPage) => {
    setMenuOpen(false);
    onNav(next);
  };

  /** The brand and grouped page links, shared by the desktop sidebar and the mobile drawer. */
  const renderSidebar = (placement: "desktop" | "drawer") => (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-[var(--border)] px-4">
        <div className="flex w-full items-center gap-2">
          <Icon name="shop" className="h-6 w-6 text-[var(--gold-mid)]" />
          <div className="flex-1">
            <div className="font-display text-sm font-semibold text-[var(--gold-mid)]">
              KhmerShop
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Admin console
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="md:hidden rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-2 pt-4">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group && allowedPages.includes(n.id));
          if (!items.length) return null;
          const open = openGroup === group;
          // A closed group that holds the current page is tinted so the page stays findable.
          const holdsHiddenPage = !open && group === activeGroup;
          const listId = `admin-nav-${placement}-${group.toLowerCase()}`;
          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={open}
                aria-controls={listId}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[var(--foreground)] ${holdsHiddenPage ? "text-[var(--gold-mid)]" : "text-[var(--muted-foreground)]"}`}
              >
                {group}
                <Icon
                  name="chevron"
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
                />
              </button>
              <div
                id={listId}
                inert={!open}
                className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  <div className="pt-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`w-full flex items-center gap-2 px-2 py-2 md:py-1.5 rounded-lg text-sm font-medium text-left transition-colors mb-0.5 ${page === item.id ? "nav-link-active" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"}`}
                      >
                        <Icon name={item.icon} className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] sticky top-0 h-screen overflow-y-auto">
        {renderSidebar("desktop")}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--card)] shadow-2xl"
          >
            {renderSidebar("drawer")}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: page title on the left; theme, profile and sign out on the right. */}
        <header className="sticky top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm">
          <div className="page-container flex h-full items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="-ml-2 rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] md:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 truncate text-sm">
              {activeGroup && activeGroup !== "Account" && (
                <span className="hidden text-[var(--muted-foreground)] sm:inline">{activeGroup} / </span>
              )}
              <span className="font-display font-semibold text-[var(--foreground)] sm:text-base">
                {currentItem?.label ?? "KhmerShop Admin"}
              </span>
            </div>

            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate("profile")}
              aria-label="My profile"
              title="My profile"
              className={`flex shrink-0 items-center gap-2 rounded-lg p-1 transition-colors sm:pr-2.5 ${page === "profile" ? "bg-[var(--gold-mid)]/10" : "hover:bg-[var(--secondary)]"}`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gold-mid)]/15 text-xs font-semibold text-[var(--gold-mid)] ring-1 ring-[var(--gold-mid)]/30">
                {initialsOf(userName) || <Icon name="user" className="h-4 w-4" />}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-36 truncate text-sm font-medium text-[var(--foreground)]">{userName}</span>
                <span className="block max-w-36 truncate text-xs text-[var(--muted-foreground)]">{userRoleLabel}</span>
              </span>
            </button>
            <span className="hidden h-6 w-px bg-[var(--border)] sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={onLogout}
              className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--gold-mid)]/40 hover:text-[var(--foreground)]"
            >
              Sign out
            </button>
          </div>
        </header>

        <main
          key={page}
          className="animate-page-enter flex-1 min-w-0 py-6 overflow-auto"
        >
          <div className="page-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
