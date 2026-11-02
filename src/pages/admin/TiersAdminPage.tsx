import { useState, type FormEvent } from "react";
import { apiDeleteTier, apiSaveTier, type AdminTier } from "../../data/api";
import { useApiTiers } from "../../data/tierSync";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { TierBadge } from "../../components/TierBadge";
import { AdminModal } from "../../components/AdminModal";
import { useModalState } from "../../components/useModalState";
import { ActionIconButton } from "../../components/ActionIconButton";
import {
  EmptyRow,
  PageHeader,
  Panel,
  field,
  primaryButton,
  rowClass,
  secondaryButton,
  tableClass,
  theadClass,
} from "../../components/StockUi";

/** The tier being edited, with number fields kept as typed so they can be cleared. A blank max means no upper limit. */
type TierDraft = {
  id: string;
  name: string;
  min: string;
  max: string;
  multiplier: string;
  color: string;
};

const toDraft = (tier?: AdminTier, after?: AdminTier): TierDraft =>
  tier
    ? {
        id: tier.id,
        name: tier.name,
        min: String(tier.min),
        max: Number.isFinite(tier.max) ? String(tier.max) : "",
        multiplier: String(tier.multiplier),
        color: tier.color,
      }
    : {
        // A new tier starts just above the current top tier's range.
        id: "",
        name: "",
        min: after ? String(Number.isFinite(after.max) ? after.max + 1 : after.min + 1000) : "0",
        max: "",
        multiplier: "1",
        color: "#94a3b8",
      };

const range = (tier: AdminTier) =>
  `${tier.min.toLocaleString()} – ${Number.isFinite(tier.max) ? tier.max.toLocaleString() : "∞"}`;

export function AdminTiersPage({
  actorId,
  token,
}: {
  actorId: string;
  token: string;
}) {
  const shop = useShop();
  const { notify, confirm } = useFeedback();
  const { tiers, loading, loadError, reload } = useApiTiers(token);
  const [editing, setEditing, closing] = useModalState<TierDraft | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const open = (draft: TierDraft) => {
    setError("");
    setEditing(draft);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving) return;
    const name = editing.name.trim();
    const original = tiers.find((t) => t.id === editing.id);
    setSaving(true);
    setError("");
    try {
      await apiSaveTier(token, {
        id: editing.id,
        name,
        min: Number(editing.min),
        max: editing.max.trim() === "" ? Infinity : Number(editing.max),
        multiplier: Number(editing.multiplier),
        color: editing.color,
      });
      await reload();
      shop.logStaffAction(
        actorId,
        original ? "TIER_UPDATED" : "TIER_CREATED",
        original
          ? original.name !== name
            ? `Renamed tier ${original.name} to ${name}`
            : `Updated tier ${name}`
          : `Created tier ${name}`,
      );
      setEditing(null);
      notify("Tier saved. Customer tiers were recalculated.", "success");
    } catch (failure) {
      setError((failure as Error).message);
      notify((failure as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (tier: AdminTier) => {
    if (!(await confirm(`Delete the ${tier.name} tier?`))) return;
    try {
      await apiDeleteTier(token, tier.id);
      await reload();
      shop.logStaffAction(actorId, "TIER_DELETED", `Deleted tier ${tier.name}`);
      notify(`${tier.name} deleted.`, "success");
    } catch (failure) {
      notify((failure as Error).message, "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        eyebrow="Loyalty"
        title="Membership Tiers"
        description="Customers move up a tier once their qualifying points reach its minimum. Ranges cannot overlap, and only the top tier can be open-ended."
      />
      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load tiers: {loadError}
        </p>
      )}

      <Panel
        title="Tiers"
        description={`${tiers.length} ${tiers.length === 1 ? "tier" : "tiers"}, from the entry tier upwards`}
        flush
        actions={
          <button
            type="button"
            onClick={() => open(toDraft(undefined, tiers[tiers.length - 1]))}
            className={primaryButton}
          >
            + Add tier
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <th className="p-3">Tier</th>
                <th className="p-3">Qualifying points</th>
                <th className="p-3 text-right">Multiplier</th>
                <th className="p-3 text-right">Customers</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id} className={rowClass}>
                  <td className="p-3">
                    <TierBadge tier={tier.name} size="md" color={tier.color} />
                  </td>
                  <td className="p-3 font-mono-data">{range(tier)}</td>
                  <td className="p-3 text-right font-mono-data">
                    {tier.multiplier}×
                  </td>
                  <td className="p-3 text-right font-mono-data">
                    {tier.customerCount}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <ActionIconButton
                        action="edit"
                        label={`Edit ${tier.name}`}
                        onClick={() => open(toDraft(tier))}
                      />
                      <ActionIconButton
                        action="delete"
                        label={`Delete ${tier.name}`}
                        onClick={() => remove(tier)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!tiers.length && (
                <EmptyRow colSpan={5}>
                  {loading ? "Loading tiers…" : "No tiers yet."}
                </EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-xs text-[var(--muted-foreground)]">
        Tier progress uses qualifying points earned from completed orders.
        Spending points on rewards does not remove tier progress.
      </p>

      {editing && (
        <AdminModal
          title={editing.id ? "Edit tier" : "Add tier"}
          onClose={() => setEditing(null)}
          closing={closing}
        >
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs sm:col-span-2">
                Name
                <input
                  required
                  maxLength={50}
                  className={field}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Minimum qualifying points
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  className={field}
                  value={editing.min}
                  onChange={(e) =>
                    setEditing({ ...editing, min: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Maximum points (blank for no limit)
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={field}
                  value={editing.max}
                  onChange={(e) =>
                    setEditing({ ...editing, max: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Point multiplier
                <input
                  required
                  type="number"
                  min="1"
                  max="10"
                  step="0.01"
                  className={field}
                  value={editing.multiplier}
                  onChange={(e) =>
                    setEditing({ ...editing, multiplier: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Badge color
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Pick badge color"
                    className="h-9 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                    value={editing.color}
                    onChange={(e) =>
                      setEditing({ ...editing, color: e.target.value })
                    }
                  />
                  <TierBadge
                    tier={editing.name.trim() || "Preview"}
                    size="md"
                    color={editing.color}
                  />
                </span>
              </label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`${primaryButton} disabled:opacity-60`}
              >
                {saving ? "Saving…" : "Save tier"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
