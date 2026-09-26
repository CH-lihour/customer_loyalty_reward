import { useState, type FormEvent } from "react"
import { type Tier } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import { TierBadge } from "../../components/TierBadge"
import { AdminModal } from "../../components/AdminModal"

const tiers: Tier[] = ["Silver", "Gold", "Platinum"]

export function AdminTiersPage() {
  const shop = useShop()
  const { notify } = useFeedback()
  const [draft, setDraft] = useState(shop.tiers)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState("")

  const openEditor = () => {
    setDraft(shop.tiers)
    setMessage("")
    setEditing(true)
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      draft.Silver.min !== 0 ||
      draft.Gold.min <= 0 ||
      draft.Platinum.min <= draft.Gold.min ||
      tiers.some((tier) => draft[tier].multiplier < 1)
    ) {
      setMessage(
        "Thresholds must increase from Silver 0, and multipliers must be at least 1.",
      )
      notify("Please correct the tier thresholds and multipliers.", "error")
      return
    }
    tiers.forEach((tier) =>
      shop.saveTier(tier, {
        ...draft[tier],
        max:
          tier === "Silver"
            ? draft.Gold.min - 1
            : tier === "Gold"
              ? draft.Platinum.min - 1
              : Infinity,
      }),
    )
    setEditing(false)
    setMessage("Tier rules saved. Customer tiers were recalculated.")
    notify("Tier rules saved and customer tiers recalculated.", "success")
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">
          Membership Tiers
        </h1>
        <button
          onClick={openEditor}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]"
        >
          Edit Tier Rules
        </button>
      </div>
      {message && !editing && (
        <p role="status" className="text-sm text-[var(--gold-mid)]">
          {message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier}
            className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex items-center justify-between">
              <TierBadge tier={tier} size="md" />
              <span className="text-sm">
                {
                  shop.customers.filter((customer) => customer.tier === tier)
                    .length
                }{" "}
                members
              </span>
            </div>
            <p className="text-sm">
              Minimum qualifying points: {shop.tiers[tier].min.toLocaleString()}
            </p>
            <p className="text-sm">
              Point multiplier: {shop.tiers[tier].multiplier}×
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Range: {shop.tiers[tier].min.toLocaleString()} –{" "}
              {Number.isFinite(shop.tiers[tier].max)
                ? shop.tiers[tier].max.toLocaleString()
                : "∞"}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        Tier progress uses qualifying points earned from completed orders.
        Spending points on rewards does not remove tier progress.
      </p>
      {editing && (
        <AdminModal
          title="Edit Tier Rules"
          onClose={() => setEditing(false)}
          wide
        >
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier}
                  className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-4"
                >
                  <TierBadge tier={tier} size="md" />
                  <label className="block text-xs">
                    Minimum qualifying points
                    <input
                      disabled={tier === "Silver"}
                      type="number"
                      min="0"
                      value={draft[tier].min}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [tier]: {
                            ...current[tier],
                            min: Number(event.target.value),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                    />
                  </label>
                  <label className="block text-xs">
                    Point multiplier
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={draft[tier].multiplier}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [tier]: {
                            ...current[tier],
                            multiplier: Number(event.target.value),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                    />
                  </label>
                </div>
              ))}
            </div>
            {message && (
              <p role="alert" className="text-sm text-red-400">
                {message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]"
              >
                Save Tier Rules
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
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
