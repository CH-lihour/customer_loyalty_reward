import { useState } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { useModalState } from "../../components/useModalState";
import { TablePagination, usePagedRows } from "../../components/TablePagination";
import { StockMovementDialog, type StockFormMode, type StockFormPreset } from "../../components/StockMovementDialog";
import { EmptyRow, PageHeader, filterControl, formatDateTime, rowClass, tableClass, theadClass, timeLeft, useStockAccess } from "../../components/StockUi";
import { levelKey, type Redemption, type RedemptionStatus } from "../../data/stock";

type Tab = "reserved" | "backordered" | "notify" | "history";
const statusTones: Record<RedemptionStatus, string> = {
  RESERVED: "bg-purple-400/10 text-purple-300",
  BACKORDERED: "bg-amber-400/10 text-amber-300",
  FULFILLED: "bg-green-400/10 text-green-400",
  CANCELLED: "bg-[var(--secondary)] text-[var(--muted-foreground)]",
  EXPIRED: "bg-orange-400/10 text-orange-400",
  RETURNED: "bg-cyan-400/10 text-cyan-400",
};
const linkButton = "text-xs font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline";

export function AdminFulfillmentPage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const { notify, prompt } = useFeedback();
  const { can } = useStockAccess(actorId);
  const [tab, setTab] = useState<Tab>("reserved");
  const [locationId, setLocationId] = useState("all");
  const [serialChoice, setSerialChoice] = useState<Record<string, string>>({});
  const [dialog, setDialog, dialogClosing] = useModalState<{ mode: StockFormMode; preset?: StockFormPreset } | null>(null);
  const customer = (id: string) => shop.customers.find((c) => c.id === id)?.name ?? id;
  const locName = (id?: string) => shop.stockLocations.find((l) => l.id === id)?.name ?? "—";
  const inLocation = (r: Redemption) => locationId === "all" || r.locationId === locationId;

  const reserved = shop.redemptions.filter((r) => r.status === "RESERVED" && inLocation(r))
    .sort((a, b) => (a.reservedUntil ?? "").localeCompare(b.reservedUntil ?? ""));
  const backordered = shop.redemptions.filter((r) => r.status === "BACKORDERED").reverse();
  const history = shop.redemptions.filter((r) => !["RESERVED", "BACKORDERED"].includes(r.status) && inLocation(r));
  const requests = shop.restockRequests;
  const pagedTables = {
    reserved: usePagedRows(reserved),
    backordered: usePagedRows(backordered),
    notify: usePagedRows(requests),
    history: usePagedRows(history),
  };
  const backorderOffset = (pagedTables.backordered.pagination.page - 1) * pagedTables.backordered.pagination.pageSize;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "reserved", label: "To fulfil", count: reserved.length },
    { id: "backordered", label: "Backordered", count: backordered.length },
    { id: "notify", label: "Notify me", count: requests.filter((r) => !r.notifiedAt).length },
    { id: "history", label: "History", count: history.length },
  ];

  const run = (result: string | null, success: string) => notify(result ?? success, result ? "error" : "success");
  const fulfil = (r: Redemption, method: "SHIPPED" | "PICKED_UP") =>
    run(shop.fulfillRedemption(actorId, r.id, method, serialChoice[r.id]), `${r.rewardName} marked ${method === "SHIPPED" ? "shipped" : "picked up"}.`);
  const cancel = async (r: Redemption) => {
    const reason = await prompt(`Cancel ${r.rewardName} for ${customer(r.userId)}? The reserved stock is released and ${r.points} points are refunded. Enter a reason:`);
    if (reason === null) return;
    run(shop.cancelRedemption(actorId, r.id, reason), "Redemption cancelled and points refunded.");
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader eyebrow="Inventory" title="Redemption fulfilment"
        description={`Redemptions reserve stock the moment points are spent. Ship or hand over the reward to deduct it; unfulfilled reservations release after ${shop.stockSettings.reservationHours}h.`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-[var(--gold-mid)] text-[var(--background)]" : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
              {t.label} <span className="ml-1 font-mono-data">{t.count}</span>
            </button>
          ))}
        </div>
        {(tab === "reserved" || tab === "history") && (
          <select aria-label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={filterControl}>
            <option value="all">All locations</option>
            {shop.stockLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
        {tab === "reserved" && (
          <table className={`${tableClass} min-w-[900px]`}>
            <thead className={theadClass}><tr><th className="p-3">Customer</th><th className="p-3">Reward</th><th className="p-3">Pick from</th><th className="p-3">Reserved</th><th className="p-3">Hold</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {pagedTables.reserved.rows.map((r) => {
                const item = shop.stockItemFor(r.rewardId);
                const level = shop.stockLevels.find((l) => l.key === levelKey(r.rewardId, r.variantId, r.locationId ?? ""));
                const left = new Date(r.reservedUntil ?? 0).getTime() - Date.now();
                return (
                  <tr key={r.id} className={rowClass}>
                    <td className="p-3">{customer(r.userId)}<div className="text-xs text-[var(--muted-foreground)]">{r.points} pts</div></td>
                    <td className="p-3">{r.rewardName}<div className="font-mono-data text-xs text-[var(--muted-foreground)]">{item.sku}</div></td>
                    <td className="p-3 text-xs">
                      {locName(r.locationId)}
                      {item.tracking === "serial" && (
                        <select aria-label="Serial to issue" className={`${filterControl} mt-1 block py-1 text-xs`} value={serialChoice[r.id] ?? ""} onChange={(e) => setSerialChoice((m) => ({ ...m, [r.id]: e.target.value }))}>
                          <option value="">Auto serial</option>
                          {(level?.serials ?? []).map((serial) => <option key={serial}>{serial}</option>)}
                        </select>
                      )}
                      {item.tracking === "batch" && <div className="text-[var(--muted-foreground)]">FEFO from {level?.batches.find((b) => !b.expiresAt || b.expiresAt >= new Date().toISOString().slice(0, 10))?.batch ?? "—"}</div>}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-[var(--muted-foreground)]">{formatDateTime(r.reservedAt)}</td>
                    <td className={`whitespace-nowrap p-3 font-mono-data text-xs ${left < 24 * 3600000 ? "text-orange-400" : ""}`}>{timeLeft(r.reservedUntil)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" disabled={!can("clerk")} onClick={() => fulfil(r, "SHIPPED")} className={`${linkButton} text-[var(--gold-mid)]`}>Ship</button>
                        <button type="button" disabled={!can("clerk")} onClick={() => fulfil(r, "PICKED_UP")} className={`${linkButton} text-[var(--gold-mid)]`}>Picked up</button>
                        <button type="button" disabled={!can("clerk")} onClick={() => run(shop.extendReservation(actorId, r.id, 24), "Reservation extended by 24 hours.")} className={linkButton}>+24h</button>
                        <button type="button" disabled={!can("manager")} title={can("manager") ? undefined : "Needs stock manager authority"} onClick={() => void cancel(r)} className={`${linkButton} text-red-400`}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!reserved.length && <EmptyRow colSpan={6}>Nothing waiting to be fulfilled.</EmptyRow>}
            </tbody>
          </table>
        )}

        {tab === "backordered" && (
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Customer</th><th className="p-3">Reward</th><th className="p-3">Since</th><th className="p-3">Queue</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {pagedTables.backordered.rows.map((r, index) => (
                <tr key={r.id} className={rowClass}>
                  <td className="p-3">{customer(r.userId)}<div className="text-xs text-[var(--muted-foreground)]">{r.points} pts paid</div></td>
                  <td className="p-3">{r.rewardName}</td>
                  <td className="p-3 text-xs">{r.createdAt}</td>
                  <td className="p-3 text-xs">#{backorderOffset + index + 1} · reserved automatically when stock arrives</td>
                  <td className="p-3 text-right"><button type="button" disabled={!can("manager")} onClick={() => void cancel(r)} className={`${linkButton} text-red-400`}>Cancel & refund</button></td>
                </tr>
              ))}
              {!backordered.length && <EmptyRow colSpan={5}>No backorders.</EmptyRow>}
            </tbody>
          </table>
        )}

        {tab === "notify" && (
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Customer</th><th className="p-3">Reward</th><th className="p-3">Requested</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {pagedTables.notify.rows.map((r) => {
                const reward = shop.rewards.find((x) => x.id === r.rewardId);
                const item = shop.stockItemFor(r.rewardId);
                const variant = item.variants.find((v) => v.id === r.variantId);
                return (
                  <tr key={r.id} className={rowClass}>
                    <td className="p-3">{customer(r.userId)}</td>
                    <td className="p-3">{reward?.name ?? r.rewardId}{variant && <span className="text-xs text-[var(--muted-foreground)]"> · {[variant.size, variant.color].filter(Boolean).join(" / ")}</span>}</td>
                    <td className="p-3 text-xs">{formatDateTime(r.createdAt)}</td>
                    <td className="p-3 text-xs">{r.notifiedAt ? <span className="text-green-400">Notified {formatDateTime(r.notifiedAt)}</span> : <span className="text-amber-300">Waiting for stock</span>}</td>
                  </tr>
                );
              })}
              {!requests.length && <EmptyRow colSpan={4}>No notify-me requests.</EmptyRow>}
            </tbody>
          </table>
        )}

        {tab === "history" && (
          <table className={`${tableClass} min-w-[900px]`}>
            <thead className={theadClass}><tr><th className="p-3">Customer</th><th className="p-3">Reward</th><th className="p-3">Status</th><th className="p-3">Detail</th><th className="p-3">When</th><th className="p-3 text-right" /></tr></thead>
            <tbody>
              {pagedTables.history.rows.map((r) => (
                <tr key={r.id} className={rowClass}>
                  <td className="p-3">{customer(r.userId)}</td>
                  <td className="p-3">{r.rewardName}<div className="text-xs text-[var(--muted-foreground)]">{r.points} pts{r.legacy ? " · before stock ledger" : ""}</div></td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTones[r.status]}`}>{r.status.toLowerCase()}</span></td>
                  <td className="p-3 text-xs">
                    {r.status === "FULFILLED" || r.status === "RETURNED"
                      ? <>{r.fulfillment === "PICKED_UP" ? "Picked up" : r.fulfillment === "SHIPPED" ? "Shipped" : "Issued"} · {locName(r.locationId)}{(r.serial || r.batch) && <span className="font-mono-data"> · {r.serial ?? r.batch}</span>}</>
                      : null}
                    {r.closeReason && <div className="text-[var(--muted-foreground)]">{r.closeReason}</div>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-xs text-[var(--muted-foreground)]">{r.closedAt ? formatDateTime(r.closedAt) : r.fulfilledAt ? formatDateTime(r.fulfilledAt) : r.createdAt}</td>
                  <td className="p-3 text-right">
                    {r.status === "FULFILLED" && can("clerk") && (
                      <button type="button" onClick={() => setDialog({ mode: "return", preset: { redemptionId: r.id } })} className={`${linkButton} text-[var(--gold-mid)]`}>Return</button>
                    )}
                  </td>
                </tr>
              ))}
              {!history.length && <EmptyRow colSpan={6}>No completed redemptions yet.</EmptyRow>}
            </tbody>
          </table>
        )}
        </div>
        <TablePagination {...pagedTables[tab].pagination} />
      </div>
      {dialog && <StockMovementDialog actorId={actorId} mode={dialog.mode} preset={dialog.preset} onClose={() => setDialog(null)} closing={dialogClosing} />}
    </div>
  );
}
