import { useState } from "react";
import { useShop } from "../../data/shop";
import { EmptyRow, MovementBadge, PageHeader, Panel, StatTile, filterControl, rowClass, tableClass, theadClass } from "../../components/StockUi";
import { movementLabels, todayDate, totalsFor, type StockMovementType } from "../../data/stock";

type Report = "valuation" | "movements" | "velocity" | "reconciliation";
const reports: { id: Report; label: string }[] = [
  { id: "valuation", label: "Stock valuation" },
  { id: "movements", label: "Movement report" },
  { id: "velocity", label: "Fast & slow movers" },
  { id: "reconciliation", label: "Redemption reconciliation" },
];
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export function AdminStockReportsPage() {
  const shop = useShop();
  const [report, setReport] = useState<Report>("valuation");
  const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const khr = (n: number) => `៛${Math.round(n * shop.exchangeRate).toLocaleString()}`;
  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader eyebrow="Inventory" title="Stock reports" description={`Values use each item's standard unit cost. KHR at ${shop.exchangeRate.toLocaleString()} per USD.`} />
      <div className="flex flex-wrap gap-1" role="tablist">
        {reports.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={report === r.id} onClick={() => setReport(r.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${report === r.id ? "bg-[var(--gold-mid)] text-[var(--background)]" : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
            {r.label}
          </button>
        ))}
      </div>
      {report === "valuation" && <Valuation usd={usd} khr={khr} />}
      {report === "movements" && <MovementReport usd={usd} />}
      {report === "velocity" && <Velocity />}
      {report === "reconciliation" && <Reconciliation />}
    </div>
  );
}

