import { useState } from "react"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import type { OrderStatus } from "../../data/mockData"
import { AdminModal } from "../../components/AdminModal"

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

export function AdminOrdersPage() {
  const { orders, updateOrderStatus } = useShop()
  const { notify } = useFeedback()
  const [filter, setFilter] = useState<"All" | OrderStatus>("All")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<OrderStatus>("PENDING")
  const editingOrder = orders.find((order) => order.id === editingId)

  const openStatusEditor = (id: string, status: OrderStatus) => {
    setEditingId(id)
    setNextStatus(nextStatuses[status][0] ?? status)
  }

  const filtered = orders.filter((o) => filter === "All" || o.status === filter)

  const updateStatus = (id: string, status: OrderStatus) => {
    updateOrderStatus(id, status)
    notify(`Order ${id} changed to ${status}.`, "success")
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Orders</h1>

      <div className="flex gap-2 flex-wrap">
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
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((o) => (
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
                    onClick={() => openStatusEditor(o.id, o.status)}
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

            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)]">
                Order Total
              </span>
              <div className="flex items-center gap-3">
                {o.pointsEarned > 0 && (
                  <span className="text-xs text-[var(--gold-mid)]">
                    +{o.pointsEarned} pts awarded
                  </span>
                )}
                <span className="font-semibold">${o.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editingOrder && (
        <AdminModal
          title={`Change status for ${editingOrder.id}`}
          onClose={() => setEditingId(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              updateStatus(editingOrder.id, nextStatus)
              setEditingId(null)
            }}
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              Current status: {editingOrder.status}
            </p>
            <label className="block text-sm">
              New status
              <select
                value={nextStatus}
                onChange={(event) =>
                  setNextStatus(event.target.value as OrderStatus)
                }
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
              >
                {nextStatuses[editingOrder.status].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]"
              >
                Save Status
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
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
