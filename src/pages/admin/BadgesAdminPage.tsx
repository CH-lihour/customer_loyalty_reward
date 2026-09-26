import { badges, customers } from '../../data/mockData';

export function AdminBadgesPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Badges</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {badges.map(badge => {
          const earnedBy = customers.filter(c => c.badges.includes(badge.code));
          return (
            <div key={badge.id} className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{badge.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold">{badge.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{badge.nameKh}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Condition: {badge.description}</div>
                  <div className="mt-2 text-xs">
                    <span className="text-[var(--gold-mid)] font-semibold font-mono-data">{earnedBy.length}</span>
                    <span className="text-[var(--muted-foreground)]"> customers earned this</span>
                  </div>
                  {earnedBy.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {earnedBy.slice(0, 5).map(c => (
                        <img key={c.id} src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full object-cover" title={c.name} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
