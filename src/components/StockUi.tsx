import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { useShop } from "../data/shop";
import {
  movementLabels,
  stockAuthorityRank,
  stockStatusLabels,
  type StockAuthority,
  type StockMovementType,
  type StockStatus,
} from "../data/stock";

export const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold-mid)] focus:outline-none disabled:opacity-50";
export const primaryButton =
  "rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-40";
export const secondaryButton =
  "rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40";
export const filterControl =
  "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none";

/** The signed-in staff member's stock authority, and a check against a required level. */
export function useStockAccess(actorId: string) {
  const level = useShop().stockAuthorityOf(actorId);
  return {
    level,
    can: (need: StockAuthority) => !!level && stockAuthorityRank[level] >= stockAuthorityRank[need],
  };
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-mid)]">{eyebrow}</p>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const statusTones: Record<StockStatus, string> = {
  out: "bg-red-400/10 text-red-400",
  low: "bg-orange-400/10 text-orange-400",
  reorder: "bg-amber-300/10 text-amber-300",
  ok: "bg-green-400/10 text-green-400",
};
export function StatusPill({ status }: { status: StockStatus }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${statusTones[status]}`}>{stockStatusLabels[status]}</span>;
}

const movementTones: Record<StockMovementType, string> = {
  RECEIVE: "text-green-400 bg-green-400/10",
  RETURN: "text-green-400 bg-green-400/10",
  TRANSFER_IN: "text-cyan-400 bg-cyan-400/10",
  TRANSFER_OUT: "text-cyan-400 bg-cyan-400/10",
  RESERVE: "text-purple-400 bg-purple-400/10",
  RELEASE: "text-purple-300 bg-purple-300/10",
  FULFILL: "text-blue-400 bg-blue-400/10",
  ADJUST: "text-pink-400 bg-pink-400/10",
  COUNT: "text-pink-400 bg-pink-400/10",
  DAMAGE: "text-red-400 bg-red-400/10",
  LOSS: "text-red-400 bg-red-400/10",
  EXPIRY: "text-orange-400 bg-orange-400/10",
};
export function MovementBadge({ type }: { type: StockMovementType }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${movementTones[type]}`}>{movementLabels[type]}</span>;
}

export function StatTile({ label, value, sub, icon, tone = "gold", onClick }: {
  label: string; value: ReactNode; sub?: ReactNode; icon: string; tone?: "gold" | "red" | "orange" | "green"; onClick?: () => void;
}) {
  const color = { gold: "text-[var(--gold-mid)]", red: "text-red-400", orange: "text-orange-400", green: "text-green-400" }[tone];
  const body = (
    <>
      <Icon name={icon} className={`mb-2 h-5 w-5 ${color}`} />
      <div className={`font-mono-data text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold">{label}</div>
      {sub && <div className="text-xs text-[var(--muted-foreground)]">{sub}</div>}
    </>
  );
  const cls = "rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left";
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-[var(--gold-mid)]/40`}>{body}</button>
    : <div className={cls}>{body}</div>;
}

export function Panel({ title, description, actions, children, flush = false }: {
  title: string; description?: string; actions?: ReactNode; children: ReactNode; flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-xs text-[var(--muted-foreground)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return <tr><td colSpan={colSpan} className="p-6 text-center text-sm text-[var(--muted-foreground)]">{children}</td></tr>;
}

export const tableClass = "w-full min-w-[640px] text-left text-sm";
export const theadClass = "border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted-foreground)]";
export const rowClass = "border-b border-[var(--border)] last:border-0";

export const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export function timeLeft(iso?: string) {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return hours >= 48 ? `${Math.floor(hours / 24)}d ${hours % 24}h left` : `${hours}h ${minutes}m left`;
}

export const daysUntil = (date: string) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000);
