import { useState, type FormEvent } from "react"
import { type Reward, type Tier } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import { TierBadge } from "../../components/TierBadge"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { ActionIconButton } from "../../components/ActionIconButton"
import { ImagePreviewDialog } from "../../components/ImagePreviewDialog"

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
  const { rewards, saveReward, deleteReward, availableFor, stockItemFor } = useShop()
  const { notify, confirm } = useFeedback()
  const [editing, setEditing, modalClosing] = useModalState<Reward | null>(null)
  const [previewId, setPreviewId, previewClosing] = useModalState<string | null>(null)
  const [error, setError] = useState("")
  const previewReward = rewards.find((reward) => reward.id === previewId)
  const change = <K extends keyof Reward>(key: K, value: Reward[K]) =>
    setEditing((r) => (r ? { ...r, [key]: value } : r))
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !editing.name.trim() || editing.pointsCost < 1) {
      setError("Enter a name and a positive point cost.")
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
          closing={modalClosing}
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
              <p className="self-end pb-2 text-xs text-[var(--muted-foreground)]">
                Stock is managed in Inventory → Stock Levels.
              </p>
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
            <button type="button" onClick={() => setPreviewId(r.id)} aria-label={`Inspect image of ${r.name}`} className="block h-28 w-full cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-mid)]">
              <img src={r.image} alt="" className="h-full w-full object-cover" />
            </button>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <strong>{r.name}</strong>
                <TierBadge tier={r.minTier} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {r.description}
              </p>
              <p className="text-sm text-[var(--gold-mid)]">
                {r.pointsCost} pts · {availableFor(r.id)} available ·{" "}
                {r.active ? "Active" : "Inactive"}
                <span className="block font-mono-data text-xs text-[var(--muted-foreground)]">{stockItemFor(r.id).sku}</span>
              </p>
              <div className="flex items-center gap-2 text-sm">
                <ActionIconButton action="edit" label={`Edit ${r.name}`} onClick={() => setEditing(r)} />
                <ActionIconButton
                  action={r.active ? "deactivate" : "activate"}
                  label={`${r.active ? "Deactivate" : "Activate"} ${r.name}`}
                  onClick={() => {
                    saveReward({ ...r, active: !r.active })
                    notify(
                      `Reward ${r.active ? "deactivated" : "activated"}.`,
                      "success",
                    )
                  }}
                />
                <ActionIconButton
                  action="delete"
                  label={`Delete ${r.name}`}
                  onClick={() => {
                    void confirm(`Delete ${r.name}?`).then((ok) => {
                      if (!ok) return
                      const result = deleteReward(r.id)
                      notify(result ?? `${r.name} deleted.`, result ? "error" : "success")
                    })
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {previewReward && <ImagePreviewDialog image={previewReward.image} name={previewReward.name} onClose={() => setPreviewId(null)} closing={previewClosing} />}
    </div>
  )
}
