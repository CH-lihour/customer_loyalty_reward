import { useState } from "react";
import { useShop } from "../../data/shop";
import { useModalState } from "../../components/useModalState";
import { TablePagination } from "../../components/TablePagination";
import { StockMovementDialog, type StockFormMode, type StockFormPreset } from "../../components/StockMovementDialog";
import { EmptyRow, MovementBadge, PageHeader, filterControl, formatDateTime, rowClass, tableClass, theadClass } from "../../components/StockUi";
import { StockActionButtons } from "./StockPage";
import { apiStockMovementPage } from "../../data/api";
import { useApiTable } from "../../data/apiTable";
import { useStockApi } from "../../data/stockApi";
import { movementLabels, variantLabel, type StockMovementType } from "../../data/stock";

export function AdminStockMovementsPage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const { token } = useStockApi();
  const [dialog, setDialog, dialogClosing] = useModalState<{ mode: StockFormMode; preset?: StockFormPreset } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<StockMovementType | "all">("all");
  const [locationId, setLocationId] = useState("all");
  const [rewardId, setRewardId] = useState("all");
  const [actor, setActor] = useState("all");
  const [net, setNet] = useState(0);
  const locName = (id: string) => shop.stockLocations.find((l) => l.id === id)?.name ?? id;
  // Everyone who has recorded stock, from the ledger loaded for the other inventory pages.
  const actors = [...new Map(shop.stockMovements.map((m) => [m.actorId, m.actorName]))].sort((a, b) => a[1].localeCompare(b[1]));

  const filters = {
    from,
    to,
    type: type === "all" ? "" : type,
    location_id: locationId === "all" ? "" : locationId,
    reward_id: rewardId === "all" ? "" : rewardId,
    actor_id: actor === "all" ? "" : actor.replace(/^api-admin-/, ""),
  };
  const table = useApiTable(async (page, perPage) => {
    const result = await apiStockMovementPage(token, { page, perPage, ...filters });
    setNet(result.netOnHand);
    return result;
    // A recorded movement reloads the ledger, which refetches this page.
  }, `${JSON.stringify(filters)}|${shop.stockMovements.length}`);

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
          {actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {table.pagination.total} entries · net on-hand change <span className={net >= 0 ? "text-green-400" : "text-red-400"}>{net > 0 ? "+" : ""}{net}</span>
      </p>
      {table.error && <p role="alert" className="text-sm text-red-400">{table.error}</p>}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
        <table className={`${tableClass} min-w-[1000px]`}>
          <thead className={theadClass}>
            <tr><th className="p-3">When</th><th className="p-3">Type</th><th className="p-3">Item</th><th className="p-3">Location</th><th className="p-3">Lot / serial</th><th className="p-3 text-right">On hand Δ</th><th className="p-3 text-right">Reserved Δ</th><th className="p-3">Reference · reason</th><th className="p-3">By</th></tr>
          </thead>
          <tbody>
            {table.rows.map((m) => {
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
            {!table.loading && !table.rows.length && <EmptyRow colSpan={9}>No movements match these filters.</EmptyRow>}
            {table.loading && !table.rows.length && <EmptyRow colSpan={9}>Loading movements…</EmptyRow>}
          </tbody>
        </table>
        </div>
        <TablePagination {...table.pagination} />
      </div>
      {dialog && <StockMovementDialog actorId={actorId} mode={dialog.mode} preset={dialog.preset} onClose={() => setDialog(null)} closing={dialogClosing} />}
    </div>
  );
}
