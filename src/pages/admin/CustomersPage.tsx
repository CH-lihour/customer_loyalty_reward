import { useEffect, useState } from "react"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import type { Tier } from "../../data/mockData"
import { tierOrder } from "../../data/tiers"
import { TierBadge } from "../../components/TierBadge"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { ActionIconButton } from "../../components/ActionIconButton"
import { TablePagination, usePagedRows } from "../../components/TablePagination"
import { apiCustomerPage, apiSetCustomerTier, apiStorefrontTiers, type AdminTier } from "../../data/api"
import { useApiTable } from "../../data/apiTable"

const riskLabel = (lastOrder: string) => {
  if (!lastOrder)
    return { label: "No Orders", color: "text-[var(--muted-foreground)] bg-[var(--secondary)]" }
  const days = Math.floor(
    (Date.now() - new Date(lastOrder).getTime()) / 86400000,
  )
  if (days < 30)
    return { label: "Low Risk", color: "text-green-400 bg-green-400/10" }
  if (days < 60)
    return { label: "Medium Risk", color: "text-yellow-400 bg-yellow-400/10" }
  return { label: "High Risk", color: "text-red-400 bg-red-400/10" }
}

export function AdminCustomersPage({ token = null }: { token?: string | null }) {
  const { customers: storeCustomers, tiers, tierOverrides, overrideTier } = useShop()
  const { notify } = useFeedback()
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState("All")
  const [saving, setSaving] = useState(false)
  // With a staff token the table lists the customers registered in the API, paged and filtered there.
  const live = Boolean(token)
  const [apiTiers, setApiTiers] = useState<AdminTier[]>([])
  useEffect(() => {
    if (token) apiStorefrontTiers().then(setApiTiers, () => {})
  }, [token])
  const apiTable = useApiTable(
    (page, perPage) => token
      ? apiCustomerPage(token, { page, perPage, search: search.trim(), tier: tierFilter === "All" ? "" : tierFilter })
      : Promise.resolve({ rows: [], meta: { current_page: 1, per_page: perPage, total: 0, last_page: 1 } }),
    `${search.trim()}|${tierFilter}`,
  )
  const customers = live ? apiTable.rows : storeCustomers
  const [editingId, setEditingId, modalClosing] = useModalState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState("Auto")
  const [reason, setReason] = useState("")
  const editingCustomer = customers.find(
    (customer) => customer.id === editingId,
  )

  const openTierEditor = (id: string) => {
    setEditingId(id)
    setSelectedTier(live ? "Auto" : tierOverrides[id] ?? "Auto")
    setReason("")
  }

  const filtered = live ? customers : customers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchTier = tierFilter === "All" || c.tier === tierFilter
    return matchSearch && matchTier
  })
  const localTable = usePagedRows(filtered)
  const table = live ? { rows: apiTable.rows, pagination: apiTable.pagination } : localTable
  const saveApiTier = async (customerId: string, name: string, reasonText: string) => {
    if (!token) return
    const tierId = selectedTier === "Auto" ? null : Number(apiTiers.find((t) => t.name === selectedTier)?.id)
    setSaving(true)
    try {
      await apiSetCustomerTier(token, customerId, tierId, reasonText)
      notify(`${name}'s tier updated.`, "success")
      setEditingId(null)
      apiTable.reload()
    } catch (e) {
      notify((e as Error).message, "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Customers</h1>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50 w-48"
          />
          {["All", ...tierOrder(tiers)].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tierFilter === t
                  ? "bg-[var(--gold-mid)] text-[var(--background)]"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr className="text-[var(--muted-foreground)] text-xs">
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Province</th>
                <th className="text-left px-4 py-3 font-medium">Tier</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">Spent</th>
                <th className="text-right px-4 py-3 font-medium">Orders</th>
                <th className="text-right px-4 py-3 font-medium">Retention</th>
                <th className="text-right px-4 py-3 font-medium">
                  Tier Override
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {table.rows.map((c) => {
                const risk = riskLabel(c.lastOrder)
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[var(--secondary)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <div className="font-medium text-xs">{c.name}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {c.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">
                      {c.province}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={c.tier} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono-data text-xs text-[var(--gold-mid)]">
                      {c.points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      ${c.totalSpent}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono-data">
                      {c.ordersCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${risk.color}`}
                      >
                        {risk.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!live && <span className="text-xs text-[var(--muted-foreground)]">{tierOverrides[c.id] ?? "Auto"}</span>}
                        <ActionIconButton action="edit" label={`Edit ${c.name}'s tier`} onClick={() => openTierEditor(c.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {live && !apiTable.loading && !apiTable.rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                    {apiTable.error || "No customers found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...table.pagination} />
      </div>
      {editingCustomer && (
        <AdminModal
          closing={modalClosing}
          title={`Tier override for ${editingCustomer.name}`}
          onClose={() => setEditingId(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!reason.trim()) {
                notify("Enter a reason for the tier change.", "error")
                return
              }
              if (live) {
                void saveApiTier(editingCustomer.id, editingCustomer.name, reason.trim())
                return
              }
              overrideTier(
                editingCustomer.id,
                selectedTier === "Auto" ? undefined : selectedTier as Tier,
                reason.trim(),
              )
              notify(`${editingCustomer.name}'s tier updated.`, "success")
              setEditingId(null)
            }}
          >
            <label className="block text-sm">
              Tier
              <select
                value={selectedTier}
                onChange={(event) => setSelectedTier(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
              >
                <option value="Auto">{live ? "Auto (from qualifying points)" : "Auto"}</option>
                {tierOrder(tiers).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Reason
              <textarea
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]"
              >
                Save Override
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
