import { useState } from 'react';
import { rewards as initialRewards } from '../../data/mockData';
import { TierBadge } from '../../components/TierBadge';

export function AdminRewardsPage() {
  const [rewards, setRewards] = useState(initialRewards);

  const toggleActive = (id: string) => setRewards(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const handleDelete = (id: string) => setRewards(prev => prev.filter(r => r.id !== id));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Rewards Catalog</h1>
        <div className="text-sm text-[var(--muted-foreground)]">{rewards.filter(r => r.active).length} active rewards</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map(r => (
          <div key={r.id} className={`bg-[var(--card)] rounded-xl overflow-hidden border transition-all ${r.active ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-60'}`}>
            <div className="h-28 bg-[var(--secondary)] overflow-hidden relative">
              <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2"><TierBadge tier={r.minTier} /></div>
              <div className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${r.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {r.active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="p-4">
              <div className="font-semibold text-sm">{r.name}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{r.nameKh}</div>
              <p className="text-xs text-[var(--muted-foreground)] mt-2 line-clamp-2 leading-relaxed">{r.description}</p>

              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="font-mono-data font-semibold text-[var(--gold-mid)]">{r.pointsCost.toLocaleString()} pts</span>
                <span className="text-xs text-[var(--muted-foreground)]">{r.stock} in stock</span>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleActive(r.id)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${r.active ? 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-400' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                  {r.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
