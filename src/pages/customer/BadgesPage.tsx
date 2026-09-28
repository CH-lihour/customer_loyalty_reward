import { useShop } from "../../data/shop";
import { Icon } from "../../components/Icon";

export function BadgesPage() {
  const { badges, currentUser: CURRENT_USER } = useShop();
  const earned = new Set(CURRENT_USER.badges);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Badges</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {earned.size} of {badges.length} badges earned
        </p>
      </div>

      {/* Progress */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-[var(--muted-foreground)]">
            Collection Progress
          </span>
          <span className="text-[var(--gold-mid)] font-semibold">
            {earned.size}/{badges.length}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${badges.length ? (earned.size / badges.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((badge) => {
          const isEarned = earned.has(badge.code);
          return (
            <div
              key={badge.id}
              className={`p-5 rounded-xl border text-center transition-all ${isEarned ? "bg-[var(--card)] border-[var(--border)] card-glow" : "bg-[var(--card)]/40 border-[var(--border)]/40 opacity-50"}`}
            >
              <div className="mb-3 flex justify-center">
                <Icon name={isEarned ? badge.icon : "lock"} className="h-10 w-10 text-[var(--gold-mid)]" />
              </div>
              <div className="font-semibold text-sm">{badge.name}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {badge.nameKh}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">
                {badge.description}
              </div>
              {isEarned && (
                <div className="mt-3 text-xs font-semibold text-green-400">
                  ✓ Earned
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
