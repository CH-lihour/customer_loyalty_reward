import { useEffect, useRef, useState, type FormEvent } from "react"
import { type Reward, type Tier } from "../../data/mockData"
import { useShop } from "../../data/shop"
import {
  apiDeleteReward,
  apiRewardTierOptions,
  apiSaveReward,
  apiSetRewardActive,
} from "../../data/api"
import { useApiRewards } from "../../data/rewardSync"
import { useFeedback } from "../../components/FeedbackProvider"
import { tierOrder } from "../../data/tiers"
import { TierBadge } from "../../components/TierBadge"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { ActionIconButton } from "../../components/ActionIconButton"
import { ImagePreviewDialog } from "../../components/ImagePreviewDialog"

const blank = (minTier: Tier): Reward => ({
  id: "",
  name: "",
  nameKh: "",
  description: "",
  pointsCost: 100,
  stock: 0,
  minTier,
  active: true,
  category: "Discount",
  image:
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300&h=200&fit=crop&auto=format",
})
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
export function AdminRewardsPage({
  actorId,
  token,
}: {
  actorId: string
  token: string
}) {
  const { rewards, tiers, availableFor, stockItemFor, rewardDeleteBlocker, logStaffAction } = useShop()
  const { loadError, reload } = useApiRewards(token)
  const { notify, confirm } = useFeedback()
  const [editing, setEditing, modalClosing] = useModalState<Reward | null>(null)
  const [previewId, setPreviewId, previewClosing] = useModalState<string | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  // Tier ids for the minimum-tier choice; staff without the tiers page still get them here.
  const [tierOptions, setTierOptions] = useState<{ id: number; name: string }[]>([])
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  useEffect(() => {
    let cancelled = false
    apiRewardTierOptions(token).then(
      (options) => !cancelled && setTierOptions(options),
      (failure: Error) => !cancelled && notifyRef.current(failure.message, "error"),
    )
    return () => {
      cancelled = true
    }
  }, [token])
  const tierNames = tierOptions.length ? tierOptions.map((t) => t.name) : tierOrder(tiers)
  const previewReward = rewards.find((reward) => reward.id === previewId)
  const change = <K extends keyof Reward>(key: K, value: Reward[K]) =>
    setEditing((r) => (r ? { ...r, [key]: value } : r))
  const open = (reward: Reward) => {
    setError("")
    setImageFile(null)
    setEditing(reward)
  }
  const close = () => {
    setEditing(null)
    setError("")
    setImageFile(null)
  }
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || saving) return
    if (!editing.name.trim() || editing.pointsCost < 1) {
      setError("Enter a name and a positive point cost.")
      return
    }
    const minTierId = tierOptions.find((t) => t.name === editing.minTier)?.id
    if (!minTierId) {
      setError("Choose a minimum tier.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await apiSaveReward(
        token,
        { ...editing, name: editing.name.trim(), category: editing.category.trim() },
        minTierId,
        imageFile,
      )
      await reload()
      logStaffAction(
        actorId,
        editing.id ? "REWARD_UPDATED" : "REWARD_CREATED",
        `${editing.id ? "Updated" : "Created"} reward ${editing.name.trim()}`,
      )
      close()
      notify("Reward saved.", "success")
    } catch (failure) {
      setError((failure as Error).message)
      notify((failure as Error).message, "error")
    } finally {
      setSaving(false)
    }
  }
  const toggle = async (r: Reward) => {
    try {
      await apiSetRewardActive(token, r.id, !r.active)
      await reload()
      logStaffAction(
        actorId,
        "REWARD_UPDATED",
        `${r.active ? "Deactivated" : "Activated"} reward ${r.name}`,
      )
      notify(`Reward ${r.active ? "deactivated" : "activated"}.`, "success")
    } catch (failure) {
      notify((failure as Error).message, "error")
    }
  }
  const remove = async (r: Reward) => {
    if (!(await confirm(`Delete ${r.name}?`))) return
    const blocker = rewardDeleteBlocker(r.id)
    if (blocker) {
      notify(blocker, "error")
      return
    }
    try {
      await apiDeleteReward(token, r.id)
      await reload()
      logStaffAction(actorId, "REWARD_DELETED", `Deleted reward ${r.name}`)
      notify(`${r.name} deleted.`, "success")
    } catch (failure) {
      notify((failure as Error).message, "error")
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Rewards Catalog</h1>
        <button
          onClick={() => open(blank(tierNames[0] ?? ""))}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Reward
        </button>
      </div>
      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load rewards: {loadError}
        </p>
      )}
      {editing && (
        <AdminModal
          closing={modalClosing}
          title={editing.id ? "Edit Reward" : "New Reward"}
          onClose={close}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs">
                Name
                <input
                  required
                  maxLength={255}
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
                  maxLength={50}
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
                  {[...new Set([...tierNames, editing.minTier])].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs sm:col-span-2 lg:col-span-3">
                Description
                <textarea
                  maxLength={2000}
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
                  disabled={!!imageFile}
                  className={field}
                  value={editing.image}
                  onChange={(e) => change("image", e.target.value)}
                />
              </label>
              <label className="text-xs sm:col-span-2 lg:col-span-3">
                Or upload an image (JPG, PNG or WebP, up to 4 MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={field}
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
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
              <button
                disabled={saving}
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-[var(--background)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Reward"}
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-[var(--secondary)] px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <ActionIconButton action="edit" label={`Edit ${r.name}`} onClick={() => open(r)} />
                <ActionIconButton
                  action={r.active ? "deactivate" : "activate"}
                  label={`${r.active ? "Deactivate" : "Activate"} ${r.name}`}
                  onClick={() => void toggle(r)}
                />
                <ActionIconButton
                  action="delete"
                  label={`Delete ${r.name}`}
                  onClick={() => void remove(r)}
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
