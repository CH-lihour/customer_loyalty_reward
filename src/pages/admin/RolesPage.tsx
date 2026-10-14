import { useState, type FormEvent } from "react";
import { AdminModal } from "../../components/AdminModal";
import { useModalState } from "../../components/useModalState";
import { Icon } from "../../components/Icon";
import { useFeedback } from "../../components/FeedbackProvider";
import { useShop } from "../../data/shop";
import { adminPageLabels, inventoryPages, type AdminPage, type AdminRole } from "../../data/adminAccess";
import { stockAuthorityLabels } from "../../data/stock";

const roleDescriptions: Record<string, string> = {
  super_admin: "Full access to every admin section and setting.",
  marketing_manager: "Manage the storefront, campaigns, and promotions.",
  loyalty_manager: "Manage customers, points, and loyalty benefits.",
  stock_manager: "Run reward inventory: adjustments, write-offs, stocktakes, and reports.",
  stock_clerk: "Receive, transfer, count, and fulfil reward stock.",
};
const permissionGroups: { title: string; description: string; pages: AdminPage[] }[] = [
  { title: "Overview", description: "Monitor the business at a glance.", pages: ["dashboard", "analytics"] },
  { title: "Commerce", description: "Manage customers and store activity.", pages: ["customers", "products", "orders"] },
  { title: "Loyalty programs", description: "Run points, rewards, and promotions.", pages: ["points", "tiers", "campaigns", "rewards", "badges", "referrals"] },
  { title: "Inventory", description: "Reward stock, fulfilment, and counts.", pages: inventoryPages },
  { title: "Operations", description: "Review administrative activity.", pages: ["logs"] },
];
const editablePages = permissionGroups.flatMap((group) => group.pages);
const pageDetails: Partial<Record<AdminPage, { icon: string; description: string }>> = {
  dashboard: { icon: "dashboard", description: "Key metrics and activity" },
  analytics: { icon: "chart", description: "Reports and trends" },
  customers: { icon: "users", description: "Customer accounts" },
  products: { icon: "products", description: "Catalog and stock" },
  orders: { icon: "orders", description: "Purchases and fulfillment" },
  points: { icon: "star", description: "Points balances and adjustments" },
  tiers: { icon: "trophy", description: "Membership tiers" },
  campaigns: { icon: "tag", description: "Bonus point campaigns" },
  rewards: { icon: "gift", description: "Reward catalog" },
  badges: { icon: "medal", description: "Customer achievements" },
  referrals: { icon: "users", description: "Referral activity" },
  logs: { icon: "list", description: "Audit trail" },
  "stock-alerts": { icon: "alert", description: "Reorder and expiry alerts" },
  stock: { icon: "warehouse", description: "Levels and item history" },
  "stock-movements": { icon: "swap", description: "Ledger, receive, transfer" },
  fulfillment: { icon: "truck", description: "Reservations and backorders" },
  stocktake: { icon: "clipboard", description: "Cycle counts and variances" },
  "stock-reports": { icon: "chart", description: "Valuation and reconciliation" },
  suppliers: { icon: "supplier", description: "Suppliers and locations" },
};

