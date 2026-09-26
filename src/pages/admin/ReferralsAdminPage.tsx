import { useShop } from "../../data/shop";
export function AdminReferralsPage() {
  const { referrals, customers } = useShop();
  const converted = referrals.filter((r) => r.completed);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Referral Program</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total Referrals", referrals.length],
          ["Converted", converted.length],
          ["Pending", referrals.length - converted.length],
          ["Points Paid Out", converted.length * 150],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <strong className="text-xl text-[var(--gold-mid)]">{value}</strong>
            <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-3 font-semibold">Referral Log</h2>
        {referrals.length ? (
          referrals.map((r) => (
            <div
              key={r.id}
              className="flex justify-between border-t border-[var(--border)] py-3 text-sm"
            >
              <span>
                {customers.find((c) => c.id === r.referrerId)?.name} →{" "}
                {customers.find((c) => c.id === r.customerId)?.name}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {r.createdAt}
                </span>
              </span>
              <span
                className={r.completed ? "text-green-400" : "text-yellow-400"}
              >
                {r.completed ? "Converted" : "Pending"}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No referrals yet.
          </p>
        )}
      </div>
    </div>
  );
}
