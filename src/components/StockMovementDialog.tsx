import { useState, type FormEvent } from "react";
import { AdminModal } from "./AdminModal";
import { useFeedback } from "./FeedbackProvider";
import { field, primaryButton, secondaryButton, useStockAccess } from "./StockUi";
import { useShop, type StockLineInput } from "../data/shop";
import { batchExpiries, levelKey, todayDate, variantIds, variantLabel } from "../data/stock";

export type StockFormMode = "receive" | "adjust" | "transfer" | "writeoff" | "return";
export type StockFormPreset = Partial<{
  rewardId: string;
  variantId: string;
  locationId: string;
  qty: number;
  batch: string;
  kind: "DAMAGE" | "LOSS" | "EXPIRY";
  redemptionId: string;
}>;

const titles: Record<StockFormMode, string> = {
  receive: "Receive stock",
  adjust: "Manual adjustment",
  transfer: "Transfer between locations",
  writeoff: "Write off stock",
  return: "Return to stock",
};

export function StockMovementDialog({ actorId, mode, preset = {}, onClose, closing }: {
  actorId: string; mode: StockFormMode; preset?: StockFormPreset; onClose: () => void; closing: boolean;
}) {
  const shop = useShop();
  const { notify } = useFeedback();
  const access = useStockAccess(actorId);
  const activeLocations = shop.stockLocations.filter((l) => l.active);
  const presetRedemption = shop.redemptions.find((r) => r.id === preset.redemptionId);
  const firstReward = preset.rewardId ?? presetRedemption?.rewardId ?? shop.rewards[0]?.id ?? "";
  const [rewardId, setRewardId] = useState(firstReward);
  const [variantId, setVariantId] = useState(preset.variantId ?? presetRedemption?.variantId ?? variantIds(shop.stockItemFor(firstReward))[0]);
  const [locationId, setLocationId] = useState(preset.locationId ?? presetRedemption?.locationId ?? activeLocations[0]?.id ?? "");
  const [toLocationId, setToLocationId] = useState(activeLocations.find((l) => l.id !== locationId)?.id ?? "");
  const [qty, setQty] = useState(preset.qty ?? 1);
  const [batch, setBatch] = useState(preset.batch ?? "");
  const [expiresAt, setExpiresAt] = useState("");
  const [serialText, setSerialText] = useState("");
  const [pickedSerials, setPickedSerials] = useState<string[]>([]);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [kind, setKind] = useState<"DAMAGE" | "LOSS" | "EXPIRY">(preset.kind ?? "DAMAGE");
  const [source, setSource] = useState<"PURCHASE" | "DONATION">("PURCHASE");
  const item = shop.stockItemFor(rewardId);
  const [supplierId, setSupplierId] = useState(item.supplierId);
  const [unitCost, setUnitCost] = useState(item.unitCost);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [redemptionId, setRedemptionId] = useState(preset.redemptionId ?? "");
  const [refund, setRefund] = useState(false);
  const [error, setError] = useState("");

  const redemption = shop.redemptions.find((r) => r.id === redemptionId);
  const inflow = mode === "receive" || mode === "return" || (mode === "adjust" && direction === "in");
  const level = shop.stockLevels.find((l) => l.key === levelKey(rewardId, variantId, locationId));
  const expiries = batchExpiries(shop.stockMovements);
  const knownBatches = [...new Set(shop.stockLevels.filter((l) => l.rewardId === rewardId).flatMap((l) => l.batches.map((b) => b.batch)))];
  const existingExpiry = expiries.get(`${rewardId}|${batch.trim().toUpperCase()}`);
  const serials = item.tracking === "serial" ? (inflow ? serialText.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean) : pickedSerials) : [];
  const effectiveQty = item.tracking === "serial" ? serials.length : qty;
  const linked = mode === "return" && !!redemption;
  // A linked return reuses the batch or serial from the fulfilment, unless it predates tracking.
  const showTracking = !linked || (item.tracking === "batch" && !redemption.batch) || (item.tracking === "serial" && !redemption.serial);
  const fulfilled = shop.redemptions.filter((r) => r.status === "FULFILLED");
  const today = todayDate();
  const locationChoices = inflow ? activeLocations : shop.stockLocations;

  const chooseReward = (id: string) => {
    const next = shop.stockItemFor(id);
    setRewardId(id);
    setVariantId(variantIds(next)[0]);
    setBatch("");
    setPickedSerials([]);
    setSerialText("");
    setSupplierId(next.supplierId);
    setUnitCost(next.unitCost);
    setError("");
  };
  const chooseRedemption = (id: string) => {
    setRedemptionId(id);
    const r = shop.redemptions.find((x) => x.id === id);
    if (r) {
      setRewardId(r.rewardId);
      setVariantId(r.variantId);
      if (r.locationId) setLocationId(r.locationId);
      setBatch(r.batch ?? "");
      setQty(1);
    } else setRefund(false);
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const line: StockLineInput = { rewardId, variantId, locationId, qty: effectiveQty, batch: batch.trim() || undefined, expiresAt: expiresAt || undefined, serials };
    const result =
      mode === "receive" ? shop.receiveStock(actorId, { ...line, source, supplierId, unitCost, reference, note: reason })
      : mode === "adjust" ? shop.adjustStock(actorId, { ...line, direction, reason })
      : mode === "transfer" ? shop.transferStock(actorId, { ...line, toLocationId, note: reason })
      : mode === "writeoff" ? shop.writeOffStock(actorId, { ...line, kind, reason })
      : shop.returnStock(actorId, { ...line, redemptionId, refundPoints: refund, reason });
    if (result) return setError(result);
    notify(`${titles[mode]} recorded in the stock ledger.`, "success");
    onClose();
  };

  return (
    <AdminModal title={titles[mode]} onClose={onClose} closing={closing} wide>
      <form onSubmit={submit} className="space-y-4">
        {mode === "return" && (
          <label className="block text-xs">
            Linked redemption
            <select className={field} value={redemptionId} onChange={(e) => chooseRedemption(e.target.value)}>
              <option value="">Not linked (counter return, found stock)</option>
              {fulfilled.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rewardName} · {shop.customers.find((c) => c.id === r.userId)?.name ?? r.userId} · {r.createdAt}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "adjust" && (
          <div className="flex gap-2" role="radiogroup" aria-label="Adjustment direction">
            {(["in", "out"] as const).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={direction === d} onClick={() => { setDirection(d); setBatch(""); setPickedSerials([]); setError(""); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${direction === d ? "border-[var(--gold-mid)] bg-[var(--gold-mid)]/10 text-[var(--gold-mid)]" : "border-[var(--border)]"}`}>
                {d === "in" ? "Increase on hand" : "Decrease on hand"}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs sm:col-span-2 lg:col-span-1">
            Reward item
            <select className={field} value={rewardId} disabled={linked} onChange={(e) => chooseReward(e.target.value)}>
              {shop.rewards.map((r) => <option key={r.id} value={r.id}>{shop.stockItemFor(r.id).sku} · {r.name}</option>)}
            </select>
          </label>
          {item.variants.length > 0 && (
            <label className="text-xs">
              Variant
              <select className={field} value={variantId} disabled={linked} onChange={(e) => { setVariantId(e.target.value); setBatch(""); setPickedSerials([]); }}>
                {item.variants.map((v) => <option key={v.id} value={v.id}>{variantLabel(item, v.id)} · {v.sku}</option>)}
              </select>
            </label>
          )}
          <label className="text-xs">
            {mode === "transfer" ? "From location" : "Location"}
            <select className={field} value={locationId} onChange={(e) => {
              const next = e.target.value;
              setLocationId(next);
              setBatch("");
              setPickedSerials([]);
              if (next === toLocationId) setToLocationId(activeLocations.find((l) => l.id !== next)?.id ?? "");
            }}>
              {locationChoices.map((l) => <option key={l.id} value={l.id}>{l.name}{l.active ? "" : " (inactive)"}</option>)}
            </select>
          </label>
          {mode === "transfer" && (
            <label className="text-xs">
              To location
              <select className={field} value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                {activeLocations.filter((l) => l.id !== locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
          {mode === "writeoff" && (
            <label className="text-xs">
              Write-off type
              <select className={field} value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setBatch(""); }}>
                <option value="DAMAGE">Damage</option>
                <option value="LOSS">Loss / theft</option>
                <option value="EXPIRY">Expiry</option>
              </select>
            </label>
          )}
          {item.tracking !== "serial" && (
            <label className="text-xs">
              Quantity
              <input type="number" min={1} step={1} required className={field} value={qty} disabled={linked} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
          )}
        </div>

        <p className="rounded-lg bg-[var(--secondary)]/60 px-3 py-2 text-xs text-[var(--muted-foreground)]">
          At this location: <strong className="text-[var(--foreground)]">{level?.onHand ?? 0}</strong> on hand ·{" "}
          <strong className="text-[var(--foreground)]">{level?.reserved ?? 0}</strong> reserved ·{" "}
          <strong className="text-[var(--foreground)]">{level?.available ?? 0}</strong> available
          {level?.expired ? <> · <strong className="text-orange-400">{level.expired}</strong> expired</> : null}
          {" "}· Tracking: {item.tracking === "none" ? "quantity only" : item.tracking}
        </p>

        {item.tracking === "batch" && showTracking && (inflow ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">
              Batch / lot code
              <input required list="known-batches" className={field} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. KPC-1126" />
              <datalist id="known-batches">{knownBatches.map((b) => <option key={b} value={b} />)}</datalist>
            </label>
            <label className="text-xs">
              Expiry date {existingExpiry && <span className="text-[var(--muted-foreground)]">(set by first receipt)</span>}
              <input type="date" className={field} value={existingExpiry ?? expiresAt} disabled={!!existingExpiry} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
          </div>
        ) : (
          <label className="block text-xs">
            Batch
            <select className={field} value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">{mode === "writeoff" && kind === "EXPIRY" ? "Auto: expired batches first" : "Auto: first-expiry-first-out"}</option>
              {(level?.batches ?? []).map((b) => (
                <option key={b.batch} value={b.batch}>
                  {b.batch} · {b.onHand} on hand{b.expiresAt ? ` · expires ${b.expiresAt}${b.expiresAt < today ? " (expired)" : ""}` : ""}
                </option>
              ))}
            </select>
          </label>
        ))}

        {item.tracking === "serial" && showTracking && (inflow ? (
          <label className="block text-xs">
            Serial numbers, one per line ({serials.length} entered)
            <textarea required rows={3} className={`${field} font-mono-data`} value={serialText} onChange={(e) => setSerialText(e.target.value)} placeholder={"KR-R-010\nKR-R-011"} />
          </label>
        ) : (
          <fieldset className="text-xs">
            <legend className="mb-1">Serial numbers ({pickedSerials.length} selected)</legend>
            {level?.serials.length ? (
              <div className="flex flex-wrap gap-2">
                {level.serials.map((serial) => (
                  <label key={serial} className={`cursor-pointer rounded-lg border px-2 py-1 font-mono-data ${pickedSerials.includes(serial) ? "border-[var(--gold-mid)] text-[var(--gold-mid)]" : "border-[var(--border)]"}`}>
                    <input type="checkbox" className="sr-only" checked={pickedSerials.includes(serial)}
                      onChange={() => setPickedSerials((list) => list.includes(serial) ? list.filter((x) => x !== serial) : [...list, serial])} />
                    {serial}
                  </label>
                ))}
              </div>
            ) : <p className="text-[var(--muted-foreground)]">No serials in stock at this location.</p>}
          </fieldset>
        ))}
        {linked && (redemption.batch || redemption.serial) && (
          <p className="text-xs text-[var(--muted-foreground)]">Returns {redemption.serial ? `serial ${redemption.serial}` : `batch ${redemption.batch}`} from the original fulfilment.</p>
        )}

        {mode === "receive" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">
              Source
              <select className={field} value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                <option value="PURCHASE">Purchase</option>
                <option value="DONATION">Partner donation</option>
              </select>
            </label>
            <label className="text-xs">
              {source === "DONATION" ? "Partner" : "Supplier"}
              <select className={field} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">None</option>
                {shop.suppliers.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.kind})</option>)}
              </select>
            </label>
            <label className="text-xs">
              Unit cost (USD)
              <input type="number" min={0} step="0.01" className={field} value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
            </label>
            <label className="text-xs">
              PO / donation ref.
              <input className={field} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO-2026-120" />
            </label>
          </div>
        )}

        {mode === "return" && (
          <label className={`flex items-center gap-2 text-sm ${linked && access.can("manager") ? "" : "opacity-50"}`}>
            <input type="checkbox" checked={refund} disabled={!linked || !access.can("manager")} onChange={(e) => setRefund(e.target.checked)} />
            Refund {redemption ? `${redemption.points} points` : "points"} to the customer {!access.can("manager") && "(stock manager only)"}
          </label>
        )}

        <label className="block text-xs">
          {mode === "receive" || mode === "transfer" ? "Note (optional)" : "Reason (required)"}
          <input required={mode !== "receive" && mode !== "transfer"} className={field} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "writeoff" ? "e.g. Packaging torn, unsellable" : mode === "adjust" ? "e.g. Miscount corrected after shelf check" : ""} />
        </label>
        <p className="text-xs text-[var(--muted-foreground)]">Recorded as {shop.adminUsers.find((u) => u.id === actorId)?.name ?? "you"}. Ledger entries cannot be edited or deleted.</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" className={primaryButton}>{titles[mode]}</button>
        </div>
      </form>
    </AdminModal>
  );
}
