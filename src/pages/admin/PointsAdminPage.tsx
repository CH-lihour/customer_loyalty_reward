import { useEffect, useState } from "react"
import { useShop } from "../../data/shop"
import {
  apiAdjustPoints,
  apiPointPage,
  type PointCustomer,
} from "../../data/api"
import { useApiTable } from "../../data/apiTable"
import { useFeedback } from "../../components/FeedbackProvider"
import { CustomerCombobox } from "../../components/CustomerCombobox"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { TablePagination } from "../../components/TablePagination"

const filterClass =
  "px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50"

export function AdminPointsPage({
  actorId,
  token,
}: {
  actorId: string
  token: string
}) {
  const { logStaffAction } = useShop()
  const { notify } = useFeedback()
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [type, setType] = useState("")
  const [direction, setDirection] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const table = useApiTable(
    (page, perPage) =>
      apiPointPage(token, {
        page,
        perPage,
        search: term,
        type,
        direction,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    [term, type, direction, dateFrom, dateTo].join("|"),
  )
  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const [showAdjust, setShowAdjust, modalClosing] = useModalState<boolean>(false)
  const [customer, setCustomer] = useState<PointCustomer | null>(null)
  const [adjustPoints, setAdjustPoints] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const openAdjust = () => {
    setError("")
    setShowAdjust(true)
  }

  const handleAdjust = async () => {
    if (saving) return
    if (!customer) {
      setError("Choose a customer.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const row = await apiAdjustPoints(token, customer.id, adjustPoints, adjustReason)
      table.reload()
      logStaffAction(
        actorId,
        "POINTS_ADJUSTED",
        `${row.points > 0 ? "+" : ""}${row.points} points for ${customer.name}: ${adjustReason.trim()}`,
      )
      setCustomer({ ...customer, points: row.balanceAfter })
      setAdjustPoints("")
      setAdjustReason("")
      setShowAdjust(false)
      notify(
        `${customer.name}'s balance is now ${row.balanceAfter.toLocaleString()} points.`,
        "success",
      )
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const typeColors: Record<string, string> = {
    EARN: "text-green-400 bg-green-400/10",
    SPEND: "text-red-400 bg-red-400/10",
    ADJUST: "text-blue-400 bg-blue-400/10",
    REFERRAL: "text-purple-400 bg-purple-400/10",
    REFUND: "text-cyan-400 bg-cyan-400/10",
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Points Ledger</h1>
        <button
          onClick={openAdjust}
          className="px-3 py-1.5 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-xs font-semibold hover:bg-[var(--gold-light)] transition-colors"
        >
          Manual Adjustment
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          aria-label="Search by customer"
          placeholder="Customer name, email or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${filterClass} w-56`}
        />
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={filterClass}
        >
          <option value="">All types</option>
          {Object.keys(typeColors).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className={filterClass}
        >
          <option value="">Earned and deducted</option>
          <option value="earn">Earned (+)</option>
          <option value="deduct">Deducted (−)</option>
        </select>
        <input
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={filterClass}
        />
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={filterClass}
        />
      </div>

      {table.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load the points history: {table.error}
        </p>
      )}

      {showAdjust && (
        <AdminModal
          closing={modalClosing}
          title="Manual Point Adjustment"
          onClose={() => setShowAdjust(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleAdjust()
            }}
          >
            <div className="grid gap-3">
              <CustomerCombobox token={token} value={customer} onChange={setCustomer} />
              <input
                aria-label="Points to add or subtract"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="Points (e.g. +200 or -100)"
                type="number"
                className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50"
              />
              <input
                aria-label="Reason for adjustment"
                value={adjustReason}
                maxLength={255}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason for adjustment"
                className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50"
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-sm font-semibold hover:bg-[var(--gold-light)] transition-colors disabled:opacity-60"
              >
                {saving ? "Applying…" : "Apply"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdjust(false)}
                className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
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
                <th className="text-right px-4 py-3 font-medium">
                  Balance After
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {table.rows.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-[var(--secondary)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] font-mono-data">
                    {tx.createdAt}
                  </td>
                  <td className="px-4 py-3 text-xs">{tx.userName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[tx.type]}`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] max-w-48 truncate">
                    {tx.reason}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono-data text-xs font-semibold ${
                      tx.points > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.points > 0 ? "+" : ""}
                    {tx.points}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-data text-xs text-[var(--gold-mid)]">
                    {tx.balanceAfter.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!table.rows.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs text-[var(--muted-foreground)]"
                  >
                    {table.loading ? "Loading the points history…" : "No point activity matches."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...table.pagination} />
      </div>
    </div>
  )
}
