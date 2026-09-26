import { useState } from 'react';
import { CURRENT_USER, customers } from '../../data/mockData';

export function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CURRENT_USER.referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referredCustomers = customers.filter(c => c.id !== CURRENT_USER.id && Math.random() > 0.6).slice(0, 2);
  const successfulReferrals = 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Referral Program</h1>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8" style={{ background: 'linear-gradient(135deg, #1a1e2e 0%, #1e2330 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, var(--gold-mid) 0%, transparent 60%)' }} />
        <div className="relative max-w-lg">
          <div className="text-3xl mb-2">🤝</div>
          <h2 className="font-display text-xl font-semibold mb-2">Invite Friends, Earn Together</h2>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            Share your unique referral code. When your friend registers and completes their first order,
            <span className="text-[var(--gold-mid)] font-semibold"> you earn 100 pts</span> and
            <span className="text-[var(--gold-mid)] font-semibold"> they earn 50 pts</span> — a gift to get started.
          </p>
        </div>
      </div>

      {/* Referral code */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <div className="text-sm font-semibold mb-3">Your Referral Code</div>
        <div className="flex gap-3 items-center">
          <div className="flex-1 font-mono-data text-lg font-bold text-[var(--gold-mid)] bg-[var(--secondary)] rounded-lg px-4 py-3 select-all tracking-widest">
            {CURRENT_USER.referralCode}
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-3 rounded-lg font-semibold text-sm transition-colors shrink-0 ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[var(--gold-mid)] text-[var(--background)] hover:bg-[var(--gold-light)]'}`}
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-2">Share this code with friends. They enter it during registration.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Successful Referrals', value: successfulReferrals, icon: '✅' },
          { label: 'Points Earned', value: `${successfulReferrals * 100} pts`, icon: '⭐' },
          { label: 'Your Reward per Referral', value: '100 pts', icon: '🎁' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="font-mono-data text-xl font-semibold text-[var(--gold-mid)]">{s.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-3">How It Works</h3>
        <div className="flex flex-col gap-3">
          {[
            { step: '1', text: 'Share your referral code with a friend' },
            { step: '2', text: 'They register using your code' },
            { step: '3', text: 'They complete their first order' },
            { step: '4', text: 'You receive 100 pts · They receive 50 pts' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold flex items-center justify-center shrink-0">{s.step}</span>
              <span className="text-sm text-[var(--muted-foreground)] pt-0.5">{s.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]">
          ⚠️ Self-referral is not allowed. Each new customer can only be referred once. Points are only awarded once the first order is completed.
        </div>
      </div>
    </div>
  );
}
