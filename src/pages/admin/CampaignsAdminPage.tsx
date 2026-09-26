import { useState, type FormEvent } from "react"
import { useShop, type Campaign } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import { AdminModal } from "../../components/AdminModal"
const blank = (): Campaign => ({
  id: "",
  name: "",
  multiplier: 2,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  active: true,
})
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
export function AdminCampaignsPage() {
  const { campaigns, saveCampaign, deleteCampaign } = useShop()
  const { notify, confirm } = useFeedback()
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [error, setError] = useState("")
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (
      !editing ||
      !editing.name.trim() ||
      editing.multiplier < 1 ||
      editing.endDate < editing.startDate
    ) {
      setError("Enter a name, multiplier of at least 1, and valid date range.")
      return
    }
    saveCampaign({ ...editing, id: editing.id || `camp-${Date.now()}` })
    setEditing(null)
    setError("")
    notify("Campaign saved.", "success")
  }
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Bonus Campaigns</h1>
        <button
          onClick={() => setEditing(blank())}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Campaign
        </button>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        The highest active campaign multiplier applies when an order is
        completed.
      </p>
      {editing && (
        <AdminModal
          title={editing.id ? "Edit Campaign" : "New Campaign"}
          onClose={() => {
            setEditing(null)
            setError("")
          }}
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                Name
                <input
                  required
                  className={field}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Multiplier
                <input
                  required
                  type="number"
                  min="1"
                  step="0.1"
                  className={field}
                  value={editing.multiplier}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      multiplier: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs">
                Start date
                <input
                  required
                  type="date"
                  className={field}
                  value={editing.startDate}
                  onChange={(e) =>
                    setEditing({ ...editing, startDate: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                End date
                <input
                  required
                  type="date"
                  className={field}
                  value={editing.endDate}
                  onChange={(e) =>
                    setEditing({ ...editing, endDate: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
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
                Save Campaign
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
      <div className="space-y-3">
        {campaigns.length ? (
          campaigns.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div>
                <strong>{c.name}</strong>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {c.startDate} â†’ {c.endDate} Â· {c.multiplier}Ã— points Â·{" "}
                  {c.active && c.startDate <= today && c.endDate >= today
                    ? "Live"
                    : c.active
                      ? "Scheduled or ended"
                      : "Inactive"}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  onClick={() => setEditing(c)}
                  className="text-[var(--gold-mid)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    saveCampaign({ ...c, active: !c.active })
                    notify(
                      `Campaign ${c.active ? "deactivated" : "activated"}.`,
                      "success",
                    )
                  }}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    void confirm(`Delete ${c.name}?`).then((ok) => {
                      if (ok) {
                        deleteCampaign(c.id)
                        notify(`${c.name} deleted.`, "success")
                      }
                    })
                  }}
                  className="text-red-400"
                >
                  Delete
                </button>
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