function Valuation({ usd, khr }: { usd: (n: number) => string; khr: (n: number) => string }) {
  const shop = useShop();
  const rows = shop.rewards.map((reward) => {
    const item = shop.stockItemFor(reward.id);
    const totals = totalsFor(shop.stockLevels, { rewardId: reward.id });
    return { reward, item, totals, value: totals.onHand * item.unitCost, expiredValue: totals.expired * item.unitCost };
  }).sort((a, b) => b.value - a.value);
  const total = rows.reduce((n, r) => n + r.value, 0);
  const expired = rows.reduce((n, r) => n + r.expiredValue, 0);
  const reserved = rows.reduce((n, r) => n + r.totals.reserved * r.item.unitCost, 0);
  const byLocation = shop.stockLocations.map((location) => ({
    location,
    value: shop.stockLevels.filter((l) => l.locationId === location.id).reduce((n, l) => n + l.onHand * shop.stockItemFor(l.rewardId).unitCost, 0),
    units: totalsFor(shop.stockLevels, { locationId: location.id }).onHand,
  }));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Stock value (USD)" value={usd(total)} icon="wallet" />
        <StatTile label="Stock value (KHR)" value={khr(total)} icon="wallet" />
        <StatTile label="Held by reservations" value={usd(reserved)} icon="lock" sub={khr(reserved)} />
        <StatTile label="Expired, not written off" value={usd(expired)} icon="alert" tone={expired ? "orange" : "gold"} sub={khr(expired)} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="By item" flush>
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className={theadClass}><tr><th className="p-3">Item</th><th className="p-3 text-right">On hand</th><th className="p-3 text-right">Unit cost</th><th className="p-3 text-right">Value USD</th><th className="p-3 text-right">Value KHR</th><th className="p-3 text-right">Share</th></tr></thead>
                <tbody>
                  {rows.map(({ reward, item, totals, value }) => (
                    <tr key={reward.id} className={rowClass}>
                      <td className="p-3">{reward.name}<div className="font-mono-data text-xs text-[var(--muted-foreground)]">{item.sku}</div></td>
                      <td className="p-3 text-right font-mono-data">{totals.onHand}</td>
                      <td className="p-3 text-right font-mono-data text-xs">{usd(item.unitCost)}</td>
                      <td className="p-3 text-right font-mono-data">{usd(value)}</td>
                      <td className="p-3 text-right font-mono-data text-xs">{khr(value)}</td>
                      <td className="p-3 text-right font-mono-data text-xs">{total ? `${((value / total) * 100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-[var(--border)] font-semibold"><td className="p-3" colSpan={3}>Total</td><td className="p-3 text-right font-mono-data text-[var(--gold-mid)]">{usd(total)}</td><td className="p-3 text-right font-mono-data text-xs text-[var(--gold-mid)]">{khr(total)}</td><td /></tr></tfoot>
              </table>
            </div>
          </Panel>
        </div>
        <Panel title="By location">
          <ul className="space-y-3">
            {byLocation.map(({ location, value, units }) => (
              <li key={location.id}>
                <div className="flex justify-between text-sm"><span>{location.name}</span><span className="font-mono-data">{usd(value)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--secondary)]">
                  <div className="h-full rounded-full bg-[var(--gold-mid)]" style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
                </div>
                <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{units} units · {khr(value)}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function MovementReport({ usd }: { usd: (n: number) => string }) {
  const shop = useShop();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayDate());
  const [locationId, setLocationId] = useState("all");
  const rows = shop.stockMovements.filter((m) => {
    const day = m.createdAt.slice(0, 10);
    return day >= from && day <= to && (locationId === "all" || m.locationId === locationId);
  });
  const types = Object.keys(movementLabels) as StockMovementType[];
  const byType = types.map((type) => {
    const list = rows.filter((m) => m.type === type);
    return {
      type,
      count: list.length,
      units: list.reduce((n, m) => n + m.onHand, 0),
      reserved: list.reduce((n, m) => n + m.reserved, 0),
      value: list.reduce((n, m) => n + Math.abs(m.onHand) * m.unitCost, 0),
    };
  }).filter((t) => t.count);
  const columns: { label: string; types: StockMovementType[] }[] = [
    { label: "Received", types: ["RECEIVE"] },
    { label: "Issued", types: ["FULFILL"] },
    { label: "Returned", types: ["RETURN"] },
    { label: "Transfers", types: ["TRANSFER_IN", "TRANSFER_OUT"] },
    { label: "Written off", types: ["DAMAGE", "LOSS", "EXPIRY"] },
    { label: "Adjust & count", types: ["ADJUST", "COUNT"] },
  ];
  const byItem = shop.rewards.map((reward) => {
    const list = rows.filter((m) => m.rewardId === reward.id);
    return { reward, cells: columns.map((c) => list.filter((m) => c.types.includes(m.type)).reduce((n, m) => n + m.onHand, 0)), net: list.reduce((n, m) => n + m.onHand, 0) };
  }).filter((r) => r.cells.some(Boolean));
  const cell = (n: number) => <span className={n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-[var(--muted-foreground)]"}>{n > 0 ? `+${n}` : n || "—"}</span>;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={filterControl} /></label>
        <label className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={filterControl} /></label>
        <select aria-label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={filterControl}>
          <option value="all">All locations</option>
          {shop.stockLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => { setFrom(daysAgo(d)); setTo(todayDate()); }} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Last {d} days</button>)}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="By movement type" flush>
          <table className="w-full text-sm">
            <thead className={theadClass}><tr><th className="p-3 text-left">Type</th><th className="p-3 text-right">Entries</th><th className="p-3 text-right">Units</th><th className="p-3 text-right">Value</th></tr></thead>
            <tbody>
              {byType.map((t) => (
                <tr key={t.type} className={rowClass}>
                  <td className="p-3"><MovementBadge type={t.type} /></td>
                  <td className="p-3 text-right font-mono-data">{t.count}</td>
                  <td className="p-3 text-right font-mono-data">{t.units ? cell(t.units) : <span className="text-purple-300">{t.reserved > 0 ? `+${t.reserved}` : t.reserved} rsv</span>}</td>
                  <td className="p-3 text-right font-mono-data text-xs">{t.value ? usd(t.value) : "—"}</td>
                </tr>
              ))}
              {!byType.length && <EmptyRow colSpan={4}>No movements in this range.</EmptyRow>}
            </tbody>
          </table>
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="By item" description="Net on-hand change per movement group." flush>
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead className={theadClass}><tr><th className="p-3">Item</th>{columns.map((c) => <th key={c.label} className="p-3 text-right">{c.label}</th>)}<th className="p-3 text-right">Net</th></tr></thead>
                <tbody>
                  {byItem.map(({ reward, cells, net }) => (
                    <tr key={reward.id} className={rowClass}>
                      <td className="p-3">{reward.name}</td>
                      {cells.map((n, i) => <td key={i} className="p-3 text-right font-mono-data">{cell(n)}</td>)}
                      <td className="p-3 text-right font-mono-data font-semibold">{cell(net)}</td>
                    </tr>
                  ))}
                  {!byItem.length && <EmptyRow colSpan={columns.length + 2}>No stock changed in this range.</EmptyRow>}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Velocity() {
  const shop = useShop();
  const [period, setPeriod] = useState(30);
  const since = daysAgo(period);
  const activeIds = shop.stockLocations.filter((l) => l.active).map((l) => l.id);
  const rows = shop.rewards.map((reward) => {
    const list = shop.stockMovements.filter((m) => m.rewardId === reward.id && m.createdAt.slice(0, 10) >= since);
    const issued = -list.filter((m) => m.type === "FULFILL").reduce((n, m) => n + m.onHand, 0)
      - list.filter((m) => m.type === "RETURN").reduce((n, m) => n + m.onHand, 0);
    const available = totalsFor(shop.stockLevels, { rewardId: reward.id, locationIds: activeIds }).available;
    const perDay = issued / period;
    const cover = perDay > 0 ? Math.round(available / perDay) : Infinity;
    return { reward, issued, perDay, available, cover };
  }).sort((a, b) => b.issued - a.issued);
  const fastCut = rows.filter((r) => r.issued > 0)[Math.max(0, Math.ceil(rows.length / 4) - 1)]?.issued ?? Infinity;
  const label = (r: (typeof rows)[number]) =>
    r.issued === 0 ? (r.available > 0 ? { text: "No movement", tone: "text-red-400 bg-red-400/10" } : { text: "Idle, empty", tone: "text-[var(--muted-foreground)] bg-[var(--secondary)]" })
      : r.issued >= fastCut ? { text: "Fast", tone: "text-green-400 bg-green-400/10" }
        : r.cover > 180 ? { text: "Slow", tone: "text-orange-400 bg-orange-400/10" }
          : { text: "Steady", tone: "text-[var(--gold-mid)] bg-[var(--gold-mid)]/10" };
  const max = Math.max(1, ...rows.map((r) => r.issued));
  return (
    <>
      <div className="flex gap-2">
        {[30, 60, 90].map((d) => (
          <button key={d} type="button" onClick={() => setPeriod(d)} className={`rounded-full px-3 py-1 text-xs ${period === d ? "bg-[var(--gold-mid)] text-[var(--background)]" : "border border-[var(--border)] text-[var(--muted-foreground)]"}`}>{d} days</button>
        ))}
      </div>
      <Panel title="Rewards ranked by units issued" description="Issued = fulfilled (online and POS) minus returns. Fast = top quarter; slow = more than 180 days of cover." flush>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Item</th><th className="p-3">Issued</th><th className="p-3 text-right">Per week</th><th className="p-3 text-right">Available</th><th className="p-3 text-right">Days of cover</th><th className="p-3">Class</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const tag = label(r);
                return (
                  <tr key={r.reward.id} className={rowClass}>
                    <td className="p-3">{r.reward.name}<div className="text-xs text-[var(--muted-foreground)]">{r.reward.category}</div></td>
                    <td className="w-1/3 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--secondary)]"><div className="h-full rounded-full bg-[var(--gold-mid)]" style={{ width: `${(r.issued / max) * 100}%` }} /></div>
                        <span className="w-10 text-right font-mono-data text-xs">{r.issued}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono-data">{(r.perDay * 7).toFixed(1)}</td>
                    <td className="p-3 text-right font-mono-data">{r.available}</td>
                    <td className="p-3 text-right font-mono-data">{Number.isFinite(r.cover) ? r.cover : "∞"}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tag.tone}`}>{tag.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Reconciliation() {
  const shop = useShop();
  const redemptionIds = new Set(shop.redemptions.map((r) => r.id));
  const rows = shop.rewards.map((reward) => {
    const redemptions = shop.redemptions.filter((r) => r.rewardId === reward.id && !r.legacy);
    const moves = shop.stockMovements.filter((m) => m.rewardId === reward.id);
    const linked = moves.filter((m) => m.reference && redemptionIds.has(m.reference));
    const expected = {
      reserved: redemptions.filter((r) => r.status === "RESERVED").length,
      fulfilled: redemptions.filter((r) => r.status === "FULFILLED" || r.status === "RETURNED").length,
      returned: redemptions.filter((r) => r.status === "RETURNED").length,
    };
    const ledger = {
      reserved: moves.reduce((n, m) => n + m.reserved, 0),
      fulfilled: -linked.filter((m) => m.type === "FULFILL").reduce((n, m) => n + m.onHand, 0),
      returned: linked.filter((m) => m.type === "RETURN").reduce((n, m) => n + m.onHand, 0),
    };
    const pos = -moves.filter((m) => m.type === "FULFILL" && !(m.reference && redemptionIds.has(m.reference))).reduce((n, m) => n + m.onHand, 0);
    const ok = expected.reserved === ledger.reserved && expected.fulfilled === ledger.fulfilled && expected.returned === ledger.returned;
    return { reward, expected, ledger, pos, backordered: redemptions.filter((r) => r.status === "BACKORDERED").length, ok };
  });
  const issues = rows.filter((r) => !r.ok).length;
  const legacy = shop.redemptions.filter((r) => r.legacy).length;
  const pair = (a: number, b: number) => (
    <span className={a === b ? "" : "font-semibold text-red-400"}>{a} / {b}</span>
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Items reconciled" value={`${rows.length - issues}/${rows.length}`} icon="check" tone={issues ? "red" : "green"} sub={issues ? `${issues} need investigation` : "redemptions match the ledger"} />
        <StatTile label="Open reservations" value={rows.reduce((n, r) => n + r.expected.reserved, 0)} icon="lock" />
        <StatTile label="Backorders" value={rows.reduce((n, r) => n + r.backordered, 0)} icon="truck" sub="no stock held yet" />
        <StatTile label="POS issues" value={rows.reduce((n, r) => n + r.pos, 0)} icon="orders" sub="fulfilments without an online redemption" />
      </div>
      <Panel title="Redemptions vs stock ledger" description={`Each pair is redemption records / ledger units. Mismatches point to stock moved outside the redemption flow.${legacy ? ` ${legacy} redemptions from before the ledger are excluded.` : ""}`} flush>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Item</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Fulfilled</th><th className="p-3 text-right">Returned</th><th className="p-3 text-right">Backordered</th><th className="p-3 text-right">POS issues</th><th className="p-3">Result</th></tr></thead>
            <tbody>
              {rows.map(({ reward, expected, ledger, backordered, pos, ok }) => (
                <tr key={reward.id} className={rowClass}>
                  <td className="p-3">{reward.name}</td>
                  <td className="p-3 text-right font-mono-data">{pair(expected.reserved, ledger.reserved)}</td>
                  <td className="p-3 text-right font-mono-data">{pair(expected.fulfilled, ledger.fulfilled)}</td>
                  <td className="p-3 text-right font-mono-data">{pair(expected.returned, ledger.returned)}</td>
                  <td className="p-3 text-right font-mono-data">{backordered || "—"}</td>
                  <td className="p-3 text-right font-mono-data text-[var(--muted-foreground)]">{pos || "—"}</td>
                  <td className="p-3">{ok ? <span className="text-xs font-semibold text-green-400">✓ Matches</span> : <span className="text-xs font-semibold text-red-400">Mismatch</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
