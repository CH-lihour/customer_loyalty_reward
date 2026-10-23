import { useState, type FormEvent } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { AdminModal } from "../../components/AdminModal";
import { useModalState } from "../../components/useModalState";
import { TablePagination, usePagedRows } from "../../components/TablePagination";
import {
  EmptyRow, PageHeader, Panel, field, formatDateTime, primaryButton, rowClass, secondaryButton, tableClass, theadClass, useStockAccess,
} from "../../components/StockUi";
import { levelKey, variantLabel, type Stocktake, type StocktakeLine } from "../../data/stock";

const statusTones: Record<Stocktake["status"], string> = {
  OPEN: "bg-amber-400/10 text-amber-300",
  POSTED: "bg-green-400/10 text-green-400",
  CANCELLED: "bg-[var(--secondary)] text-[var(--muted-foreground)]",
};

export function AdminStocktakePage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const { notify, confirm } = useFeedback();
  const { can } = useStockAccess(actorId);
  const [selectedId, setSelectedId] = useState<string | null>(shop.stocktakes.find((t) => t.status === "OPEN")?.id ?? null);
  const [creating, setCreating, createClosing] = useModalState(false);
  const [locationId, setLocationId] = useState(shop.stockLocations.find((l) => l.active)?.id ?? "");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [blind, setBlind] = useState(false);
  const selected = shop.stocktakes.find((t) => t.id === selectedId);
  const locName = (id: string) => shop.stockLocations.find((l) => l.id === id)?.name ?? id;
  const signedMoney = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${shop.money(Math.abs(n))}`;
  const categories = [...new Set(shop.rewards.map((r) => r.category))];

  const create = (event: FormEvent) => {
    event.preventDefault();
    const result = shop.createStocktake(actorId, locationId, category, note);
    if (result.error) return setError(result.error);
    setCreating(false);
    setSelectedId(result.id ?? null);
    setNote("");
    notify(`Stocktake ${result.id} started. Count each line, then a manager posts it.`, "success");
  };

  /** Current system quantity for a line: posted stocktakes keep the figure from posting time. */
  const systemQty = (take: Stocktake, line: StocktakeLine) => {
    if (take.status === "POSTED") return line.systemAtPost ?? line.expected;
    const level = shop.stockLevels.find((l) => l.key === levelKey(line.rewardId, line.variantId, take.locationId));
    if (line.serial) return level?.serials.includes(line.serial) ? 1 : 0;
    if (line.batch) return level?.batches.find((b) => b.batch === line.batch)?.onHand ?? 0;
    return level?.onHand ?? 0;
  };
  const lineRows = selected
    ? selected.lines.map((line, index) => {
        const system = systemQty(selected, line);
        const variance = line.counted === null ? null : line.counted - system;
        const cost = shop.stockItemFor(line.rewardId).unitCost;
        return { line, index, system, variance, value: (variance ?? 0) * cost };
      })
    : [];
  const linesTable = usePagedRows(lineRows);

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader eyebrow="Inventory" title="Stocktake"
        description="Cycle counts by location and category. Clerks enter counts; a stock manager posts the variances to the ledger."
        actions={<button type="button" disabled={!can("clerk")} onClick={() => { setError(""); setCreating(true); }} className={primaryButton}>+ Start stocktake</button>} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <Panel title="Counts" flush>
          <ul className="max-h-[560px] divide-y divide-[var(--border)] overflow-auto">
            {shop.stocktakes.map((t) => {
              const counted = t.lines.filter((l) => l.counted !== null).length;
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => setSelectedId(t.id)} aria-current={t.id === selectedId}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-[var(--secondary)]/50 ${t.id === selectedId ? "bg-[var(--gold-mid)]/10" : ""}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono-data text-xs">{t.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTones[t.status]}`}>{t.status.toLowerCase()}</span>
                    </span>
                    <span className="mt-1 block">{locName(t.locationId)}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">{t.category || "All categories"} · {counted}/{t.lines.length} counted</span>
                  </button>
                </li>
              );
            })}
            {!shop.stocktakes.length && <li className="p-6 text-center text-sm text-[var(--muted-foreground)]">No stocktakes yet.</li>}
          </ul>
        </Panel>

        {selected ? (() => {
          const rows = lineRows;
          const counted = rows.filter((r) => r.variance !== null).length;
          const varianceRows = rows.filter((r) => r.variance);
          const netUnits = varianceRows.reduce((n, r) => n + (r.variance ?? 0), 0);
          const netValue = varianceRows.reduce((n, r) => n + r.value, 0);
          const open = selected.status === "OPEN";
          return (
            <Panel
              title={`${selected.id} · ${locName(selected.locationId)}`}
              description={`${selected.category || "All categories"} · started ${formatDateTime(selected.createdAt)} by ${selected.createdBy}${selected.postedAt ? ` · posted ${formatDateTime(selected.postedAt)} by ${selected.postedBy}` : ""}${selected.note ? ` · ${selected.note}` : ""}`}
              actions={open && (
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} /> Blind count</label>
              )}
              flush>
              <div className="overflow-x-auto">
                <table className={`${tableClass} min-w-[820px]`}>
                  <thead className={theadClass}>
                    <tr><th className="p-3">Item</th><th className="p-3">Lot / serial</th>{!blind && <><th className="p-3 text-right">Expected</th><th className="p-3 text-right">{open ? "System now" : "System at post"}</th></>}<th className="p-3 text-right">Counted</th>{!blind && <><th className="p-3 text-right">Variance</th><th className="p-3 text-right">Value</th></>}</tr>
                  </thead>
                  <tbody>
                    {linesTable.rows.map(({ line, index, system, variance, value }) => {
                      const reward = shop.rewards.find((r) => r.id === line.rewardId);
                      const item = shop.stockItemFor(line.rewardId);
                      return (
                        <tr key={index} className={rowClass}>
                          <td className="p-3">{reward?.name ?? line.rewardId}<div className="font-mono-data text-xs text-[var(--muted-foreground)]">{item.sku}{item.variants.length ? ` · ${variantLabel(item, line.variantId)}` : ""}</div></td>
                          <td className="p-3 font-mono-data text-xs">{line.serial ?? (line.batch || "—")}</td>
                          {!blind && <><td className="p-3 text-right font-mono-data">{line.expected}</td><td className="p-3 text-right font-mono-data">{system}</td></>}
                          <td className="p-3 text-right">
                            {open && can("clerk") ? (
                              <input type="number" min={0} max={line.serial ? 1 : undefined} step={1} aria-label={`Counted quantity for ${reward?.name ?? line.rewardId} ${line.serial ?? line.batch}`}
                                className={`${field} ml-auto w-24 text-right font-mono-data`} value={line.counted ?? ""}
                                onChange={(e) => {
                                  const result = shop.recordCount(actorId, selected.id, index, e.target.value === "" ? null : Number(e.target.value));
                                  if (result) notify(result, "error");
                                }} />
                            ) : <span className="font-mono-data">{line.counted ?? "—"}</span>}
                          </td>
                          {!blind && <>
                            <td className={`p-3 text-right font-mono-data ${variance ? (variance > 0 ? "text-green-400" : "text-red-400") : "text-[var(--muted-foreground)]"}`}>{variance === null ? "—" : variance > 0 ? `+${variance}` : variance}</td>
                            <td className="p-3 text-right font-mono-data text-xs">{variance ? signedMoney(value) : "—"}</td>
                          </>}
                        </tr>
                      );
                    })}
                    {!rows.length && <EmptyRow colSpan={7}>No lines.</EmptyRow>}
                  </tbody>
                </table>
              </div>
              <TablePagination {...linesTable.pagination} />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--secondary)]/35 px-4 py-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {counted}/{rows.length} lines counted · {varianceRows.length} with variance{!blind && <> · net <span className="font-mono-data">{netUnits > 0 ? "+" : ""}{netUnits}</span> units ({signedMoney(netValue)})</>}
                </p>
                {open && (
                  <div className="flex gap-2">
                    <button type="button" disabled={!can("manager")} className={secondaryButton}
                      onClick={() => void confirm(`Cancel stocktake ${selected.id}? Counts are kept for reference but nothing is posted.`).then((ok) => {
                        if (!ok) return;
                        const result = shop.cancelStocktake(actorId, selected.id);
                        notify(result ?? "Stocktake cancelled.", result ? "error" : "success");
                      })}>Cancel count</button>
                    <button type="button" disabled={!can("manager") || counted < rows.length} className={primaryButton}
                      title={can("manager") ? undefined : "Needs stock manager authority"}
                      onClick={() => void confirm(`Post ${varianceRows.length} variance line${varianceRows.length === 1 ? "" : "s"} to the ledger? On-hand stock at ${locName(selected.locationId)} will match the count.`).then((ok) => {
                        if (!ok) return;
                        const result = shop.postStocktake(actorId, selected.id);
                        notify(result ?? "Stocktake posted. Variances recorded in the ledger.", result ? "error" : "success");
                      })}>Post variances</button>
                  </div>
                )}
              </div>
            </Panel>
          );
        })() : (
          <div className="grid place-items-center rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--muted-foreground)]">
            Select a stocktake, or start a new cycle count.
          </div>
        )}
      </div>

      {creating && (
        <AdminModal title="Start stocktake" onClose={() => setCreating(false)} closing={createClosing}>
          <form onSubmit={create} className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">Lines are created for every item, batch, and serial expected at the location. Counts are compared to live stock when posted.</p>
            <label className="block text-xs">Location
              <select className={field} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {shop.stockLocations.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="block text-xs">Category (cycle count)
              <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories (full count)</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-xs">Note<input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly voucher count" /></label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={primaryButton}>Start count</button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
