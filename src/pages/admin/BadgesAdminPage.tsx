import { useState, type FormEvent } from "react"
import { type Badge } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import { AdminModal } from "../../components/AdminModal"
const blank = (): Badge => ({
  id: "",
  code: "",
  name: "",
  nameKh: "",
  description: "",
  icon: "ðŸ…",
  color: "#e8a634",
  metric: "orders",
  threshold: 1,
})
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
export function AdminBadgesPage() {
  const { badges, customers, saveBadge, deleteBadge } = useShop()
  const { notify, confirm } = useFeedback()
  const [editing, setEditing] = useState<Badge | null>(null)
  const [error, setError] = useState("")
  const change = <K extends keyof Badge>(key: K, value: Badge[K]) =>
    setEditing((b) => (b ? { ...b, [key]: value } : b))
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (
      !editing ||
      !editing.name.trim() ||
      !editing.code.trim() ||
      (editing.metric && (!editing.threshold || editing.threshold < 1))
    ) {
      setError("Enter a code, name, and positive threshold.")
      return
    }
    if (badges.some((b) => b.id !== editing.id && b.code === editing.code)) {
      setError("Badge code already exists.")
      return
    }
    saveBadge({ ...editing, id: editing.id || `b-${Date.now()}` })
    setEditing(null)
    setError("")
    notify("Badge saved.", "success")
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Badges</h1>
        <button
          onClick={() => setEditing(blank())}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Badge
        </button>
      </div>
      {editing && (
        <AdminModal
          title={editing.id ? "Edit Badge" : "New Badge"}
          onClose={() => {
            setEditing(null)
            setError("")
          }}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs">
                Code
                <input
                  required
                  disabled={!!editing.id}
                  className={field}
                  value={editing.code}
                  onChange={(e) =>
                    change(
                      "code",
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
                    )
                  }
                />
              </label>
              <label className="text-xs">
                Name
                <input
                  required
                  className={field}
                  value={editing.name}
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Khmer name
                <input
                  className={field}
                  value={editing.nameKh}
                  onChange={(e) => change("nameKh", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Icon
                <input
                  className={field}
                  value={editing.icon}
                  onChange={(e) => change("icon", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Condition
                <select
                  className={field}
                  value={editing.metric ?? "orders"}
                  onChange={(e) =>
                    change("metric", e.target.value as Badge["metric"])
                  }
                >
                  <option value="orders">Completed orders</option>
                  <option value="spend">Total spend (USD)</option>
                  <option value="referrals">Successful referrals</option>
                  <option value="qualifyingPoints">Qualifying points</option>
                </select>
              </label>
              <label className="text-xs">
                Threshold
                <input
                  type="number"
                  min="1"
                  className={field}
                  value={editing.threshold ?? 1}
                  onChange={(e) => change("threshold", Number(e.target.value))}
                />
              </label>
              <label className="text-xs sm:col-span-2 lg:col-span-3">
                Description
                <input
                  className={field}
                  value={editing.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-[var(--background)]">
                Save Badge
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setError("")
                }}
                className="rounded-lg bg-[var(--secondary)] px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex gap-4">
              <span className="text-4xl">{b.icon}</span>
              <div className="flex-1">
                <strong>{b.name}</strong>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {b.description}
                </p>
                <p className="mt-2 text-xs text-[var(--gold-mid)]">
                  {customers.filter((c) => c.badges.includes(b.code)).length}{" "}
                  customers earned this
                </p>
                <div className="mt-3 flex gap-3 text-sm">
                  <button
                    onClick={() =>
                      setEditing({
                        ...b,
                        metric:
                          b.metric ??
                          (b.code.includes("ORDER") ||
                          b.code === "FIRST_PURCHASE"
                            ? "orders"
                            : b.code === "BIG_SPENDER"
                              ? "spend"
                              : b.code === "REFERRAL_CHAMPION"
                                ? "referrals"
                                : "qualifyingPoints"),
                        threshold:
                          b.threshold ??
                          (b.code === "TEN_ORDERS"
                            ? 10
                            : b.code === "FIVE_ORDERS"
                              ? 5
                              : b.code === "BIG_SPENDER"
                                ? 500
                                : b.code === "REFERRAL_CHAMPION"
                                  ? 5
                                  : b.code === "POINT_COLLECTOR"
                                    ? 1000
                                    : 1),
                      })
                    }
                    className="text-[var(--gold-mid)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      void confirm(`Delete ${b.name}?`).then((ok) => {
                        if (ok) {
                          deleteBadge(b.id)
                          notify(`${b.name} deleted.`, "success")
                        }
                      })
                    }}
                    className="text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