export function AdminRolesPage({ actorId }: { actorId: string }) {
  const { roleLabels, rolePermissions, saveRolePermissions, createAdminRole, stockAuthority, saveStockAuthority } = useShop();
  const { notify } = useFeedback();
  const [role, setRole] = useState<AdminRole>("marketing_manager");
  const [draft, setDraft] = useState<Partial<Record<AdminRole, AdminPage[]>>>({});
  const [creating, setCreating, createDialogClosing] = useModalState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [createError, setCreateError] = useState("");
  const roles = Object.keys(roleLabels);
  const readOnly = role === "super_admin";
  const selected = draft[role] ?? rolePermissions[role] ?? [];
  const enabledCount = editablePages.filter((page) => selected.includes(page)).length;
  const hasChanges = !readOnly && editablePages.some(
    (page) => selected.includes(page) !== (rolePermissions[role] ?? []).includes(page),
  );

  const updatePermissions = (pages: AdminPage[]) => {
    if (!readOnly) setDraft((current) => ({ ...current, [role]: pages }));
  };
  const toggle = (page: AdminPage) => updatePermissions(selected.includes(page)
    ? selected.filter((item) => item !== page)
    : [...selected, page]);
  const changeStockAuthority = (level: "clerk" | "manager") => {
    const result = saveStockAuthority(actorId, role, level);
    notify(result ?? `${roleLabels[role]} now has ${stockAuthorityLabels[level].toLowerCase()} authority.`, result ? "error" : "success");
  };
  const save = () => {
    if (readOnly || !hasChanges) return;
    const result = saveRolePermissions(actorId, role, selected);
    if (result) return notify(result, "error");
    setDraft((current) => ({ ...current, [role]: undefined }));
    notify(`${roleLabels[role]} permissions saved.`, "success");
  };
  const openCreate = () => {
    setNewRoleName("");
    setCreateError("");
    setCreating(true);
  };
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createAdminRole(actorId, newRoleName);
    if (result.error) return setCreateError(result.error);
    if (!result.roleId) return;
    setCreating(false);
    setRole(result.roleId);
    notify(`${newRoleName.trim()} role created.`, "success");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-mid)]">Administration / Access control</p>
          <h1 className="font-display text-3xl font-semibold">Role permissions</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">Create staff roles and choose the admin sections they can access. Saved changes apply to active sessions immediately.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]">+ Create role</button>
      </header>

      <section aria-label="Staff roles" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((item) => {
          const permissions = draft[item] ?? rolePermissions[item] ?? [];
          const count = editablePages.filter((page) => permissions.includes(page)).length;
          const active = role === item;
          const modified = item !== "super_admin" && editablePages.some(
            (page) => permissions.includes(page) !== (rolePermissions[item] ?? []).includes(page),
          );
          return (
            <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={active}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-mid)] ${active ? "border-[var(--gold-mid)] bg-[rgba(232,166,52,0.09)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[rgba(232,166,52,0.4)]"}`}>
              <span className="flex items-start justify-between gap-3">
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? "bg-[var(--gold-mid)] text-[var(--background)]" : "bg-[var(--secondary)] text-[var(--gold-mid)]"}`}>
                  <Icon name={item === "super_admin" ? "lock" : item === "marketing_manager" ? "tag" : item === "loyalty_manager" ? "trophy" : item === "stock_manager" ? "warehouse" : item === "stock_clerk" ? "clipboard" : "users"} className="h-5 w-5" />
                </span>
                {modified && <span className="rounded-full bg-[rgba(232,166,52,0.14)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gold-mid)]">Unsaved</span>}
              </span>
              <span className="mt-4 block font-semibold">{roleLabels[item]}</span>
              <span className="mt-1 block min-h-10 text-xs leading-relaxed text-[var(--muted-foreground)]">{roleDescriptions[item] ?? "Custom staff role. Configure its access below."}</span>
              <span className="mt-3 block border-t border-[var(--border)] pt-3 text-xs font-medium text-[var(--gold-mid)]">
                {count} of {editablePages.length} sections · {item === "super_admin" ? "Fixed access" : "Enabled"}
              </span>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{roleLabels[role] ?? role}</h2>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${readOnly ? "bg-[var(--secondary)] text-[var(--muted-foreground)]" : "bg-[rgba(232,166,52,0.14)] text-[var(--gold-mid)]"}`}>
                {readOnly ? "Fixed access" : "Editable"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{readOnly ? "Super Admin permissions are always enabled." : `${enabledCount} of ${editablePages.length} available sections enabled.`}</p>
          </div>
          {!readOnly && <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => updatePermissions([...editablePages, "profile"])} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--secondary)]">Select all</button>
            <button type="button" onClick={() => updatePermissions(["profile"])} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--secondary)]">Clear all</button>
          </div>}
        </div>

        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
          {permissionGroups.map((group) => (
            <div key={group.title} className="rounded-xl border border-[var(--border)] bg-[var(--background)]/45 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div><h3 className="text-base font-semibold">{group.title}</h3><p className="text-xs text-[var(--muted-foreground)]">{group.description}</p></div>
                <span className="shrink-0 rounded-full bg-[var(--secondary)] px-2 py-1 text-xs text-[var(--muted-foreground)]">{group.pages.filter((page) => selected.includes(page)).length}/{group.pages.length}</span>
              </div>
              {group.title === "Inventory" && (
                <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                  <div className="text-sm font-medium">Stock authority</div>
                  <p className="mb-2 text-xs text-[var(--muted-foreground)]">Clerks receive, transfer, return, count, and fulfil. Managers also adjust, write off, post counts, cancel redemptions, and edit stock rules. Saved immediately.</p>
                  {readOnly ? (
                    <span className="text-xs font-semibold text-[var(--gold-mid)]">{stockAuthorityLabels.admin}: every stock action and setting</span>
                  ) : (
                    <div className="flex gap-2" role="radiogroup" aria-label="Stock authority">
                      {(["clerk", "manager"] as const).map((level) => {
                        const current = (stockAuthority[role] ?? "clerk") === level;
                        return (
                          <button key={level} type="button" role="radio" aria-checked={current} onClick={() => !current && changeStockAuthority(level)}
                            className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${current ? "border-[var(--gold-mid)] bg-[rgba(232,166,52,0.09)] text-[var(--gold-mid)]" : "border-[var(--border)] hover:bg-[var(--secondary)]"}`}>
                            {stockAuthorityLabels[level]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {group.pages.map((page) => {
                  const enabled = selected.includes(page);
                  const details = pageDetails[page];
                  return (
                    <label key={page} className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${readOnly ? "cursor-default" : "cursor-pointer"} ${enabled ? "border-[rgba(232,166,52,0.27)] bg-[rgba(232,166,52,0.06)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
                      <input type="checkbox" checked={enabled} disabled={readOnly} onChange={() => toggle(page)} className="peer sr-only" />
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${enabled ? "bg-[rgba(232,166,52,0.13)] text-[var(--gold-mid)]" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}><Icon name={details?.icon ?? "lock"} className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{adminPageLabels[page]}</span><span className="block text-xs text-[var(--muted-foreground)]">{details?.description}</span></span>
                      <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--gold-mid)] ${enabled ? "bg-[var(--gold-mid)]" : "bg-[var(--secondary)]"}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--secondary)]/35 px-5 py-4 sm:px-6">
          <p className="text-xs text-[var(--muted-foreground)]">{readOnly ? "Super Admin access cannot be changed." : hasChanges ? enabledCount === 0 ? "Select at least one section before saving." : "You have unsaved permission changes." : "All permission changes are saved."}</p>
          {!readOnly && <div className="flex gap-2">
            <button type="button" onClick={() => setDraft((current) => ({ ...current, [role]: undefined }))} disabled={!hasChanges} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40">Discard</button>
            <button type="button" onClick={save} disabled={!hasChanges || enabledCount === 0} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-40">Save permissions</button>
          </div>}
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold-mid)]" />
        My Profile is available to every staff role. Exchange Rate, User Management, and Role Permissions are reserved for Super Admin.
      </p>
      {creating && <AdminModal title="Create staff role" onClose={() => setCreating(false)} closing={createDialogClosing}>
        <form onSubmit={create} className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">Give the role a name. It starts with Dashboard access; you can edit its permissions after creation.</p>
          <label className="block text-sm font-medium">Role name
            <input autoFocus required minLength={2} maxLength={50} value={newRoleName} onChange={(event) => { setNewRoleName(event.target.value); setCreateError(""); }} placeholder="e.g. Store Supervisor" className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 outline-none focus:border-[var(--gold-mid)]" />
          </label>
          {createError && <p role="alert" className="text-sm text-red-400">{createError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]">Create role</button>
          </div>
        </form>
      </AdminModal>}
    </div>
  );
}
