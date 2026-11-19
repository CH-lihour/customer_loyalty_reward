import { useEffect, useState } from "react"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import type { OrderStatus } from "../../data/mockData"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { apiAdminOrderPage, apiSetOrderStatus, type ApiStoreOrder, type OrderStats } from "../../data/api"
import { useApiTable } from "../../data/apiTable"
import { TablePagination } from "../../components/TablePagination"

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
]
const statusColors: Record<OrderStatus, string> = {
  PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  CONFIRMED: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  PROCESSING: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  SHIPPED: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
  CANCELLED: "text-red-400 bg-red-400/10 border-red-400/20",
}
const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
}

/** Customers' orders from the API. Points are awarded when an order is paid; cancelling takes them back. */
export function AdminOrdersPage({ actorId, token }: { actorId: string; token: string }) {
  const { logStaffAction } = useShop()
  const { notify } = useFeedback()
  const [filter, setFilter] = useState<"All" | OrderStatus>("All")
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [stats, setStats] = useState<OrderStats | null>(null)
  const table = useApiTable(
    (page, perPage) =>
      apiAdminOrderPage(token, { page, perPage, search: term, status: filter === "All" ? "" : filter }).then((result) => {
        setStats(result.stats)
        return result
      }),
    [term, filter].join("|"),
  )
  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const [editing, setEditing, modalClosing] = useModalState<ApiStoreOrder | null>(null)
  const [nextStatus, setNextStatus] = useState<OrderStatus>("PENDING")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const openStatusEditor = (order: ApiStoreOrder) => {
    setError("")
    setEditing(order)
    setNextStatus(nextStatuses[order.status][0] ?? order.status)
  }

  const updateStatus = async (order: ApiStoreOrder, status: OrderStatus) => {
    if (saving) return
    setSaving(true)
    setError("")
    try {
      await apiSetOrderStatus(token, order.apiId, status)
      logStaffAction(actorId, `ORDER_${status}`, `Order ${order.id} changed to ${status}`)
      notify(
        status === "CANCELLED" && order.pointsEarned > 0
          ? `Order ${order.id} cancelled. ${order.pointsEarned} points taken back.`
          : `Order ${order.id} changed to ${status}.`,
        "success",
      )
      setEditing(null)
      table.reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const total = stats ? Object.values(stats).reduce((sum, n) => sum + n, 0) : null

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Orders</h1>

      <div className="flex gap-2 flex-wrap items-center">
        {(["All", ...statuses] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? "bg-[var(--gold-mid)] text-[var(--background)]"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
            }`}
          >
            {s}
            {stats && ` (${s === "All" ? total : stats[s]})`}
          </button>
        ))}
        <input
          type="search"
          aria-label="Search orders"
          placeholder="Order number, name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-60 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50"
        />
      </div>

      {table.error && (
        <p role="alert" className="text-sm text-red-400">
          {table.error}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {!table.rows.length && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {table.loading ? "Loading orders…" : term || filter !== "All" ? "No orders match." : "No orders yet."}
          </p>
        )}
        {table.rows.map((o) => (
          <div
            key={o.id}
            className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]"
          >
            <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
              <div>
                <span className="font-mono-data text-sm font-semibold">
                  {o.id}
                </span>
                <span className="ml-3 text-sm text-[var(--muted-foreground)]">
                  {o.customerName}
                  {o.customerEmail && ` · ${o.customerEmail}`}
                </span>
                <span className="ml-3 text-xs text-[var(--muted-foreground)]">
                  {o.createdAt}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[o.status]}`}
                >
                  {o.status}
                </span>
                {nextStatuses[o.status].length > 0 && (
                  <button
                    onClick={() => openStatusEditor(o)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-2 py-1 text-xs text-[var(--gold-mid)]"
                  >
                    Change status
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {o.items.map((item) => (
                <span
                  key={item.productId}
                  className="text-xs bg-[var(--secondary)] rounded-full px-2 py-0.5 text-[var(--muted-foreground)]"
                >
                  {item.name} ×{item.qty}
                </span>
              ))}
            </div>
            {o.deliveryAddress && (
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                Deliver to: {o.deliveryAddress} · {o.deliveryPhone}
              </p>
            )}
            {o.payment && (
              <p className="mb-3 text-xs text-green-400">
                Paid by KHQR · {o.payment.currency === "KHR" ? `${Number(o.payment.amount).toLocaleString()} ៛` : `$${o.payment.amount}`} on{" "}
                {o.payment.paidAt.slice(0, 10)} · Transaction{" "}
                <span className="font-mono-data">{o.payment.transactionId}</span>
              </p>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)]">
                Order Total
              </span>
              <div className="flex items-center gap-3">
                {o.pointsEarned > 0 && (
                  <span className="text-xs text-[var(--gold-mid)]">
                    {o.status === "CANCELLED"
                      ? `${o.pointsEarned} pts taken back`
                      : `+${o.pointsEarned} pts awarded`}
                  </span>
                )}
                <span className="font-semibold">${o.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <TablePagination {...table.pagination} />
      {editing && (
        <AdminModal
          closing={modalClosing}
          title={`Change status for ${editing.id}`}
          onClose={() => setEditing(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              updateStatus(editing, nextStatus)
            }}
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              Current status: {editing.status}
            </p>
            {nextStatus === "CANCELLED" && editing.pointsEarned > 0 && (
              <p className="text-sm text-yellow-400">
                Cancelling takes back the {editing.pointsEarned} points this order earned.
              </p>
            )}
            <label className="block text-sm">
              New status
              <select
                value={nextStatus}
                onChange={(event) =>
                  setNextStatus(event.target.value as OrderStatus)
                }
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
              >
                {nextStatuses[editing.status].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Status"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg bg-[var(--secondary)] px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  )
}
