import { useMemo, useState, type FormEvent } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { AdminModal } from "../../components/AdminModal";
import { useModalState } from "../../components/useModalState";
import { StockMovementDialog, type StockFormMode, type StockFormPreset } from "../../components/StockMovementDialog";
import {
  EmptyRow, MovementBadge, PageHeader, Panel, StatTile, StatusPill, daysUntil, field, filterControl, formatDateTime,
  primaryButton, rowClass, secondaryButton, tableClass, theadClass, useStockAccess,
} from "../../components/StockUi";
import {
  movementLabels, stockStatus, stockStatusLabels, todayDate, totalsFor, variantIds, variantLabel,
  type StockItem, type StockMovementType, type StockStatus,
} from "../../data/stock";

type Dialog = { mode: StockFormMode; preset?: StockFormPreset } | null;

export function StockActionButtons({ actorId, preset, onOpen }: { actorId: string; preset?: StockFormPreset; onOpen: (dialog: Dialog) => void }) {
  const { can } = useStockAccess(actorId);
  const actions: { mode: StockFormMode; label: string; need: "clerk" | "manager" }[] = [
    { mode: "receive", label: "Receive", need: "clerk" },
    { mode: "transfer", label: "Transfer", need: "clerk" },
    { mode: "return", label: "Return", need: "clerk" },
    { mode: "adjust", label: "Adjust", need: "manager" },
    { mode: "writeoff", label: "Write off", need: "manager" },
  ];
  return (
    <>
      {actions.map((a) => (
        <button key={a.mode} type="button" disabled={!can(a.need)} title={can(a.need) ? undefined : "Needs stock manager authority"}
          onClick={() => onOpen({ mode: a.mode, preset })} className={a.mode === "receive" ? primaryButton : secondaryButton}>
          {a.mode === "receive" ? "+ Receive" : a.label}
        </button>
      ))}
    </>
  );
}

export function AdminStockPage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [tracking, setTracking] = useState("all");
  const [dialog, setDialog, dialogClosing] = useModalState<Dialog>(null);
  const activeIds = shop.stockLocations.filter((l) => l.active).map((l) => l.id);

  const rows = shop.rewards.map((reward) => {
    const item = shop.stockItemFor(reward.id);
    const all = totalsFor(shop.stockLevels, { rewardId: reward.id, locationIds: activeIds });
    const scoped = locationId === "all" ? totalsFor(shop.stockLevels, { rewardId: reward.id }) : totalsFor(shop.stockLevels, { rewardId: reward.id, locationId });
    return { reward, item, scoped, status: stockStatus(item, all.available) };
  });

  const categories = [...new Set(shop.rewards.map((r) => r.category))];
  const q = query.trim().toLowerCase();
  const filtered = rows.filter(({ reward, item, status: s }) =>
    (!q || [item.sku, reward.name, reward.nameKh, ...item.variants.map((v) => v.sku)].some((t) => t.toLowerCase().includes(q))) &&
    (category === "all" || reward.category === category) &&
    (status === "all" || s === status) &&
    (tracking === "all" || item.tracking === tracking),
  );
  const totalValue = filtered.reduce((sum, r) => sum + r.scoped.onHand * r.item.unitCost, 0);

  const selectedReward = shop.rewards.find((r) => r.id === selected);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-8">
      {selectedReward ? (
        <StockItemDetail actorId={actorId} rewardId={selectedReward.id} onBack={() => setSelected(null)} onOpen={setDialog} />
      ) : (
        <>
          <PageHeader eyebrow="Inventory" title="Stock levels"
            description="On hand, reserved, and available stock for every reward. Select an item for its locations, batches, settings, and full movement history."
            actions={<StockActionButtons actorId={actorId} onOpen={setDialog} />} />
          <div className="flex flex-wrap gap-2">
            <input type="search" aria-label="Search stock" placeholder="Search SKU or name…" value={query} onChange={(e) => setQuery(e.target.value)} className={`${filterControl} min-w-56 flex-1`} />
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={filterControl}>
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select aria-label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={filterControl}>
              <option value="all">All locations</option>
              {shop.stockLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select aria-label="Stock status" value={status} onChange={(e) => setStatus(e.target.value as StockStatus | "all")} className={filterControl}>
              <option value="all">Any status</option>
              {(Object.keys(stockStatusLabels) as StockStatus[]).map((s) => <option key={s} value={s}>{stockStatusLabels[s]}</option>)}
            </select>
            <select aria-label="Tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} className={filterControl}>
              <option value="all">Any tracking</option>
              <option value="none">Quantity only</option>
              <option value="batch">Batch / expiry</option>
              <option value="serial">Serial</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className="p-3">SKU</th><th className="p-3">Item</th><th className="p-3">Category</th>
                  <th className="p-3 text-right">Points</th><th className="p-3 text-right">On hand</th><th className="p-3 text-right">Reserved</th>
                  <th className="p-3 text-right">Available</th><th className="p-3">Status</th><th className="p-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ reward, item, scoped, status: s }) => (
                  <tr key={reward.id} onClick={() => setSelected(reward.id)} className={`${rowClass} cursor-pointer hover:bg-[var(--secondary)]/50`}>
                    <td className="p-3 font-mono-data text-xs">{item.sku}</td>
                    <td className="p-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(reward.id); }} className="text-left font-medium hover:text-[var(--gold-mid)]">{reward.name}</button>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {reward.nameKh}{item.variants.length ? ` · ${item.variants.length} variants` : ""}{item.tracking !== "none" ? ` · ${item.tracking}` : ""}
                        {!reward.active && <span className="ml-1 text-amber-400">· inactive</span>}
                      </div>
                    </td>
                    <td className="p-3 text-xs">{reward.category}</td>
                    <td className="p-3 text-right font-mono-data">{reward.pointsCost}</td>
                    <td className="p-3 text-right font-mono-data">{scoped.onHand}</td>
                    <td className="p-3 text-right font-mono-data text-purple-300">{scoped.reserved || "—"}</td>
                    <td className="p-3 text-right font-mono-data font-semibold">{scoped.available}</td>
                    <td className="p-3"><StatusPill status={s} /></td>
                    <td className="p-3 text-right font-mono-data text-xs">{shop.money(scoped.onHand * item.unitCost)}</td>
                  </tr>
                ))}
                {!filtered.length && <EmptyRow colSpan={9}>No stock items match these filters.</EmptyRow>}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                    <td className="p-3" colSpan={8}>{filtered.length} item{filtered.length === 1 ? "" : "s"} · status uses available stock across active locations</td>
                    <td className="p-3 text-right font-mono-data text-[var(--gold-mid)]">{shop.money(totalValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
      {dialog && <StockMovementDialog actorId={actorId} mode={dialog.mode} preset={dialog.preset} onClose={() => setDialog(null)} closing={dialogClosing} />}
    </div>
  );
}

