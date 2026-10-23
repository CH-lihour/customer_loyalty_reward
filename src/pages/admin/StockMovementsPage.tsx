import { useState } from "react";
import { useShop } from "../../data/shop";
import { useModalState } from "../../components/useModalState";
import { StockMovementDialog, type StockFormMode, type StockFormPreset } from "../../components/StockMovementDialog";
import { EmptyRow, MovementBadge, PageHeader, filterControl, formatDateTime, rowClass, tableClass, theadClass } from "../../components/StockUi";
import { StockActionButtons } from "./StockPage";
import { movementLabels, variantLabel, type StockMovementType } from "../../data/stock";

const PAGE = 100;

export function AdminStockMovementsPage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const [dialog, setDialog, dialogClosing] = useModalState<{ mode: StockFormMode; preset?: StockFormPreset } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<StockMovementType | "all">("all");
  const [locationId, setLocationId] = useState("all");
  const [rewardId, setRewardId] = useState("all");
  const [actor, setActor] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const locName = (id: string) => shop.stockLocations.find((l) => l.id === id)?.name ?? id;
  const actors = [...new Set(shop.stockMovements.map((m) => m.actorName))].sort();

  const filtered = shop.stockMovements.filter((m) => {
    const day = m.createdAt.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to) &&
      (type === "all" || m.type === type) &&
      (locationId === "all" || m.locationId === locationId) &&
      (rewardId === "all" || m.rewardId === rewardId) &&
      (actor === "all" || m.actorName === actor);
  });
  const net = filtered.reduce((n, m) => n + m.onHand, 0);

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader eyebrow="Inventory" title="Stock movements"
        description="The append-only ledger behind every stock level. Corrections are new entries, never edits."
        actions={<StockActionButtons actorId={actorId} onOpen={setDialog} />} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={filterControl} /></label>
        <label className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={filterControl} /></label>
        <select aria-label="Movement type" value={type} onChange={(e) => setType(e.target.value as StockMovementType | "all")} className={filterControl}>
          <option value="all">All types</option>
          {(Object.keys(movementLabels) as StockMovementType[]).map((t) => <option key={t} value={t}>{movementLabels[t]}</option>)}
        </select>
        <select aria-label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={filterControl}>
          <option value="all">All locations</option>
          {shop.stockLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select aria-label="Reward item" value={rewardId} onChange={(e) => setRewardId(e.target.value)} className={filterControl}>
          <option value="all">All items</option>
          {shop.rewards.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select aria-label="Recorded by" value={actor} onChange={(e) => setActor(e.target.value)} className={filterControl}>
          <option value="all">Anyone</option>
          {actors.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {filtered.length} entries · net on-hand change <span className={net >= 0 ? "text-green-400" : "text-red-400"}>{net > 0 ? "+" : ""}{net}</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className={`${tableClass} min-w-[1000px]`}>
          <thead className={theadClass}>
            <tr><th className="p-3">When</th><th className="p-3">Type</th><th className="p-3">Item</th><th className="p-3">Location</th><th className="p-3">Lot / serial</th><th className="p-3 text-right">On hand Δ</th><th className="p-3 text-right">Reserved Δ</th><th className="p-3">Reference · reason</th><th className="p-3">By</th></tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map((m) => {
              const reward = shop.rewards.find((r) => r.id === m.rewardId);
              const item = shop.stockItemFor(m.rewardId);
              return (
                <tr key={m.id} className={rowClass}>
                  <td className="whitespace-nowrap p-3 text-xs text-[var(--muted-foreground)]">{formatDateTime(m.createdAt)}</td>
                  <td className="p-3"><MovementBadge type={m.type} /></td>
                  <td className="p-3"><div>{reward?.name ?? `Deleted reward (${m.rewardId})`}</div><div className="font-mono-data text-xs text-[var(--muted-foreground)]">{item.sku}{item.variants.length ? ` · ${variantLabel(item, m.variantId)}` : ""}</div></td>
                  <td className="p-3 text-xs">{locName(m.locationId)}</td>
                  <td className="p-3 font-mono-data text-xs">{m.serials?.join(", ") || m.batch || "—"}</td>
                  <td className={`p-3 text-right font-mono-data ${m.onHand > 0 ? "text-green-400" : m.onHand < 0 ? "text-red-400" : "text-[var(--muted-foreground)]"}`}>{m.onHand > 0 ? `+${m.onHand}` : m.onHand || "—"}</td>
                  <td className="p-3 text-right font-mono-data text-purple-300">{m.reserved > 0 ? `+${m.reserved}` : m.reserved || "—"}</td>
                  <td className="p-3 text-xs">{m.reference && <span className="font-mono-data text-[var(--gold-mid)]">{m.reference} </span>}{m.reason}{m.source === "DONATION" && " · donation"}</td>
                  <td className="p-3 text-xs">{m.actorName}</td>
                </tr>
              );
            })}
            {!filtered.length && <EmptyRow colSpan={9}>No movements match these filters.</EmptyRow>}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="self-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--secondary)]">
          Show {Math.min(PAGE, filtered.length - limit)} more
        </button>
      )}
      {dialog && <StockMovementDialog actorId={actorId} mode={dialog.mode} preset={dialog.preset} onClose={() => setDialog(null)} closing={dialogClosing} />}
    </div>
  );
}
