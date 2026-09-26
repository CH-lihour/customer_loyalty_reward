import { useState } from 'react';
import { customers } from '../../data/mockData';
import { TierBadge } from '../../components/TierBadge';
import type { Tier } from '../../data/mockData';

export function AdminTiersPage() {
  const [config, setConfig] = useState({
    Silver: { min: 0, max: 999, multiplier: 1 },
    Gold: { min: 1000, max: 4999, multiplier: 1.5 },
    Platinum: { min: 5000, max: Infinity, multiplier: 2 },
  });

  const tiers: Tier[] = ['Silver', 'Gold', 'Platinum'];
  const tierColors: Record<Tier, string> = { Silver: '#94a3b8', Gold: '#e8a634', Platinum: '#a78bfa' };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Membership Tiers</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(tier => {
          const c = config[tier];
          const count = customers.filter(cu => cu.tier === tier).length;
          return (
            <div key={tier} className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <TierBadge tier={tier} size="md" />
                <span className="font-mono-data text-sm font-bold text-[var(--gold-mid)]">{count} members</span>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Min Points</label>
                  <input
                    type="number"
                    value={c.min}
                    onChange={e => setConfig(prev => ({ ...prev, [tier]: { ...prev[tier], min: parseInt(e.target.value) } }))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50 font-mono-data"
                    disabled={tier === 'Silver'}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Max Points</label>
                  <input
                    type="text"
                    value={tier === 'Platinum' ? '∞' : c.max}
                    onChange={e => tier !== 'Platinum' && setConfig(prev => ({ ...prev, [tier]: { ...prev[tier], max: parseInt(e.target.value) } }))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50 font-mono-data"
                    disabled={tier === 'Platinum'}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Point Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={c.multiplier}
                    onChange={e => setConfig(prev => ({ ...prev, [tier]: { ...prev[tier], multiplier: parseFloat(e.target.value) } }))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50 font-mono-data"
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="text-xs text-[var(--muted-foreground)] mb-2">Benefits</div>
                {tier === 'Silver' && <ul className="text-xs space-y-1 text-[var(--muted-foreground)]"><li>• Basic reward catalog</li><li>• Free shipping vouchers</li><li>• Standard support</li></ul>}
                {tier === 'Gold' && <ul className="text-xs space-y-1 text-[var(--muted-foreground)]"><li>• Gold reward catalog</li><li>• Gold-exclusive promotions</li><li>• Priority checkout</li></ul>}
                {tier === 'Platinum' && <ul className="text-xs space-y-1 text-[var(--muted-foreground)]"><li>• Platinum-exclusive rewards</li><li>• Highest point multiplier</li><li>• Priority support</li></ul>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-3 text-sm">Customer Tier Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]">
              <tr className="text-[var(--muted-foreground)] text-xs">
                <th className="text-left pb-2 font-medium">Customer</th>
                <th className="text-left pb-2 font-medium">Current Tier</th>
                <th className="text-right pb-2 font-medium">Points</th>
                <th className="text-right pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-[var(--secondary)] transition-colors">
                  <td className="py-2.5">{c.name}</td>
                  <td className="py-2.5"><TierBadge tier={c.tier} /></td>
                  <td className="py-2.5 text-right font-mono-data text-xs text-[var(--gold-mid)]">{c.points.toLocaleString()}</td>
                  <td className="py-2.5 text-right">
                    <select defaultValue={c.tier} className="text-xs bg-[var(--secondary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)] focus:outline-none">
                      {tiers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
