import { useState } from 'react';
import { rewards, CURRENT_USER } from '../../data/mockData';
import type { Tier } from '../../data/mockData';
import { TierBadge } from '../../components/TierBadge';

const tierRank: Record<Tier, number> = { Silver: 0, Gold: 1, Platinum: 2 };

export function RewardsPage() {
  const [redeemed, setRedeemed] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available'>('available');

  const canAfford = (r: typeof rewards[0]) => CURRENT_USER.points >= r.pointsCost;
  const canAccess = (r: typeof rewards[0]) => tierRank[CURRENT_USER.tier] >= tierRank[r.minTier];

  const displayed = rewards.filter(r => r.active && (filter === 'all' || (canAfford(r) && canAccess(r))));

  const handleRedeem = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;
    if (!canAfford(reward)) { alert('Insufficient points'); return; }
    if (!canAccess(reward)) { alert(`This reward requires ${reward.minTier} tier or higher`); return; }
    setRedeemed(rewardId);
    setTimeout(() => setRedeemed(null), 2500);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Rewards Catalog</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">You have <span className="text-[var(--gold-mid)] font-semibold font-mono-data">{CURRENT_USER.points.toLocaleString()} pts</span> · <TierBadge tier={CURRENT_USER.tier} /></p>
        </div>
        <div className="flex gap-2">
          {(['available', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[var(--gold-mid)] text-[var(--background)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}>
              {f === 'available' ? 'Can Redeem' : 'All Rewards'}
            </button>
          ))}
        </div>
      </div>

      {redeemed && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium flex items-center gap-2">
          ✅ Reward redeemed! Check your profile for the voucher.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map(r => {
          const affordable = canAfford(r);
          const accessible = canAccess(r);
          const available = affordable && accessible;

          return (
            <div key={r.id} className={`bg-[var(--card)] rounded-xl overflow-hidden border transition-all ${available ? 'border-[var(--border)] card-glow' : 'border-[var(--border)] opacity-60'}`}>
              <div className="h-32 bg-[var(--secondary)] overflow-hidden relative">
                <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)]/60 to-transparent" />
                <div className="absolute top-2 left-2">
                  <TierBadge tier={r.minTier} />
                </div>
              </div>
              <div className="p-4">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{r.nameKh}</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">{r.description}</p>

                <div className="flex items-center justify-between mt-4">
                  <div className="font-mono-data font-semibold text-[var(--gold-mid)]">{r.pointsCost.toLocaleString()} pts</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{r.stock} left</div>
                </div>

                {!accessible && (
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">Requires {r.minTier} tier</div>
                )}
                {accessible && !affordable && (
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">Need {(r.pointsCost - CURRENT_USER.points).toLocaleString()} more pts</div>
                )}

                <button
                  onClick={() => handleRedeem(r.id)}
                  disabled={!available}
                  className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${available ? 'bg-[var(--gold-mid)] text-[var(--background)] hover:bg-[var(--gold-light)]' : 'bg-[var(--secondary)] text-[var(--muted-foreground)] cursor-not-allowed'}`}
                >
                  {!accessible ? `🔒 ${r.minTier} Only` : !affordable ? `Insufficient Points` : `Redeem →`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayed.length === 0 && (
        <div className="py-16 text-center text-[var(--muted-foreground)]">
          <div className="text-4xl mb-3">🎁</div>
          <div>No rewards available right now. Earn more points!</div>
        </div>
      )}
    </div>
  );
}
