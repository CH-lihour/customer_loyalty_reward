import { useState, type FormEvent } from "react";
import { AdminModal } from "../../components/AdminModal";
import { useFeedback } from "../../components/FeedbackProvider";
import { useShop } from "../../data/shop";
import { adminRoleLabels, type AdminRole, type AdminUser } from "../../data/adminAccess";

const fieldClass = "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm";

export function AdminUsersPage({ actorId }: { actorId: string }) {
  const { adminUsers, customers, disabledCustomerIds, saveAdminUser, setAdminUserActive, setCustomerActive } = useShop();
  const { notify } = useFeedback();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const open = (user?: AdminUser) => {
    setEditing(user ?? { id: "", name: "", email: "", role: "marketing_manager", active: true });
    setError("");
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const result = saveAdminUser(actorId, editing);
    if (result) return setError(result);
    setEditing(null);
    notify("Admin user saved.", "success");
  };
  const toggle = (user: AdminUser) => {
    const result = setAdminUserActive(actorId, user.id, !user.active);
    if (result) notify(result, "error");
    else notify(`${user.name} ${user.active ? "disabled" : "enabled"}.`, "success");
  };
  const toggleCustomer = (id: string, name: string) => {
    const active = disabledCustomerIds.includes(id);
    const result = setCustomerActive(actorId, id, active);
    if (result) notify(result, "error");
    else notify(`${name} ${active ? "enabled" : "disabled"}.`, "success");
  };
  const visibleCustomers = customers.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">User Management</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Manage staff roles and account access for staff and customers.</p>
      </div>
      <button onClick={() => open()} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]">Add staff user</button>
    </div>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]"><tr>
          <th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th>
          <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-[var(--border)]">{adminUsers.map((user) => <tr key={user.id}>
          <td className="px-4 py-3"><div className="font-medium">{user.name}</div><div className="text-xs text-[var(--muted-foreground)]">{user.email}</div></td>
          <td className="px-4 py-3">{adminRoleLabels[user.role]}</td>
          <td className="px-4 py-3"><span className={user.active ? "text-green-400" : "text-[var(--muted-foreground)]"}>{user.active ? "Active" : "Disabled"}</span></td>
          <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">
            <button onClick={() => open(user)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs">Edit</button>
            <button onClick={() => toggle(user)} disabled={user.id === "admin-super" || user.id === actorId} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40">{user.active ? "Disable" : "Enable"}</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="text-xs text-[var(--muted-foreground)]">Demo staff accounts use the shared admin password shown on the sign-in page. Data is stored in this browser.</p>
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold">Customer users</h2><p className="text-xs text-[var(--muted-foreground)]">Customer is a storefront role. Silver, Gold, and Platinum are membership tiers.</p></div>
        <input type="search" aria-label="Search customer users" placeholder="Search customers" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
      </div>
      <div className="max-h-96 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[570px] text-left text-sm"><thead className="sticky top-0 bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]"><tr>
          <th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Action</th>
        </tr></thead><tbody className="divide-y divide-[var(--border)]">{visibleCustomers.map((user) => {
          const active = !disabledCustomerIds.includes(user.id);
          return <tr key={user.id}><td className="px-4 py-3"><div className="font-medium">{user.name}</div><div className="text-xs text-[var(--muted-foreground)]">{user.email}</div></td>
            <td className="px-4 py-3">Customer</td><td className="px-4 py-3">{active ? "Active" : "Disabled"}</td>
            <td className="px-4 py-3 text-right"><button onClick={() => toggleCustomer(user.id, user.name)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs">{active ? "Disable" : "Enable"}</button></td></tr>;
        })}</tbody></table>
      </div>
    </section>
    {editing && <AdminModal title={editing.id ? "Edit staff user" : "Add staff user"} onClose={() => setEditing(null)}>
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">Name<input required className={fieldClass} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
        <label className="block text-sm">Email<input required type="email" className={fieldClass} value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></label>
        <label className="block text-sm">Role<select className={fieldClass} value={editing.role} disabled={editing.id === "admin-super"} onChange={(event) => setEditing({ ...editing, role: event.target.value as AdminRole })}>
          {(Object.keys(adminRoleLabels) as AdminRole[]).map((role) => <option key={role} value={role}>{adminRoleLabels[role]}</option>)}
        </select></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2"><button type="submit" className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]">Save user</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-[var(--secondary)] px-4 py-2">Cancel</button></div>
      </form>
    </AdminModal>}
  </div>;
}
