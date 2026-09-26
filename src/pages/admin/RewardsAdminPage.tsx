import { useState, type FormEvent } from "react"
import { type Reward, type Tier } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import { TierBadge } from "../../components/TierBadge"
import { AdminModal } from "../../components/AdminModal"

const blank = (): Reward => ({
  id: "",
  name: "",
  nameKh: "",
  description: "",
  pointsCost: 100,
  stock: 0,
  minTier: "Silver",
  active: true,
  category: "Discount",
  image: "",
})
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
export function AdminRewardsPage() {
  const { rewards, saveReward, deleteReward } = useShop()
  const { notify, confirm } = useFeedback()
  const [editing, setEditing] = useState<Reward | null>(null)
  const [error, setError] = useState("")
  const change = <K extends keyof Reward>(key: K, value: Reward[K]) =>
    setEditing((r) => (r ? { ...r, [key]: value } : r))
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (
      !editing ||
      !editing.name.trim() ||
      editing.pointsCost < 1 ||
      editing.stock < 0
    ) {
      setError("Enter a name, positive point cost, and valid stock.")
      return
    }
    saveReward({
      ...editing,
      id: editing.id || `r-${Date.now()}`,
      image:
        editing.image ||
        "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300&h=200&fit=crop&auto=format",
    })
    setEditing(null)
    setError("")
    notify("Reward saved.", "success")
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Rewards Catalog</h1>
        <button
          onClick={() => setEditing(blank())}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Reward
        </button>
      </div>
      {editing && (
        <AdminModal
          title={editing.id ? "Edit Reward" : "New Reward"}
          onClose={() => {
            setEditing(null)
            setError("")
          }}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                Category
                <input
                  className={field}
                  value={editing.category}
                  onChange={(e) => change("category", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Point cost
                <input
                  required
                  min="1"
                  type="number"
                  className={field}
                  value={editing.pointsCost}
                  onChange={(e) => change("pointsCost", Number(e.target.value))}
                />
              </label>
              <label className="text-xs">
                Stock
                <input
                  required
                  min="0"
                  type="number"
                  className={field}
                  value={editing.stock}
                  onChange={(e) => change("stock", Number(e.target.value))}
                />
              </label>
              <label className="text-xs">
                Minimum tier
                <select
                  className={field}
                  value={editing.minTier}
                  onChange={(e) => change("minTier", e.target.value as Tier)}
                >
                  {(["Silver", "Gold", "Platinum"] as const).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs sm:col-span-2 lg:col-span-3">
                Description
                <textarea
                  className={field}
                  value={editing.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Expires on
                <input
                  type="date"
                  className={field}
                  value={editing.expiresAt ?? ""}
                  onChange={(e) => change("expiresAt", e.target.value)}
                />
              </label>
              <label className="text-xs sm:col-span-2">
                Image URL
                <input
                  type="url"
                  className={field}
                  value={editing.image}
                  onChange={(e) => change("image", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => change("active", e.target.checked)}
                />{" "}
                Active
              </label>
            </div>
            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-[var(--background)]">
                Save Reward
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r) => (
          <div
            key={r.id}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
          >
            <img src={r.image} alt="" className="h-28 w-full object-cover" />
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <strong>{r.name}</strong>
                <TierBadge tier={r.minTier} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {r.description}
              </p>
              <p className="text-sm text-[var(--gold-mid)]">
                {r.pointsCost} pts Â· {r.stock} in stock Â·{" "}
                {r.active ? "Active" : "Inactive"}
              </p>
              <div className="flex gap-3 text-sm">
                <button
                  onClick={() => setEditing(r)}
                  className="text-[var(--gold-mid)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    saveReward({ ...r, active: !r.active })
                    notify(
                      `Reward ${r.active ? "deactivated" : "activated"}.`,
                      "success",
                    )
                  }}
                >
                  {r.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    void confirm(`Delete ${r.name}?`).then((ok) => {
                      if (ok) {
                        deleteReward(r.id)
                        notify(`${r.name} deleted.`, "success")
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
        ))}
      </div>
    </div>
  )
}
