import { useState } from 'react';
import { loyaltyTransactions as initialTxs, customers } from '../../data/mockData';

export function AdminPointsPage() {
  const [txs, setTxs] = useState(initialTxs);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState('u1');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const handleAdjust = () => {
    if (!adjustPoints || !adjustReason) return;
    const pts = parseInt(adjustPoints);
    const user = customers.find(c => c.id === adjustUserId);
    if (!user) return;
    const lastBal = txs.find(t => t.userId === adjustUserId)?.balanceAfter ?? user.points;
    setTxs(prev => [{
      id: `lt-adj-${Date.now()}`,
      userId: adjustUserId,
      userName: user.name,
      type: 'ADJUST',
      points: pts,
      balanceBefore: lastBal,
      balanceAfter: lastBal + pts,
      reason: `Manual adjustment: ${adjustReason}`,
      createdAt: new Date().toISOString().split('T')[0],
    }, ...prev]);
    setAdjustPoints('');
    setAdjustReason('');
    setShowAdjust(false);
  };

  const typeColors: Record<string, string> = {
    EARN: 'text-green-400 bg-green-400/10',
    SPEND: 'text-red-400 bg-red-400/10',
    ADJUST: 'text-blue-400 bg-blue-400/10',
    REFERRAL: 'text-purple-400 bg-purple-400/10',
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Points Ledger</h1>
        <button onClick={() => setShowAdjust(true)} className="px-3 py-1.5 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-xs font-semibold hover:bg-[var(--gold-light)] transition-colors">Manual Adjustment</button>
      </div>

      {showAdjust && (
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--gold-mid)]/30">
          <h3 className="font-semibold mb-3 text-sm">Manual Point Adjustment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={adjustUserId} onChange={e => setAdjustUserId(e.target.value)} className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none">
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="Points (e.g. +200 or -100)" type="number" className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50" />
            <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason for adjustment" className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdjust} className="px-4 py-2 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-sm font-semibold hover:bg-[var(--gold-light)] transition-colors">Apply</button>
            <button onClick={() => setShowAdjust(false)} className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr className="text-[var(--muted-foreground)] text-xs">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {txs.map(tx => (
                <tr key={tx.id} className="hover:bg-[var(--secondary)] transition-colors">
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] font-mono-data">{tx.createdAt}</td>
                  <td className="px-4 py-3 text-xs">{tx.userName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[tx.type]}`}>{tx.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] max-w-48 truncate">{tx.reason}</td>
                  <td className={`px-4 py-3 text-right font-mono-data text-xs font-semibold ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-data text-xs text-[var(--gold-mid)]">{tx.balanceAfter.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
