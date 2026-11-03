import { useEffect, useState, type FormEvent } from "react"
import { useShop, type Campaign } from "../../data/shop"
import { apiDeleteCampaign, apiSaveCampaign, apiSetCampaignActive } from "../../data/api"
import { useApiCampaigns } from "../../data/campaignSync"
import { useFeedback } from "../../components/FeedbackProvider"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { ActionIconButton } from "../../components/ActionIconButton"
const blank = (): Campaign => ({
  id: "",
  name: "",
  nameKh: "",
  description: "",
  multiplier: 2,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  active: true,
  image: "",
  bannerTitle: "",
  bannerSubtitle: "",
  buttonLabel: "",
  linkUrl: "",
  showOnHome: false,
  sortOrder: 0,
})
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
export function AdminCampaignsPage({
  actorId,
  token,
}: {
  actorId: string
  token: string
}) {
  const { campaigns, logStaffAction } = useShop()
  const { loadError, reload } = useApiCampaigns(token)
  const { notify, confirm } = useFeedback()
  const [editing, setEditing, modalClosing] = useModalState<Campaign | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  // Show a picked file before it is uploaded; free its object URL when it changes.
  useEffect(() => {
    if (!imageFile) return setPreview("")
    const url = URL.createObjectURL(imageFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])
  const set = <K extends keyof Campaign>(key: K, value: Campaign[K]) =>
    setEditing((c) => (c ? { ...c, [key]: value } : c))
  const open = (campaign: Campaign) => {
    setError("")
    setImageFile(null)
    setEditing(campaign)
  }
  const close = () => {
    setEditing(null)
    setError("")
    setImageFile(null)
  }
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || saving) return
    if (
      !editing.name.trim() ||
      editing.multiplier < 1 ||
      (editing.endDate && editing.endDate < editing.startDate)
    ) {
      setError("Enter a name, multiplier of at least 1, and valid date range.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await apiSaveCampaign(token, { ...editing, name: editing.name.trim() }, imageFile)
      await reload()
      logStaffAction(
        actorId,
        editing.id ? "CAMPAIGN_UPDATED" : "CAMPAIGN_CREATED",
        `${editing.id ? "Updated" : "Created"} campaign ${editing.name.trim()}`,
      )
      close()
      notify("Campaign saved.", "success")
    } catch (failure) {
      setError((failure as Error).message)
      notify((failure as Error).message, "error")
    } finally {
      setSaving(false)
    }
  }
  const toggle = async (c: Campaign) => {
    try {
      await apiSetCampaignActive(token, c.id, !c.active)
      await reload()
      logStaffAction(actorId, "CAMPAIGN_UPDATED", `${c.active ? "Deactivated" : "Activated"} campaign ${c.name}`)
      notify(`Campaign ${c.active ? "deactivated" : "activated"}.`, "success")
    } catch (failure) {
      notify((failure as Error).message, "error")
    }
  }
  const remove = async (c: Campaign) => {
    if (!(await confirm(`Delete ${c.name}?`))) return
    try {
      await apiDeleteCampaign(token, c.id)
      await reload()
      logStaffAction(actorId, "CAMPAIGN_DELETED", `Deleted campaign ${c.name}`)
      notify(`${c.name} deleted.`, "success")
    } catch (failure) {
      notify((failure as Error).message, "error")
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  const bannerImage = preview || editing?.image
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Bonus Campaigns</h1>
        <button
          onClick={() => open(blank())}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Campaign
        </button>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        The highest active campaign multiplier applies when an order is
        completed. Campaigns shown on home appear in the customer home-page
        banner while they are live.
      </p>
      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load campaigns: {loadError}
        </p>
      )}
      {editing && (
        <AdminModal
          closing={modalClosing}
          title={editing.id ? "Edit Campaign" : "New Campaign"}
          onClose={close}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                Name
                <input
                  required
                  maxLength={100}
                  className={field}
                  value={editing.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Khmer name
                <input
                  className={field}
                  value={editing.nameKh ?? ""}
                  onChange={(e) => set("nameKh", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Multiplier
                <input
                  required
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  className={field}
                  value={editing.multiplier}
                  onChange={(e) => set("multiplier", Number(e.target.value))}
                />
              </label>
              <label className="text-xs">
                Start date
                <input
                  required
                  type="date"
                  className={field}
                  value={editing.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </label>
              <label className="text-xs">
                End date (blank for no end)
                <input
                  type="date"
                  className={field}
                  value={editing.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </label>
              <label className="text-xs sm:col-span-2">
                Description
                <textarea
                  maxLength={1000}
                  className={field}
                  value={editing.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => set("active", e.target.checked)}
                />{" "}
                Active
              </label>
            </div>
            <fieldset className="space-y-3 rounded-xl border border-[var(--border)] p-4">
              <legend className="px-1 text-sm font-semibold">Home-page banner</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.showOnHome}
                  onChange={(e) => set("showOnHome", e.target.checked)}
                />{" "}
                Show on the customer home page
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  Banner title (defaults to the name)
                  <input
                    maxLength={120}
                    className={field}
                    value={editing.bannerTitle ?? ""}
                    onChange={(e) => set("bannerTitle", e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Display order
                  <input
                    type="number"
                    min="0"
                    className={field}
                    value={editing.sortOrder ?? 0}
                    onChange={(e) => set("sortOrder", Number(e.target.value))}
                  />
                </label>
                <label className="text-xs sm:col-span-2">
                  Banner subtitle
                  <input
                    maxLength={255}
                    className={field}
                    value={editing.bannerSubtitle ?? ""}
                    onChange={(e) => set("bannerSubtitle", e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Button label
                  <input
                    maxLength={40}
                    placeholder="Shop now"
                    className={field}
                    value={editing.buttonLabel ?? ""}
                    onChange={(e) => set("buttonLabel", e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Button link
                  <input
                    placeholder="/products or https://…"
                    className={field}
                    value={editing.linkUrl ?? ""}
                    onChange={(e) => set("linkUrl", e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Image URL
                  <input
                    type="url"
                    disabled={!!imageFile}
                    className={field}
                    value={editing.image ?? ""}
                    onChange={(e) => set("image", e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Or upload an image (JPG, PNG or WebP, up to 4 MB)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={field}
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {bannerImage && (
                <img
                  src={bannerImage}
                  alt="Banner preview"
                  className="aspect-[3/1] w-full rounded-lg object-cover"
                />
              )}
            </fieldset>
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
                {saving ? "Saving…" : "Save Campaign"}
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
      <div className="space-y-3">
        {campaigns.length ? (
          campaigns.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                {c.image && (
                  <img
                    src={c.image}
                    alt=""
                    className="h-12 w-24 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <strong>{c.name}</strong>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {c.startDate} → {c.endDate || "no end"} · {c.multiplier}× points ·{" "}
                    {c.active && c.startDate <= today && (!c.endDate || c.endDate >= today)
                      ? "Live"
                      : c.active
                        ? "Scheduled or ended"
                        : "Inactive"}
                    {c.showOnHome && " · On home banner"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ActionIconButton action="edit" label={`Edit ${c.name}`} onClick={() => open(c)} />
                <ActionIconButton
                  action={c.active ? "deactivate" : "activate"}
                  label={`${c.active ? "Deactivate" : "Activate"} ${c.name}`}
                  onClick={() => void toggle(c)}
                />
                <ActionIconButton
                  action="delete"
                  label={`Delete ${c.name}`}
                  onClick={() => void remove(c)}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No campaigns configured.
          </p>
        )}
      </div>
    </div>
  )
}
