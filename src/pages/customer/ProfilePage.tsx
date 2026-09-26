import { CURRENT_USER, badges, tierConfig } from '../../data/mockData';
import { TierBadge } from '../../components/TierBadge';

export function ProfilePage() {
  const earned = badges.filter(b => CURRENT_USER.badges.includes(b.code));
  const config = tierConfig[CURRENT_USER.tier];

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold">My Profile</h1>

      {/* Profile card */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
        <div className="flex items-center gap-4 mb-5">
          <img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-[var(--gold-mid)]/50" />
          <div>
            <div className="font-display text-lg font-semibold">{CURRENT_USER.name}</div>
            <div className="text-sm text-[var(--muted-foreground)]">{CURRENT_USER.nameKh}</div>
            <div className="mt-1.5">
              <TierBadge tier={CURRENT_USER.tier} size="md" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Email', value: CURRENT_USER.email },
            { label: 'Phone', value: CURRENT_USER.phone },
            { label: 'Province', value: CURRENT_USER.province },
            { label: 'Member Since', value: CURRENT_USER.joinedAt },
            { label: 'Points Multiplier', value: `${config.multiplier}×` },
            { label: 'Referral Code', value: CURRENT_USER.referralCode },
          ].map(f => (
            <div key={f.label} className="bg-[var(--secondary)] rounded-lg p-3">
              <div className="text-xs text-[var(--muted-foreground)]">{f.label}</div>
              <div className="font-medium mt-0.5 truncate">{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Loyalty summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Points Balance', value: CURRENT_USER.points.toLocaleString(), icon: '⭐' },
          { label: 'Orders Completed', value: CURRENT_USER.ordersCount.toString(), icon: '📦' },
          { label: 'Total Spent', value: `$${CURRENT_USER.totalSpent}`, icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-mono-data font-semibold text-[var(--gold-mid)]">{s.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-3">Badges ({earned.length})</h3>
        <div className="flex flex-wrap gap-3">
          {earned.map(badge => (
            <div key={badge.id} className="flex items-center gap-2 bg-[var(--secondary)] rounded-lg px-3 py-2 text-sm">
              <span className="text-xl">{badge.icon}</span>
              <span className="font-medium">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
