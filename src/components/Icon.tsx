import type { ReactNode } from "react";

const shapes: Record<string, ReactNode> = {
  shop: <><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6M3 10c0 2 3 3 4.5 1 1.5 2 4.5 2 6 0 1.5 2 4.5 1 6-1"/></>,
  home: <><path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-7h6v7"/></>,
  products: <><path d="M4 8h16l-1 13H5L4 8ZM8 9V6a4 4 0 0 1 8 0v3"/></>,
  cart: <><path d="M3 4h2l2 12h12l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  orders: <><path d="m3 7 9-4 9 4v11l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v11"/></>,
  gift: <><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 9h20M12 9v12M12 9C7 9 5 7 6 5c2-3 6 1 6 4Zm0 0c5 0 7-2 6-4-2-3-6 1-6 4Z"/></>,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1L12 2Z"/>,
  trophy: <><path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4M12 15v4m-4 2h8m-8-2h8"/></>,
  medal: <><circle cx="12" cy="15" r="5"/><path d="m8 11-2-8h4l2 6 2-6h4l-2 8m-4 1 1 2 2 .3-1.5 1.5.3 2.2-1.8-1-1.8 1 .3-2.2L9 14.3l2-.3 1-2Z"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5h-4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z"/></>,
  chart: <><path d="M3 21h18M6 17v-6m6 6V4m6 13V8"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  tag: <><path d="M3 12V4h8l10 10-7 7L3 12Z"/><circle cx="8" cy="8" r="1"/></>,
  list: <><path d="M9 5h12M9 12h12M9 19h12M3 5h2M3 12h2M3 19h2"/></>,
  repeat: <><path d="M17 3l4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4m14 0v2a2 2 0 0 1-2 2H3"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13m3 9h-6a2 2 0 0 0 0 4h6"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/></>,
  heart: <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z"/>,
  gem: <><path d="M6 3h12l4 6-10 12L2 9l4-6ZM2 9h20M6 3l6 18L18 3"/></>,
  rocket: <><path d="M13 11 5 19l-1-5-2-2 8-8c4-2 8-2 12-2 0 4 0 8-2 12l-8 8-2-2-5-1 8-8Z"/><circle cx="16" cy="8" r="2"/></>,
  arrowUp: <><path d="M12 20V4m-6 6 6-6 6 6"/></>,
  arrowDown: <><path d="M12 4v16m-6-6 6 6 6-6"/></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8m0-5v5h5M4 13a8 8 0 0 0 14 5l2-2m0 5v-5h-5"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
};

const legacy: Record<string, string> = {
  "🛍": "products", "🛒": "cart", "📦": "orders", "🎁": "gift",
  "⭐": "star", "🌟": "star", "🏆": "trophy", "🏅": "medal",
  "🥈": "medal", "🥇": "medal", "🤝": "users", "👥": "users",
  "👤": "user", "📊": "chart", "🏷": "tag", "🏷️": "tag",
  "📋": "list", "🔁": "repeat", "📅": "calendar", "💰": "wallet",
  "🔒": "lock", "💛": "heart", "💎": "gem", "🚀": "rocket",
  "↑": "arrowUp", "↓": "arrowDown", "⟳": "refresh", "⌂": "home", "◉": "dashboard",
};

export function iconName(name: string): string {
  const resolved = legacy[name] ?? name;
  return shapes[resolved] ? resolved : "medal";
}

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {shapes[iconName(name)]}
    </svg>
  );
}
