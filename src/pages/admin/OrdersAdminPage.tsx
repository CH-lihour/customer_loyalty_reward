import { useState } from 'react';
import { orders as initialOrders } from '../../data/mockData';
import type { OrderStatus } from '../../data/mockData';

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
const statusColors: Record<OrderStatus, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  CONFIRMED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  PROCESSING: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  SHIPPED: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
  CANCELLED: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<'All' | OrderStatus>('All');

  const filtered = orders.filter(o => filter === 'All' || o.status === filter);

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Orders</h1>

      <div className="flex gap-2 flex-wrap">
        {(['All', ...statuses] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-[var(--gold-mid)] text-[var(--background)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}>{s}</button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map(o => (
          <div key={o.id} className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
              <div>
                <span className="font-mono-data text-sm font-semibold">{o.id}</span>
                <span className="ml-3 text-sm text-[var(--muted-foreground)]">{o.customerName}</span>
                <span className="ml-3 text-xs text-[var(--muted-foreground)]">{o.createdAt}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[o.status]}`}>{o.status}</span>
                <select
                  value={o.status}
                  onChange={e => updateStatus(o.id, e.target.value as OrderStatus)}
                  className="text-xs bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50"
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {o.items.map(item => (
                <span key={item.productId} className="text-xs bg-[var(--secondary)] rounded-full px-2 py-0.5 text-[var(--muted-foreground)]">
                  {item.name} ×{item.qty}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)]">Order Total</span>
              <div className="flex items-center gap-3">
                {o.pointsEarned > 0 && <span className="text-xs text-[var(--gold-mid)]">+{o.pointsEarned} pts awarded</span>}
                <span className="font-semibold">${o.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
