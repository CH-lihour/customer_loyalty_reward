import { useState, type FormEvent } from "react"
import { type Badge } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { apiDeleteBadge, apiSaveBadge, type AdminBadge } from "../../data/api"
import { useApiBadges } from "../../data/badgeSync"
import { useFeedback } from "../../components/FeedbackProvider"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { ActionIconButton } from "../../components/ActionIconButton"
import { Icon, iconName } from "../../components/Icon"
const blank = (): Badge => ({
  id: "",
  code: "",
  name: "",
  nameKh: "",
  description: "",
  icon: "medal",
  color: "#e8a634",
  metric: "orders",
  threshold: 1,
})
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
export function AdminBadgesPage({
  actorId,
  token,
}: {
  actorId: string
  token: string
}) {
  const shop = useShop()
  const { badges, loading, loadError, reload } = useApiBadges(token)
  const { notify, confirm } = useFeedback()
  const [editing, setEditing, modalClosing] = useModalState<Badge | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const change = <K extends keyof Badge>(key: K, value: Badge[K]) =>
    setEditing((b) => (b ? { ...b, [key]: value } : b))
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || saving) return
    if (
      !editing.name.trim() ||
      !editing.code.trim() ||
      !editing.threshold ||
      editing.threshold < 1
    ) {
      setError("Enter a code, name, and positive threshold.")
      return
    }
    if (badges.some((b) => b.id !== editing.id && b.code === editing.code)) {
      setError("Badge code already exists.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await apiSaveBadge(token, { ...editing, name: editing.name.trim() })
      await reload()
      shop.logStaffAction(
        actorId,
        editing.id ? "BADGE_UPDATED" : "BADGE_CREATED",
        `${editing.id ? "Updated" : "Created"} badge ${editing.code}`,
      )
      setEditing(null)
      notify("Badge saved.", "success")
    } catch (failure) {
      setError((failure as Error).message)
      notify((failure as Error).message, "error")
    } finally {
      setSaving(false)
    }
  }
  const remove = async (b: AdminBadge) => {
    const ok = await confirm(
      b.customerCount
        ? `Delete ${b.name}? ${b.customerCount} customer${b.customerCount === 1 ? "" : "s"} will lose this badge.`
        : `Delete ${b.name}?`,
    )
    if (!ok) return
    try {
      await apiDeleteBadge(token, b.id)
      await reload()
      shop.logStaffAction(actorId, "BADGE_DELETED", `Deleted badge ${b.code}`)
      notify(`${b.name} deleted.`, "success")
    } catch (failure) {
      notify((failure as Error).message, "error")
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Badges</h1>
        <button
          onClick={() => {
            setError("")
            setEditing(blank())
          }}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Badge
        </button>
      </div>
      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load badges: {loadError}
        </p>
      )}
      {editing && (
        <AdminModal
          closing={modalClosing}
          title={editing.id ? "Edit Badge" : "New Badge"}
          onClose={() => {
            setEditing(null)
            setError("")
          }}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs">
                Code
                <input
                  required
                  maxLength={50}
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
                  maxLength={100}
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
                <select
                  className={field}
                  value={iconName(editing.icon)}
                  onChange={(e) => change("icon", e.target.value)}
                >
                  {[
                    ["medal", "Medal"], ["star", "Star"], ["trophy", "Trophy"],
                    ["gift", "Gift"], ["cart", "Cart"], ["heart", "Heart"],
                    ["gem", "Gem"], ["users", "Referrals"], ["rocket", "Rocket"],
                  ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
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
                  <option value="membershipDays">Days as a member</option>
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
                  maxLength={500}
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
              <button
                disabled={saving}
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-[var(--background)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Badge"}
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex gap-4">
              <Icon name={b.icon} className="h-10 w-10 shrink-0 text-[var(--gold-mid)]" />
              <div className="flex-1">
                <strong>{b.name}</strong>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {b.description}
                </p>
                <p className="mt-2 text-xs text-[var(--gold-mid)]">
                  {b.customerCount} customers earned this
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <ActionIconButton
                    action="edit"
                    label={`Edit ${b.name}`}
                    onClick={() => {
                      setError("")
                      setEditing({
                        ...b,
                        metric: b.metric ?? "orders",
                        threshold: b.threshold ?? 1,
                      })
                    }}
                  />
                  <ActionIconButton
                    action="delete"
                    label={`Delete ${b.name}`}
                    onClick={() => void remove(b)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        {!badges.length && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {loading ? "Loading badges…" : "No badges yet."}
          </p>
        )}
      </div>
    </div>
  )
}
