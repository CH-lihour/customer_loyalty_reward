import { type ReactNode } from 'react';
import { CURRENT_USER } from '../data/mockData';
import { TierBadge } from './TierBadge';

type CustomerPage = 'home' | 'products' | 'cart' | 'orders' | 'rewards' | 'points' | 'badges' | 'referrals' | 'profile';

const navItems: { id: CustomerPage; label: string; labelKh: string; icon: string }[] = [
  { id: 'home', label: 'Home', labelKh: 'ទំព័រដើម', icon: '⌂' },
  { id: 'products', label: 'Products', labelKh: 'ផលិតផល', icon: '🛍' },
  { id: 'cart', label: 'Cart', labelKh: 'កន្ត្រក', icon: '🛒' },
  { id: 'orders', label: 'Orders', labelKh: 'ការបញ្ជាទិញ', icon: '📦' },
  { id: 'rewards', label: 'Rewards', labelKh: 'រង្វាន់', icon: '🎁' },
  { id: 'points', label: 'My Points', labelKh: 'ពិន្ទុ', icon: '⭐' },
  { id: 'badges', label: 'Badges', labelKh: 'គ្រឿងសំគាល់', icon: '🏅' },
  { id: 'referrals', label: 'Referrals', labelKh: 'ការណែនាំ', icon: '🤝' },
  { id: 'profile', label: 'Profile', labelKh: 'គណនី', icon: '👤' },
];

interface Props {
  page: CustomerPage;
  onNav: (p: CustomerPage) => void;
  cartCount?: number;
  onSwitchToAdmin: () => void;
  children: ReactNode;
}

export function CustomerLayout({ page, onNav, cartCount = 0, onSwitchToAdmin, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={() => onNav('home')} className="flex items-center gap-2 shrink-0">
            <span className="text-xl">🇰🇭</span>
            <span className="font-display text-lg font-semibold text-[var(--gold-mid)] leading-none">KhmerShop</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${page === item.id ? 'nav-link-active' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                {item.label}
                {item.id === 'cart' && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center leading-none">{cartCount}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => onNav('cart')} className="relative lg:hidden p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors text-[var(--muted-foreground)]">
              🛒
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center">{cartCount}</span>}
            </button>
            <div className="flex items-center gap-2">
              <img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--gold-mid)]/40" />
              <TierBadge tier={CURRENT_USER.tier} />
            </div>
            <button onClick={onSwitchToAdmin} className="hidden sm:block text-xs text-[var(--muted-foreground)] hover:text-[var(--gold-mid)] border border-[var(--border)] rounded-md px-2 py-1 transition-colors">
              Admin ↗
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="lg:hidden sticky top-14 z-40 bg-[var(--card)] border-b border-[var(--border)] overflow-x-auto">
        <div className="flex min-w-max px-2 py-1.5 gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors relative ${page === item.id ? 'nav-link-active' : 'text-[var(--muted-foreground)]'}`}
            >
              <span>{item.icon}</span> {item.label}
              {item.id === 'cart' && cartCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center">{cartCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted-foreground)]">
        © 2026 KhmerShop · ហាងខ្មែរ · Phnom Penh, Cambodia
      </footer>
    </div>
  );
}
