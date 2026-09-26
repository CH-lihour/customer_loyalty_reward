import { useState } from 'react';
import { customers } from '../../data/mockData';
import { TierBadge } from '../../components/TierBadge';

const riskLabel = (lastOrder: string) => {
  const days = Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000);
  if (days < 30) return { label: 'Low Risk', color: 'text-green-400 bg-green-400/10' };
  if (days < 60) return { label: 'Medium Risk', color: 'text-yellow-400 bg-yellow-400/10' };
  return { label: 'High Risk', color: 'text-red-400 bg-red-400/10' };
};

export function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'All' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Customers</h1>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50 w-48"
          />
          {['All', 'Silver', 'Gold', 'Platinum'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tierFilter === t ? 'bg-[var(--gold-mid)] text-[var(--background)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr className="text-[var(--muted-foreground)] text-xs">
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Province</th>
                <th className="text-left px-4 py-3 font-medium">Tier</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">Spent</th>
                <th className="text-right px-4 py-3 font-medium">Orders</th>
                <th className="text-right px-4 py-3 font-medium">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(c => {
                const risk = riskLabel(c.lastOrder);
                return (
                  <tr key={c.id} className="hover:bg-[var(--secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        <div>
                          <div className="font-medium text-xs">{c.name}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">{c.province}</td>
                    <td className="px-4 py-3"><TierBadge tier={c.tier} /></td>
                    <td className="px-4 py-3 text-right font-mono-data text-xs text-[var(--gold-mid)]">{c.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-xs">${c.totalSpent}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono-data">{c.ordersCount}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${risk.color}`}>{risk.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
