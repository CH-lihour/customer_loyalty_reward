import { type ReactNode } from "react";
import { useShop } from "../data/shop";
import { TierBadge } from "./TierBadge";
import { Icon } from "./Icon";

type CustomerPage =
  | "home"
  | "products"
  | "cart"
  | "orders"
  | "rewards"
  | "points"
  | "tier"
  | "badges"
  | "referrals"
  | "profile";

const navItems: {
  id: CustomerPage;
  label: string;
  labelKh: string;
  icon: string;
}[] = [
  { id: "home", label: "Home", labelKh: "ទំព័រដើម", icon: "⌂" },
  { id: "products", label: "Products", labelKh: "ផលិតផល", icon: "products" },
  { id: "cart", label: "Cart", labelKh: "កន្ត្រក", icon: "cart" },
  { id: "orders", label: "Orders", labelKh: "ការបញ្ជាទិញ", icon: "orders" },
  { id: "rewards", label: "Rewards", labelKh: "រង្វាន់", icon: "gift" },
  { id: "points", label: "My Points", labelKh: "ពិន្ទុ", icon: "star" },
  { id: "tier", label: "My Tier", labelKh: "កម្រិត", icon: "trophy" },
  { id: "badges", label: "Badges", labelKh: "គ្រឿងសំគាល់", icon: "medal" },
  { id: "referrals", label: "Referrals", labelKh: "ការណែនាំ", icon: "users" },
  { id: "profile", label: "Profile", labelKh: "គណនី", icon: "user" },
];

interface Props {
  page: CustomerPage;
  onNav: (p: CustomerPage) => void;
  cartCount?: number;
  onLogout: () => void;
  guest?: boolean;
  onSignIn?: () => void;
  children: ReactNode;
}

export function CustomerLayout({
  page,
  onNav,
  cartCount = 0,
  onLogout,
  guest = false,
  onSignIn,
  children,
}: Props) {
  const shop = useShop();
  const CURRENT_USER = shop.currentUser;
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => onNav("home")}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="shop" className="h-6 w-6 text-[var(--gold-mid)]" />
            <span className="font-display text-lg font-semibold text-[var(--gold-mid)] leading-none">
              KhmerShop
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.filter((item) => !guest || ["home", "products", "cart"].includes(item.id)).map((item) => (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${page === item.id ? "nav-link-active" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {item.label}
                {item.id === "cart" && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              title="Illustrative KHR rate: 1 USD = 4,000 KHR"
              onClick={() =>
                shop.setCurrency(shop.currency === "USD" ? "KHR" : "USD")
              }
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--gold-mid)]"
            >
              {shop.currency}
            </button>
            <button
              onClick={() => onNav("cart")}
              aria-label="Cart"
              className="relative lg:hidden p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors text-[var(--muted-foreground)]"
            >
              <Icon name="cart" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            {!guest && <div className="flex items-center gap-2">
              <img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--gold-mid)]/40" />
              <TierBadge tier={CURRENT_USER.tier} />
            </div>}
            <button
              onClick={guest ? onSignIn : onLogout}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--gold-mid)] border border-[var(--border)] rounded-md px-2 py-1 transition-colors"
            >
              {guest ? "Sign in" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="lg:hidden sticky top-14 z-40 bg-[var(--card)] border-b border-[var(--border)] overflow-x-auto">
        <div className="flex min-w-max px-2 py-1.5 gap-1">
          {navItems.filter((item) => !guest || ["home", "products", "cart"].includes(item.id)).map((item) => (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors relative ${page === item.id ? "nav-link-active" : "text-[var(--muted-foreground)]"}`}
            >
              <Icon name={item.icon} className="h-4 w-4" /> {item.label}
              {item.id === "cart" && cartCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main
        key={page}
        className="animate-page-enter flex-1 max-w-7xl w-full mx-auto px-4 py-6"
      >
        {children}
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted-foreground)]">
        © 2026 KhmerShop · ហាងខ្មែរ · Phnom Penh, Cambodia
      </footer>
    </div>
  );
}
