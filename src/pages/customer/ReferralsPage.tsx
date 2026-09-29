import { useState } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";

export function ReferralsPage() {
  const { currentUser, referrals, customers } = useShop();
  const { notify } = useFeedback();
  const [copied, setCopied] = useState(false);
  const mine = referrals.filter((r) => r.referrerId === currentUser.id);
  const converted = mine.filter((r) => r.completed);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUser.referralCode);
      setCopied(true);
      notify("Referral code copied.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      notify("Could not copy the referral code.", "error");
    }
  };
  return (
    <div className="w-full space-y-6">
      <h1 className="font-display text-2xl font-semibold">Referral Program</h1>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-2 text-xl font-semibold">
          Invite Friends, Earn Together
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Share your code. After a referred customer completes their first
          order, you earn 100 points and they earn 50 points.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-[var(--secondary)] px-4 py-3 text-[var(--gold-mid)]">
            {currentUser.referralCode}
          </code>
          <button
            onClick={copy}
            className="rounded-lg bg-[var(--gold-mid)] px-4 py-3 text-sm font-semibold text-[var(--background)]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <strong className="text-2xl text-[var(--gold-mid)]">
            {converted.length}
          </strong>
          <p className="text-xs">Successful referrals</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <strong className="text-2xl text-[var(--gold-mid)]">
            {converted.length * 100}
          </strong>
          <p className="text-xs">Referral points earned</p>
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">My Referrals</h2>
        {mine.length ? (
          mine.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
            >
              <span>
                {customers.find((c) => c.id === r.customerId)?.name ??
                  "Customer"}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {r.createdAt}
                </span>
              </span>
              <span
                className={r.completed ? "text-green-400" : "text-yellow-400"}
              >
                {r.completed ? "Converted" : "Awaiting first completed order"}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No referrals yet. Share your code to get started.
          </p>
        )}
      </section>
    </div>
  );
}
