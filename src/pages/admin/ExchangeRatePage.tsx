import { useState, type FormEvent } from "react"
import { AdminModal } from "../../components/AdminModal"
import { Icon } from "../../components/Icon"
import { useFeedback } from "../../components/FeedbackProvider"
import { useShop } from "../../data/shop"

const formatKHR = (amount: number) => `៛${amount.toLocaleString()}`

export function AdminExchangeRatePage({ actorId }: { actorId: string }) {
  const shop = useShop()
  const { notify } = useFeedback()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const lastChange = shop.logs.find(
    (entry) => entry.event === "EXCHANGE_RATE_UPDATED",
  )
  const draftRate = Number(draft)
  const validDraft =
    draft.trim() !== "" &&
    Number.isSafeInteger(draftRate) &&
    draftRate > 0 &&
    draftRate <= 1_000_000_000

  const openEditor = () => {
    setDraft(String(shop.exchangeRate))
    setError("")
    setEditing(true)
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = shop.saveExchangeRate(actorId, Number(draft))
    if (result) {
      setError(result)
      return
    }
    setEditing(false)
    notify("Exchange rate updated.", "success")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-mid)]">
            System settings / Currency
          </p>
          <h1 className="font-display text-3xl font-semibold">Exchange Rate</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage how USD prices appear to customers in Cambodian riel.
          </p>
        </div>
        <button
          type="button"
          onClick={openEditor}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold-mid)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] shadow-[0_8px_24px_rgba(232,166,52,0.16)] hover:bg-[var(--gold-light)]"
        >
          <Icon name="refresh" className="h-4 w-4" /> Update rate
        </button>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[var(--gold-mid)]/25 bg-[linear-gradient(115deg,#272333_0%,#1c2331_55%,#161b27_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--gold-mid)]/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold-mid)]/25 bg-[var(--gold-mid)]/10 px-3 py-1 text-xs font-medium text-[var(--gold-light)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold-mid)]" />{" "}
              Current display rate
            </div>
            <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-3xl sm:text-4xl">$1 USD</span>
              <span className="text-2xl text-[var(--muted-foreground)]">=</span>
              <strong className="font-mono-data text-3xl font-semibold tracking-tight text-[var(--gold-light)] sm:text-4xl">
                {formatKHR(shop.exchangeRate)}
              </strong>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              1 US dollar equals {shop.exchangeRate.toLocaleString()} Cambodian
              riel.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm sm:min-w-44">
            <p className="text-xs text-[var(--muted-foreground)]">
              Last updated
            </p>
            <p className="mt-1 font-medium">
              {lastChange?.timestamp ?? "Using default rate"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--gold-mid)]/10 text-[var(--gold-mid)]">
              <Icon name="repeat" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Conversion preview
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Examples using the current rate
              </p>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4">
            {[1, 10, 100].map((usd) => (
              <div
                key={usd}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-sm"
              >
                <span className="font-mono-data text-[var(--muted-foreground)]">
                  ${usd} USD
                </span>
                <span
                  className="text-[var(--muted-foreground)]"
                  aria-hidden="true"
                >
                  →
                </span>
                <strong className="font-mono-data">
                  {formatKHR(usd * shop.exchangeRate)} KHR
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--gold-mid)]/10 text-[var(--gold-mid)]">
              <Icon name="wallet" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Where it applies
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Customer price display
              </p>
            </div>
          </div>
          <div className="space-y-4 text-sm">
            {[
              "Prices shown in KHR use this rate.",
              "USD prices and order totals stay in USD.",
              "Customers see the updated rate when they switch currency.",
            ].map((line) => (
              <div key={line} className="flex gap-3">
                <Icon
                  name="check"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold-mid)]"
                />
                <p>{line}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <AdminModal
          title="Update Exchange Rate"
          onClose={() => setEditing(false)}
        >
          <form onSubmit={save} className="space-y-5">
            <div className="rounded-xl border border-[var(--gold-mid)]/20 bg-[var(--gold-mid)]/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Current rate
              </p>
              <p className="mt-1 font-mono-data text-lg font-semibold text-[var(--gold-mid)]">
                $1 USD = {formatKHR(shop.exchangeRate)} KHR
              </p>
            </div>
            <div>
              <label
                htmlFor="exchange-rate"
                className="block text-sm font-semibold"
              >
                New rate
              </label>
              <p className="mb-2 text-xs text-[var(--muted-foreground)]">
                Enter the number of Cambodian riel for 1 US dollar.
              </p>
              <div className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--secondary)] focus-within:border-[var(--gold-mid)]">
                <span className="flex items-center border-r border-[var(--border)] px-4 text-sm font-semibold text-[var(--gold-mid)]">
                  ៛
                </span>
                <input
                  id="exchange-rate"
                  type="number"
                  min={1}
                  max={1_000_000_000}
                  step={1}
                  required
                  autoFocus
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    setError("")
                  }}
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono-data text-lg text-[var(--foreground)] outline-none"
                />
                <span className="flex items-center border-l border-[var(--border)] px-4 text-xs font-semibold text-[var(--muted-foreground)]">
                  KHR / USD
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--secondary)] px-4 py-3 text-sm">
              <span className="text-[var(--muted-foreground)]">
                Preview for $10
              </span>
              <strong className="font-mono-data text-[var(--gold-mid)]">
                {validDraft ? formatKHR(draftRate * 10) : "—"}
              </strong>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--gold-mid)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] hover:bg-[var(--gold-light)]"
              >
                Save rate
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  )
}
