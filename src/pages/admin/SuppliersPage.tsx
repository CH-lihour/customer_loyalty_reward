import { useState, type FormEvent } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { AdminModal } from "../../components/AdminModal";
import { ActionIconButton } from "../../components/ActionIconButton";
import { useModalState } from "../../components/useModalState";
import { EmptyRow, PageHeader, Panel, field, primaryButton, rowClass, secondaryButton, tableClass, theadClass, useStockAccess } from "../../components/StockUi";
import { totalsFor, type StockLocation, type Supplier } from "../../data/stock";

const blankSupplier = (): Supplier => ({ id: "", name: "", kind: "supplier", contact: "", phone: "", email: "", active: true });
const blankLocation = (): StockLocation => ({ id: "", name: "", nameKh: "", type: "warehouse", active: true });
const locationTypes: Record<StockLocation["type"], string> = { warehouse: "Warehouse", store: "Store", pickup: "Pickup point" };

export function AdminSuppliersPage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const { notify } = useFeedback();
  const { can } = useStockAccess(actorId);
  const manager = can("manager");
  const [supplier, setSupplier, supplierClosing] = useModalState<Supplier | null>(null);
  const [location, setLocation, locationClosing] = useModalState<StockLocation | null>(null);
  const [error, setError] = useState("");

  const toggleSupplier = (x: Supplier) => {
    const result = shop.saveSupplier(actorId, { ...x, active: !x.active });
    notify(result ?? `${x.name} ${x.active ? "deactivated" : "activated"}.`, result ? "error" : "success");
  };
  const toggleLocation = (x: StockLocation) => {
    const result = shop.saveStockLocation(actorId, { ...x, active: !x.active });
    notify(result ?? `${x.name} ${x.active ? "deactivated" : "activated"}.`, result ? "error" : "success");
  };
  const submitSupplier = (event: FormEvent) => {
    event.preventDefault();
    if (!supplier) return;
    const result = shop.saveSupplier(actorId, supplier);
    if (result) return setError(result);
    setSupplier(null);
    notify("Supplier saved.", "success");
  };
  const submitLocation = (event: FormEvent) => {
    event.preventDefault();
    if (!location) return;
    const result = shop.saveStockLocation(actorId, location);
    if (result) return setError(result);
    setLocation(null);
    notify("Location saved.", "success");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-8">
      <PageHeader eyebrow="Inventory" title="Suppliers & locations"
        description="Where reward stock comes from and where it is held. Locations with stock cannot be deactivated." />

      <Panel title="Suppliers and sourcing partners" description="Partners donate stock; suppliers sell it. Both can be chosen when receiving." flush
        actions={manager && <button type="button" onClick={() => { setError(""); setSupplier(blankSupplier()); }} className={primaryButton}>+ Add supplier</button>}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Contact</th><th className="p-3 text-right">Items</th><th className="p-3 text-right">Received (90d)</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {shop.suppliers.map((x) => {
                const since = new Date(Date.now() - 90 * 86400000).toISOString();
                const received = shop.stockMovements.filter((m) => m.type === "RECEIVE" && m.supplierId === x.id && m.createdAt >= since).reduce((n, m) => n + m.onHand, 0);
                return (
                  <tr key={x.id} className={rowClass}>
                    <td className="p-3 font-medium">{x.name}</td>
                    <td className="p-3 text-xs">{x.kind === "partner" ? "Sourcing partner" : "Supplier"}</td>
                    <td className="p-3 text-xs">{x.contact}<div className="text-[var(--muted-foreground)]">{[x.phone, x.email].filter(Boolean).join(" · ")}</div></td>
                    <td className="p-3 text-right font-mono-data">{Object.values(shop.stockItems).filter((i) => i.supplierId === x.id && shop.rewards.some((r) => r.id === i.rewardId)).length}</td>
                    <td className="p-3 text-right font-mono-data">{received}</td>
                    <td className="p-3 text-xs">{x.active ? <span className="text-green-400">Active</span> : <span className="text-[var(--muted-foreground)]">Inactive</span>}</td>
                    <td className="p-3">
                      {manager && (
                        <div className="flex justify-end gap-2">
                          <ActionIconButton action="edit" label={`Edit ${x.name}`} onClick={() => { setError(""); setSupplier(x); }} />
                          <ActionIconButton action={x.active ? "deactivate" : "activate"} label={`${x.active ? "Deactivate" : "Activate"} ${x.name}`} onClick={() => toggleSupplier(x)} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!shop.suppliers.length && <EmptyRow colSpan={7}>No suppliers yet.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Stock locations" description="Warehouses, stores, and pickup points. Redemptions reserve from the active location with the most available stock." flush
        actions={manager && <button type="button" onClick={() => { setError(""); setLocation(blankLocation()); }} className={primaryButton}>+ Add location</button>}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Location</th><th className="p-3">Type</th><th className="p-3 text-right">On hand</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Value</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {shop.stockLocations.map((x) => {
                const totals = totalsFor(shop.stockLevels, { locationId: x.id });
                const value = shop.stockLevels.filter((l) => l.locationId === x.id).reduce((n, l) => n + l.onHand * shop.stockItemFor(l.rewardId).unitCost, 0);
                return (
                  <tr key={x.id} className={rowClass}>
                    <td className="p-3 font-medium">{x.name}<div className="text-xs font-normal text-[var(--muted-foreground)]">{x.nameKh}</div></td>
                    <td className="p-3 text-xs">{locationTypes[x.type]}</td>
                    <td className="p-3 text-right font-mono-data">{totals.onHand}</td>
                    <td className="p-3 text-right font-mono-data">{totals.reserved}</td>
                    <td className="p-3 text-right font-mono-data text-xs">{shop.money(value)}</td>
                    <td className="p-3 text-xs">{x.active ? <span className="text-green-400">Active</span> : <span className="text-[var(--muted-foreground)]">Inactive</span>}</td>
                    <td className="p-3">
                      {manager && (
                        <div className="flex justify-end gap-2">
                          <ActionIconButton action="edit" label={`Edit ${x.name}`} onClick={() => { setError(""); setLocation(x); }} />
                          <ActionIconButton action={x.active ? "deactivate" : "activate"} label={`${x.active ? "Deactivate" : "Activate"} ${x.name}`} onClick={() => toggleLocation(x)} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {!manager && <p className="text-xs text-[var(--muted-foreground)]">Only stock managers and admins can edit suppliers and locations.</p>}

      {supplier && (
        <AdminModal title={supplier.id ? "Edit supplier" : "Add supplier"} onClose={() => setSupplier(null)} closing={supplierClosing}>
          <form onSubmit={submitSupplier} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs sm:col-span-2">Name<input required className={field} value={supplier.name} onChange={(e) => setSupplier({ ...supplier, name: e.target.value })} /></label>
              <label className="text-xs">Type
                <select className={field} value={supplier.kind} onChange={(e) => setSupplier({ ...supplier, kind: e.target.value as Supplier["kind"] })}>
                  <option value="supplier">Supplier (purchases)</option>
                  <option value="partner">Sourcing partner (donations)</option>
                </select>
              </label>
              <label className="text-xs">Contact person<input className={field} value={supplier.contact} onChange={(e) => setSupplier({ ...supplier, contact: e.target.value })} /></label>
              <label className="text-xs">Phone<input className={field} value={supplier.phone} onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })} /></label>
              <label className="text-xs">Email<input type="email" className={field} value={supplier.email} onChange={(e) => setSupplier({ ...supplier, email: e.target.value })} /></label>
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSupplier(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={primaryButton}>Save supplier</button>
            </div>
          </form>
        </AdminModal>
      )}
      {location && (
        <AdminModal title={location.id ? "Edit location" : "Add location"} onClose={() => setLocation(null)} closing={locationClosing}>
          <form onSubmit={submitLocation} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">Name<input required className={field} value={location.name} onChange={(e) => setLocation({ ...location, name: e.target.value })} /></label>
              <label className="text-xs">Khmer name<input className={field} value={location.nameKh} onChange={(e) => setLocation({ ...location, nameKh: e.target.value })} /></label>
              <label className="text-xs">Type
                <select className={field} value={location.type} onChange={(e) => setLocation({ ...location, type: e.target.value as StockLocation["type"] })}>
                  {Object.entries(locationTypes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setLocation(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={primaryButton}>Save location</button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
