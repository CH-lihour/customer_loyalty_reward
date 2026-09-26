import { customers } from '../../data/mockData';

const referralData = [
  { referrerId: 'u1', referrerName: 'Sophea Chan', referredName: 'Maly Noun', status: 'CONVERTED', date: '2026-01-21', ptsAwarded: 100 },
  { referrerId: 'u2', referrerName: 'Dara Pich', referredName: 'Piseth Keo', status: 'CONVERTED', date: '2026-07-12', ptsAwarded: 100 },
  { referrerId: 'u5', referrerName: 'Sreyleak Tep', referredName: 'Vichet Lim', status: 'CONVERTED', date: '2025-05-22', ptsAwarded: 100 },
  { referrerId: 'u5', referrerName: 'Sreyleak Tep', referredName: 'Chanthy Ros', status: 'CONVERTED', date: '2024-02-18', ptsAwarded: 100 },
  { referrerId: 'u2', referrerName: 'Dara Pich', referredName: 'Bunna Sok', status: 'PENDING', date: '2026-09-15', ptsAwarded: 0 },
];

export function AdminReferralsPage() {
  const topReferrers = customers
    .map(c => ({ ...c, referrals: referralData.filter(r => r.referrerId === c.id && r.status === 'CONVERTED').length }))
    .filter(c => c.referrals > 0)
    .sort((a, b) => b.referrals - a.referrals);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Referral Program</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referrals', value: referralData.length },
          { label: 'Converted', value: referralData.filter(r => r.status === 'CONVERTED').length },
          { label: 'Pending', value: referralData.filter(r => r.status === 'PENDING').length },
          { label: 'Points Paid Out', value: `${referralData.reduce((s, r) => s + r.ptsAwarded, 0)} pts` },
        ].map(s => (
          <div key={s.label} className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="font-mono-data text-xl font-bold text-[var(--gold-mid)]">{s.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Referral log */}
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="font-semibold mb-3 text-sm">Referral Log</h3>
          <div className="flex flex-col gap-2">
            {referralData.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <span className="font-medium">{r.referrerName}</span>
                  <span className="text-[var(--muted-foreground)]"> → {r.referredName}</span>
                  <div className="text-[var(--muted-foreground)]">{r.date}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${r.status === 'CONVERTED' ? 'text-green-400' : 'text-yellow-400'}`}>{r.status}</div>
                  {r.ptsAwarded > 0 && <div className="text-[var(--gold-mid)]">+{r.ptsAwarded} pts</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top referrers */}
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="font-semibold mb-3 text-sm">Top Referrers</h3>
          <div className="flex flex-col gap-3">
            {topReferrers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="font-mono-data text-sm font-bold text-[var(--muted-foreground)] w-4">{i + 1}</span>
                <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                </div>
                <div className="font-mono-data text-sm font-bold text-[var(--gold-mid)]">{c.referrals} referrals</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
