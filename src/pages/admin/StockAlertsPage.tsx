import { useState } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { useModalState } from "../../components/useModalState";
import { TablePagination, usePagedRows } from "../../components/TablePagination";
import { StockMovementDialog, type StockFormMode, type StockFormPreset } from "../../components/StockMovementDialog";
import {
  EmptyRow, PageHeader, Panel, StatTile, StatusPill, daysUntil, field, primaryButton, rowClass, tableClass, theadClass, timeLeft, useStockAccess,
} from "../../components/StockUi";
import { stockStatus, suggestedReorder, todayDate, totalsFor, variantLabel } from "../../data/stock";

export function AdminStockAlertsPage({ actorId, onNav }: { actorId: string; onNav: (page: "stock" | "fulfillment") => void }) {
  const shop = useShop();
  const { notify } = useFeedback();
  const { can } = useStockAccess(actorId);
  const [dialog, setDialog, dialogClosing] = useModalState<{ mode: StockFormMode; preset?: StockFormPreset } | null>(null);
  const [hours, setHours] = useState(shop.stockSettings.reservationHours);
  const today = todayDate();
  const activeIds = shop.stockLocations.filter((l) => l.active).map((l) => l.id);
  const locName = (id?: string) => shop.stockLocations.find((l) => l.id === id)?.name ?? "—";

  const items = shop.rewards.map((reward) => {
    const item = shop.stockItemFor(reward.id);
    const totals = totalsFor(shop.stockLevels, { rewardId: reward.id, locationIds: activeIds });
    const backordered = shop.redemptions.filter((r) => r.rewardId === reward.id && r.status === "BACKORDERED").length;
    const waiting = shop.restockRequests.filter((r) => r.rewardId === reward.id && !r.notifiedAt).length;
    const status = stockStatus(item, totals.available);
    return { reward, item, totals, backordered, waiting, status, suggested: suggestedReorder(item, totals.available, backordered) };
  });
  const attention = items
    .filter((i) => i.status !== "ok" || i.backordered)
    .sort((a, b) => a.totals.available - a.item.reorderPoint - (b.totals.available - b.item.reorderPoint));
  const batches = shop.stockLevels.flatMap((level) => level.batches
    .filter((b) => b.expiresAt && b.onHand > 0 && daysUntil(b.expiresAt) <= 30)
    .map((b) => ({ level, batch: b, expired: b.expiresAt! < today })))
    .sort((a, b) => a.batch.expiresAt!.localeCompare(b.batch.expiresAt!));
  const soon = shop.redemptions
    .filter((r) => r.status === "RESERVED" && r.reservedUntil && new Date(r.reservedUntil).getTime() - Date.now() < 24 * 3600000)
    .sort((a, b) => a.reservedUntil!.localeCompare(b.reservedUntil!));
  const rewardExpiring = shop.rewards.filter((r) => r.active && r.expiresAt && daysUntil(r.expiresAt) <= 30);
  const attentionTable = usePagedRows(attention);
  const batchTable = usePagedRows(batches);

  const saveHours = () => {
    const error = shop.saveStockSettings(actorId, { reservationHours: hours });
    notify(error ?? `Reservations now hold stock for ${hours} hours.`, error ? "error" : "success");
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader eyebrow="Inventory" title="Low-stock dashboard"
        description="Items that need reordering, batches close to expiry, and reservations about to time out." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Out of stock" value={items.filter((i) => i.status === "out").length} icon="alert" tone="red" sub={`${items.filter((i) => i.status === "out" && i.item.outOfStock === "hide").length} hidden on storefront`} onClick={() => onNav("stock")} />
        <StatTile label="Low or reorder" value={items.filter((i) => i.status === "low" || i.status === "reorder").length} icon="warehouse" tone="orange" sub="at or below reorder point" />
        <StatTile label="Expiring in 30 days" value={batches.filter((b) => !b.expired).reduce((n, b) => n + b.batch.onHand, 0)} icon="calendar" tone="orange" sub={`${batches.filter((b) => b.expired).reduce((n, b) => n + b.batch.onHand, 0)} units already expired`} />
        <StatTile label="Backorders & notify-me" value={items.reduce((n, i) => n + i.backordered, 0)} icon="truck" sub={`${items.reduce((n, i) => n + i.waiting, 0)} notify-me requests waiting`} onClick={() => onNav("fulfillment")} />
      </div>

      <Panel title="Reorder suggestions" description="Suggested quantity refills to reorder point + reorder quantity, plus open backorders." flush>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr><th className="p-3">Item</th><th className="p-3">Status</th><th className="p-3 text-right">Available</th><th className="p-3 text-right">Threshold / ROP</th><th className="p-3 text-right">Backordered</th><th className="p-3 text-right">Suggested</th><th className="p-3">Supplier</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {attentionTable.rows.map(({ reward, item, totals, backordered, waiting, status, suggested }) => (
                <tr key={reward.id} className={rowClass}>
                  <td className="p-3"><div className="font-medium">{reward.name}</div><div className="font-mono-data text-xs text-[var(--muted-foreground)]">{item.sku}{waiting ? ` · ${waiting} waiting` : ""}</div></td>
                  <td className="p-3"><StatusPill status={status} /></td>
                  <td className="p-3 text-right font-mono-data">{totals.available}</td>
                  <td className="p-3 text-right font-mono-data text-xs">{item.lowStockThreshold} / {item.reorderPoint}</td>
                  <td className="p-3 text-right font-mono-data">{backordered || "—"}</td>
                  <td className="p-3 text-right font-mono-data font-semibold text-[var(--gold-mid)]">{suggested}</td>
                  <td className="p-3 text-xs">{shop.suppliers.find((x) => x.id === item.supplierId)?.name ?? "—"}</td>
                  <td className="p-3 text-right">
                    {can("clerk") && (
                      <button type="button" className="text-xs text-[var(--gold-mid)] hover:underline"
                        onClick={() => setDialog({ mode: "receive", preset: { rewardId: reward.id, qty: suggested, locationId: activeIds[0] } })}>
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!attention.length && <EmptyRow colSpan={8}>Every item is above its reorder point.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <TablePagination {...attentionTable.pagination} />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Expiry watch" description="Batches expired or expiring within 30 days." flush>
          <div className="overflow-x-auto">
            <table className={`${tableClass} min-w-[520px]`}>
              <thead className={theadClass}><tr><th className="p-3">Item · batch</th><th className="p-3">Location</th><th className="p-3 text-right">Units</th><th className="p-3">Expires</th><th className="p-3" /></tr></thead>
              <tbody>
                {batchTable.rows.map(({ level, batch, expired }) => {
                  const reward = shop.rewards.find((r) => r.id === level.rewardId);
                  const item = shop.stockItemFor(level.rewardId);
                  return (
                    <tr key={`${level.key}|${batch.batch}`} className={rowClass}>
                      <td className="p-3"><div>{reward?.name ?? level.rewardId}{item.variants.length ? ` · ${variantLabel(item, level.variantId)}` : ""}</div><div className="font-mono-data text-xs text-[var(--muted-foreground)]">{batch.batch}</div></td>
                      <td className="p-3 text-xs">{locName(level.locationId)}</td>
                      <td className="p-3 text-right font-mono-data">{batch.onHand}</td>
                      <td className={`p-3 text-xs ${expired ? "text-red-400" : "text-orange-400"}`}>{batch.expiresAt} · {expired ? "expired" : `${daysUntil(batch.expiresAt!)}d`}</td>
                      <td className="p-3 text-right">
                        {expired && can("manager") && (
                          <button type="button" className="text-xs text-orange-400 hover:underline"
                            onClick={() => setDialog({ mode: "writeoff", preset: { rewardId: level.rewardId, variantId: level.variantId, locationId: level.locationId, batch: batch.batch, qty: batch.onHand, kind: "EXPIRY" } })}>
                            Write off
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!batches.length && <EmptyRow colSpan={5}>No batches expire in the next 30 days.</EmptyRow>}
              </tbody>
            </table>
          </div>
          <TablePagination {...batchTable.pagination} />
          {rewardExpiring.length > 0 && (
            <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-orange-400">
              Reward offers ending soon: {rewardExpiring.map((r) => `${r.name} (${r.expiresAt})`).join(", ")}
            </p>
          )}
        </Panel>

        <Panel title="Reservations timing out" description={`Unfulfilled reservations release automatically after ${shop.stockSettings.reservationHours}h and refund the points.`} flush
          actions={<button type="button" className="text-xs text-[var(--gold-mid)] hover:underline" onClick={() => onNav("fulfillment")}>Open fulfilment →</button>}>
          <ul className="divide-y divide-[var(--border)]">
            {soon.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{r.rewardName}<span className="block text-xs text-[var(--muted-foreground)]">{shop.customers.find((c) => c.id === r.userId)?.name} · {locName(r.locationId)}</span></span>
                <span className="font-mono-data text-xs text-orange-400">{timeLeft(r.reservedUntil)}</span>
              </li>
            ))}
            {!soon.length && <li className="p-6 text-center text-sm text-[var(--muted-foreground)]">No reservations expire in the next 24 hours.</li>}
          </ul>
          {can("admin") && (
            <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] p-4">
              <label className="text-xs">Reservation timeout (hours)
                <input type="number" min={1} max={720} step={1} className={`${field} w-32`} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              </label>
              <button type="button" onClick={saveHours} disabled={hours === shop.stockSettings.reservationHours} className={primaryButton}>Save</button>
              <p className="w-full text-xs text-[var(--muted-foreground)]">Applies to new reservations. Extend individual reservations from Fulfilment.</p>
            </div>
          )}
        </Panel>
      </div>
      {dialog && <StockMovementDialog actorId={actorId} mode={dialog.mode} preset={dialog.preset} onClose={() => setDialog(null)} closing={dialogClosing} />}
    </div>
  );
}