function StockItemDetail({ actorId, rewardId, onBack, onOpen }: { actorId: string; rewardId: string; onBack: () => void; onOpen: (dialog: Dialog) => void }) {
  const shop = useShop();
  const { can } = useStockAccess(actorId);
  const [typeFilter, setTypeFilter] = useState<StockMovementType | "all">("all");
  const [editing, setEditing, editClosing] = useModalState<StockItem | null>(null);
  const reward = shop.rewards.find((r) => r.id === rewardId)!;
  const item = shop.stockItemFor(rewardId);
  const today = todayDate();
  const activeIds = shop.stockLocations.filter((l) => l.active).map((l) => l.id);
  const levels = shop.stockLevels.filter((l) => l.rewardId === rewardId);
  const totals = totalsFor(levels, { locationIds: activeIds });
  const allTotals = totalsFor(levels, {});
  const supplier = shop.suppliers.find((x) => x.id === item.supplierId);
  const openRedemptions = shop.redemptions.filter((r) => r.rewardId === rewardId && (r.status === "RESERVED" || r.status === "BACKORDERED"));
  const locName = (id: string) => shop.stockLocations.find((l) => l.id === id)?.name ?? id;

  // Item-wide running balance, oldest first, shown newest first.
  const history = useMemo(() => {
    const rows = shop.stockMovements.filter((m) => m.rewardId === rewardId);
    let balance = 0;
    const withBalance = [...rows].reverse().map((m) => ({ ...m, balance: (balance += m.onHand) }));
    return withBalance.reverse();
  }, [shop.stockMovements, rewardId]);
  const shownHistory = history.filter((m) => typeFilter === "all" || m.type === typeFilter);

  const levelRows = shop.stockLocations.flatMap((location) => variantIds(item).map((variantId) => ({
    location, variantId, level: levels.find((l) => l.locationId === location.id && l.variantId === variantId),
  }))).filter((r) => r.level || r.location.active);

  return (
    <>
      <button type="button" onClick={onBack} className="self-start text-sm text-[var(--muted-foreground)] hover:text-[var(--gold-mid)]">← Back to stock levels</button>
      <PageHeader eyebrow={`Stock item · ${item.sku}`} title={reward.name}
        description={`${reward.nameKh} · ${reward.category} · ${reward.pointsCost} pts · ${reward.active ? "Active" : "Inactive"} on the storefront`}
        actions={<StockActionButtons actorId={actorId} preset={{ rewardId }} onOpen={onOpen} />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="On hand" value={allTotals.onHand} icon="warehouse" sub="all locations" />
        <StatTile label="Reserved" value={totals.reserved} icon="lock" sub={`${openRedemptions.filter((r) => r.status === "RESERVED").length} open reservations`} />
        <StatTile label="Available" value={totals.available} icon="check" tone={totals.available ? "green" : "red"} sub={<StatusPill status={stockStatus(item, totals.available)} />} />
        <StatTile label="Expired" value={allTotals.expired} icon="alert" tone={allTotals.expired ? "orange" : "gold"} sub="awaiting write-off" />
        <StatTile label="Stock value" value={shop.money(allTotals.onHand * item.unitCost)} icon="wallet" sub={`at ${shop.money(item.unitCost)} / unit`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Levels by location" description="Available excludes reserved and expired units." flush>
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr><th className="p-3">Location</th>{item.variants.length > 0 && <th className="p-3">Variant</th>}<th className="p-3 text-right">On hand</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Expired</th><th className="p-3 text-right">Available</th></tr>
                </thead>
                <tbody>
                  {levelRows.map(({ location, variantId, level }) => (
                    <tr key={`${location.id}|${variantId}`} className={rowClass}>
                      <td className="p-3">{location.name}{!location.active && <span className="ml-1 text-xs text-amber-400">(inactive)</span>}</td>
                      {item.variants.length > 0 && <td className="p-3 text-xs">{variantLabel(item, variantId)}</td>}
                      <td className="p-3 text-right font-mono-data">{level?.onHand ?? 0}</td>
                      <td className="p-3 text-right font-mono-data">{level?.reserved ?? 0}</td>
                      <td className="p-3 text-right font-mono-data text-orange-400">{level?.expired || "—"}</td>
                      <td className="p-3 text-right font-mono-data font-semibold">{level?.available ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <Panel title="Stock rules" actions={can("manager") && <button type="button" onClick={() => setEditing(item)} className={secondaryButton}>Edit</button>}>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-[var(--muted-foreground)]">Low-stock at</dt><dd className="text-right font-mono-data">≤ {item.lowStockThreshold}</dd>
            <dt className="text-[var(--muted-foreground)]">Reorder point</dt><dd className="text-right font-mono-data">≤ {item.reorderPoint}</dd>
            <dt className="text-[var(--muted-foreground)]">Reorder qty</dt><dd className="text-right font-mono-data">{item.reorderQty}</dd>
            <dt className="text-[var(--muted-foreground)]">Tracking</dt><dd className="text-right">{item.tracking === "none" ? "Quantity" : item.tracking === "batch" ? "Batch & expiry" : "Serial"}</dd>
            <dt className="text-[var(--muted-foreground)]">When out</dt><dd className="text-right">{item.outOfStock === "hide" ? "Hide on storefront" : "Show as disabled"}</dd>
            <dt className="text-[var(--muted-foreground)]">Backorders</dt><dd className="text-right">{item.allowBackorder ? "Allowed" : "Notify me only"}</dd>
            <dt className="text-[var(--muted-foreground)]">Supplier</dt><dd className="text-right">{supplier?.name ?? "—"}</dd>
          </dl>
          {openRedemptions.length > 0 && (
            <p className="mt-3 rounded-lg bg-purple-400/10 px-3 py-2 text-xs text-purple-300">
              {openRedemptions.filter((r) => r.status === "RESERVED").length} reserved · {openRedemptions.filter((r) => r.status === "BACKORDERED").length} backordered redemptions open.
            </p>
          )}
        </Panel>
      </div>

      {item.tracking === "batch" && (
        <Panel title="Batches" description="Issued first-expiry-first-out. Expired units are excluded from availability." flush>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}><tr><th className="p-3">Batch</th><th className="p-3">Location</th>{item.variants.length > 0 && <th className="p-3">Variant</th>}<th className="p-3 text-right">On hand</th><th className="p-3">Expires</th><th className="p-3" /></tr></thead>
              <tbody>
                {levels.flatMap((l) => l.batches.map((b) => ({ l, b }))).map(({ l, b }) => {
                  const days = b.expiresAt ? daysUntil(b.expiresAt) : null;
                  const expired = !!b.expiresAt && b.expiresAt < today;
                  return (
                    <tr key={`${l.key}|${b.batch}`} className={rowClass}>
                      <td className="p-3 font-mono-data text-xs">{b.batch}</td>
                      <td className="p-3">{locName(l.locationId)}</td>
                      {item.variants.length > 0 && <td className="p-3 text-xs">{variantLabel(item, l.variantId)}</td>}
                      <td className="p-3 text-right font-mono-data">{b.onHand}</td>
                      <td className={`p-3 text-xs ${expired ? "text-red-400" : days !== null && days <= 30 ? "text-orange-400" : ""}`}>
                        {b.expiresAt ? `${b.expiresAt} · ${expired ? "expired" : `${days}d left`}` : "No expiry"}
                      </td>
                      <td className="p-3 text-right">
                        {expired && can("manager") && b.onHand > 0 && (
                          <button type="button" className="text-xs text-orange-400 hover:underline"
                            onClick={() => onOpen({ mode: "writeoff", preset: { rewardId, variantId: l.variantId, locationId: l.locationId, batch: b.batch, qty: b.onHand, kind: "EXPIRY" } })}>
                            Write off
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!levels.some((l) => l.batches.length) && <EmptyRow colSpan={6}>No batches on hand.</EmptyRow>}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {item.tracking === "serial" && (
        <Panel title="Serial numbers in stock">
          <div className="space-y-3">
            {levels.filter((l) => l.serials.length).map((l) => (
              <div key={l.key}>
                <div className="mb-1 text-xs text-[var(--muted-foreground)]">{locName(l.locationId)}{item.variants.length ? ` · ${variantLabel(item, l.variantId)}` : ""}</div>
                <div className="flex flex-wrap gap-1.5">{l.serials.map((serial) => <span key={serial} className="rounded-md bg-[var(--secondary)] px-2 py-0.5 font-mono-data text-xs">{serial}</span>)}</div>
              </div>
            ))}
            {!levels.some((l) => l.serials.length) && <p className="text-sm text-[var(--muted-foreground)]">No serialised units in stock.</p>}
          </div>
        </Panel>
      )}

      <Panel title="Movement history" description="Append-only ledger for this item. Balance is the item-wide on-hand total after each entry." flush
        actions={(
          <select aria-label="Movement type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as StockMovementType | "all")} className={filterControl}>
            <option value="all">All types</option>
            {(Object.keys(movementLabels) as StockMovementType[]).map((t) => <option key={t} value={t}>{movementLabels[t]}</option>)}
          </select>
        )}>
        <div className="max-h-[520px] overflow-auto">
          <table className={`${tableClass} min-w-[900px]`}>
            <thead className={`${theadClass} sticky top-0 bg-[var(--card)]`}>
              <tr><th className="p-3">When</th><th className="p-3">Type</th><th className="p-3">Location</th><th className="p-3">Lot / serial</th><th className="p-3 text-right">On hand Δ</th><th className="p-3 text-right">Reserved Δ</th><th className="p-3 text-right">Balance</th><th className="p-3">Reference · reason</th><th className="p-3">By</th></tr>
            </thead>
            <tbody>
              {shownHistory.map((m) => (
                <tr key={m.id} className={rowClass}>
                  <td className="whitespace-nowrap p-3 text-xs text-[var(--muted-foreground)]">{formatDateTime(m.createdAt)}</td>
                  <td className="p-3"><MovementBadge type={m.type} /></td>
                  <td className="p-3 text-xs">{locName(m.locationId)}{item.variants.length ? <div className="text-[var(--muted-foreground)]">{variantLabel(item, m.variantId)}</div> : null}</td>
                  <td className="p-3 font-mono-data text-xs">{m.serials?.join(", ") || m.batch || "—"}</td>
                  <td className={`p-3 text-right font-mono-data ${m.onHand > 0 ? "text-green-400" : m.onHand < 0 ? "text-red-400" : "text-[var(--muted-foreground)]"}`}>{m.onHand > 0 ? `+${m.onHand}` : m.onHand || "—"}</td>
                  <td className="p-3 text-right font-mono-data text-purple-300">{m.reserved > 0 ? `+${m.reserved}` : m.reserved || "—"}</td>
                  <td className="p-3 text-right font-mono-data">{m.balance}</td>
                  <td className="p-3 text-xs">{m.reference && <span className="font-mono-data text-[var(--gold-mid)]">{m.reference} </span>}{m.reason}</td>
                  <td className="p-3 text-xs">{m.actorName}</td>
                </tr>
              ))}
              {!shownHistory.length && <EmptyRow colSpan={9}>No movements of this type yet.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Panel>
      {editing && <StockItemSettingsDialog actorId={actorId} item={editing} onClose={() => setEditing(null)} closing={editClosing} />}
    </>
  );
}

function StockItemSettingsDialog({ actorId, item, onClose, closing }: { actorId: string; item: StockItem; onClose: () => void; closing: boolean }) {
  const shop = useShop();
  const { notify } = useFeedback();
  const [draft, setDraft] = useState(item);
  const [error, setError] = useState("");
  const change = <K extends keyof StockItem>(key: K, value: StockItem[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = shop.saveStockItem(actorId, draft);
    if (result) return setError(result);
    notify("Stock rules saved.", "success");
    onClose();
  };
  return (
    <AdminModal title="Stock rules" onClose={onClose} closing={closing} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs">SKU<input required className={`${field} font-mono-data`} value={draft.sku} onChange={(e) => change("sku", e.target.value)} /></label>
          <label className="text-xs">Unit cost (USD)<input type="number" min={0} step="0.01" className={field} value={draft.unitCost} onChange={(e) => change("unitCost", Number(e.target.value))} /></label>
          <label className="text-xs">Supplier / partner
            <select className={field} value={draft.supplierId} onChange={(e) => change("supplierId", e.target.value)}>
              <option value="">None</option>
              {shop.suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label className="text-xs">Low-stock threshold<input type="number" min={0} step={1} className={field} value={draft.lowStockThreshold} onChange={(e) => change("lowStockThreshold", Number(e.target.value))} /></label>
          <label className="text-xs">Reorder point<input type="number" min={0} step={1} className={field} value={draft.reorderPoint} onChange={(e) => change("reorderPoint", Number(e.target.value))} /></label>
          <label className="text-xs">Reorder quantity<input type="number" min={1} step={1} className={field} value={draft.reorderQty} onChange={(e) => change("reorderQty", Number(e.target.value))} /></label>
          <label className="text-xs">Tracking
            <select className={field} value={draft.tracking} onChange={(e) => change("tracking", e.target.value as StockItem["tracking"])}>
              <option value="none">Quantity only</option>
              <option value="batch">Batch / lot with expiry</option>
              <option value="serial">Serial number per unit</option>
            </select>
          </label>
          <label className="text-xs">When out of stock
            <select className={field} value={draft.outOfStock} onChange={(e) => change("outOfStock", e.target.value as StockItem["outOfStock"])}>
              <option value="disable">Show as disabled</option>
              <option value="hide">Hide from storefront</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={draft.allowBackorder} onChange={(e) => change("allowBackorder", e.target.checked)} />
            Allow backorders
          </label>
        </div>
        <fieldset className="space-y-2 rounded-xl border border-[var(--border)] p-3">
          <legend className="px-1 text-xs font-semibold">Variants</legend>
          {draft.variants.map((v, index) => (
            <div key={v.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              {(["size", "color", "sku"] as const).map((key) => (
                <input key={key} aria-label={`Variant ${index + 1} ${key}`} placeholder={key === "color" ? "Colour" : key === "sku" ? "SKU (auto)" : "Size"} className={field} value={v[key]}
                  onChange={(e) => change("variants", draft.variants.map((x) => x.id === v.id ? { ...x, [key]: e.target.value } : x))} />
              ))}
              <button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => change("variants", draft.variants.filter((x) => x.id !== v.id))} className="rounded-lg px-2 text-red-400 hover:bg-red-400/10">×</button>
            </div>
          ))}
          {!draft.variants.length && <p className="text-xs text-[var(--muted-foreground)]">No variants. Stock is held as a single standard item.</p>}
          <button type="button" className={secondaryButton}
            onClick={() => change("variants", [...draft.variants, { id: `v-${Math.random().toString(36).slice(2, 8)}`, size: "", color: "", sku: "" }])}>
            + Add variant
          </button>
        </fieldset>
        <p className="text-xs text-[var(--muted-foreground)]">Status order: out of stock → low stock (≤ threshold) → reorder (≤ reorder point). Tracking and variants holding stock can only change once that stock is zero.</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" className={primaryButton}>Save rules</button>
        </div>
      </form>
    </AdminModal>
  );
}
