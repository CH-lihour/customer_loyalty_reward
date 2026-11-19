import { useEffect, useState } from "react";
import { useShop } from "../../data/shop";
import {
  apiCompleteReferral,
  apiReferralPage,
  type AdminReferral,
  type ReferralStats,
} from "../../data/api";
import { useApiTable } from "../../data/apiTable";
import { useFeedback } from "../../components/FeedbackProvider";
import { AdminModal } from "../../components/AdminModal";
import { useModalState } from "../../components/useModalState";
import { TablePagination } from "../../components/TablePagination";

const filterClass =
  "px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50";

export function AdminReferralsPage({
  actorId,
  token,
}: {
  actorId: string;
  token: string;
}) {
  const { logStaffAction } = useShop();
  const { notify } = useFeedback();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const table = useApiTable(
    (page, perPage) =>
      apiReferralPage(token, { page, perPage, search: term, status }).then((result) => {
        setStats(result.stats);
        return result;
      }),
    [term, status].join("|"),
  );
  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [confirming, setConfirming, modalClosing] = useModalState<AdminReferral | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const complete = async () => {
    if (!confirming || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiCompleteReferral(token, confirming.id);
      table.reload();
      logStaffAction(
        actorId,
        "REFERRAL_CONVERTED",
        `${confirming.referrerName} → ${confirming.referredName} marked converted`,
      );
      notify(`${confirming.referrerName} and ${confirming.referredName} got their referral points.`, "success");
      setConfirming(null);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Referral Program</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total Referrals", stats?.total],
          ["Converted", stats?.converted],
          ["Pending", stats?.pending],
          ["Points Paid Out", stats?.pointsPaidOut],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <strong className="text-xl text-[var(--gold-mid)]">
              {value === undefined ? "–" : value.toLocaleString()}
            </strong>
            <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
          </div>
        ))}
      </div>

      {table.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load the referrals: {table.error}
        </p>
      )}

      {confirming && (
        <AdminModal
          closing={modalClosing}
          title="Mark Referral Converted"
          onClose={() => setConfirming(null)}
        >
          <p className="text-sm text-[var(--muted-foreground)]">
            {confirming.referrerName} gets 100 points and {confirming.referredName} gets 50 points.
            This can only be done once for this referral.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => void complete()}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-sm font-semibold hover:bg-[var(--gold-light)] transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Mark converted"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </AdminModal>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Referral Log</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              aria-label="Search referrals"
              placeholder="Name, email or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${filterClass} w-52`}
            />
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={filterClass}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
        {table.rows.length ? (
          table.rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-t border-[var(--border)] py-3 text-sm"
            >
              <span>
                {r.referrerName} → {r.referredName}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {r.createdAt}
                  {r.referrerCode && ` · ${r.referrerCode}`}
                  {r.completed && r.completedBy && ` · converted ${r.completedAt} by ${r.completedBy}`}
                </span>
              </span>
              {r.completed ? (
                <span className="text-green-400">Converted</span>
              ) : (
                <span className="flex items-center gap-3">
                  <span className="text-yellow-400">Pending</span>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setConfirming(r);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-xs font-semibold hover:bg-[var(--gold-light)] transition-colors"
                  >
                    Mark converted
                  </button>
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            {table.loading ? "Loading referrals…" : term || status ? "No referrals match." : "No referrals yet."}
          </p>
        )}
        <TablePagination {...table.pagination} />
      </div>
    </div>
  );
}
