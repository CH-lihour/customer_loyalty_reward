import { useState } from 'react';
import { activityLog, customers } from '../../data/mockData';

const eventColors: Record<string, string> = {
  POINTS_EARNED: 'text-green-400 bg-green-400/10',
  REWARD_REDEEMED: 'text-purple-400 bg-purple-400/10',
  TIER_UPGRADE: 'text-yellow-400 bg-yellow-400/10',
  ORDER_COMPLETED: 'text-blue-400 bg-blue-400/10',
  USER_REGISTER: 'text-cyan-400 bg-cyan-400/10',
  BADGE_AWARDED: 'text-orange-400 bg-orange-400/10',
  POINTS_ADJUSTED: 'text-pink-400 bg-pink-400/10',
};

export function AdminActivityLogsPage() {
  const [eventFilter, setEventFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');

  const events = ['All', ...Object.keys(eventColors)];
  const filtered = activityLog.filter(log => {
    const matchEvent = eventFilter === 'All' || log.event === eventFilter;
    const matchUser = userFilter === 'All' || log.userId === userFilter;
    return matchEvent && matchUser;
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Activity Logs</h1>

      <div className="flex flex-wrap gap-2">
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none">
          <option value="All">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {events.map(e => (
            <button key={e} onClick={() => setEventFilter(e)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${eventFilter === e ? 'bg-[var(--gold-mid)] text-[var(--background)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}>
              {e.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map(log => (
          <div key={log.id} className="flex items-start gap-4 bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="font-mono-data text-xs text-[var(--muted-foreground)] shrink-0 w-32">{log.timestamp}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${eventColors[log.event] || 'text-[var(--muted-foreground)] bg-[var(--secondary)]'}`}>
                  {log.event.replace(/_/g, ' ')}
                </span>
                <span className="text-sm">{log.description}</span>
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">{log.userName}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[var(--muted-foreground)]">No logs match your filters.</div>
        )}
      </div>
    </div>
  );
}
