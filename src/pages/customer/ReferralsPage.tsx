import { useEffect, useState } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { apiMyReferrals, type MyReferral, type MyReferrals } from "../../data/api";

/**
 * The customer's referral code and the friends who joined with it. A signed-in customer's numbers come
 * from the API; without a token (the demo) they come from the browser store.
 */
export function ReferralsPage({ token }: { token: string | null }) {
  const { currentUser, referrals, customers } = useShop();
  const { notify } = useFeedback();
  const [copied, setCopied] = useState(false);
  const [api, setApi] = useState<MyReferrals | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiMyReferrals(token).then(
      (next) => {
        if (!cancelled) {
          setApi(next);
          setError("");
        }
      },
      (failure: Error) => {
        if (!cancelled) setError(failure.message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const demo = referrals.filter((r) => r.referrerId === currentUser.id);
  const mine: MyReferral[] = api
    ? api.referrals
    : token
      ? []
      : demo.map((r) => ({
          id: r.id,
          name: customers.find((c) => c.id === r.customerId)?.name ?? "Customer",
          completed: r.completed,
          createdAt: r.createdAt,
        }));
  const code = api?.code ?? currentUser.referralCode;
  const referrerPoints = api?.referrerPoints ?? 100;
  const referredPoints = api?.referredPoints ?? 50;
  const converted = api ? api.converted : mine.filter((r) => r.completed).length;
  const pointsEarned = api ? api.pointsEarned : converted * referrerPoints;
  const loading = Boolean(token) && !api && !error;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
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
          Share your code. When a referred customer pays for their first
          order, you earn {referrerPoints} points and they earn {referredPoints} points.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-[var(--secondary)] px-4 py-3 text-[var(--gold-mid)]">
            {code}
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
            {converted}
          </strong>
          <p className="text-xs">Successful referrals</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <strong className="text-2xl text-[var(--gold-mid)]">
            {pointsEarned.toLocaleString()}
          </strong>
          <p className="text-xs">Referral points earned</p>
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">My Referrals</h2>
        {error && (
          <p role="alert" className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
            Couldn't load your referrals: {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading your referrals…</p>
        ) : mine.length ? (
          mine.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
            >
              <span>
                {r.name}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {r.createdAt}
                </span>
              </span>
              <span
                className={r.completed ? "text-green-400" : "text-yellow-400"}
              >
                {r.completed ? "Converted" : "Awaiting first paid order"}
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
