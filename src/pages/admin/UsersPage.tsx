import { useState, type FormEvent } from "react";
import { AdminModal } from "../../components/AdminModal";
import { useModalState } from "../../components/useModalState";
import { ActionIconButton } from "../../components/ActionIconButton";
import { useFeedback } from "../../components/FeedbackProvider";
import { toAdminUser, useShop } from "../../data/shop";
import { apiSaveStaffUser, apiStaffUserPage } from "../../data/api";
import { useApiStaff } from "../../data/staff";
import { useApiTable } from "../../data/apiTable";
import { TablePagination, usePagedRows } from "../../components/TablePagination";
import { type AdminRole, type AdminUser } from "../../data/adminAccess";

const fieldClass = "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm";

/** The API id behind a staff user's store id (`api-admin-<id>`). */
const apiUserId = (id: string) => Number(id.replace("api-admin-", "")) || null;

export function AdminUsersPage({ actorId, token }: { actorId: string; token: string }) {
  const { roleLabels, customers, disabledCustomerIds, setCustomerActive, logStaffAction } = useShop();
  const { notify } = useFeedback();
  const { roleId, loadError, reload: reloadStaff } = useApiStaff(token);
  const [editing, setEditing, modalClosing] = useModalState<(AdminUser & { password: string }) | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const staffTable = useApiTable((page, perPage) => apiStaffUserPage(token, { page, perPage }));
  const staffRows = staffTable.rows.map(toAdminUser);
  /** Refreshes every staff user and role in the store (menu access) and the visible page. */
  const reload = async () => {
    await reloadStaff();
    staffTable.reload();
  };

  const open = (user?: AdminUser) => {
    const defaultRole = Object.keys(roleLabels).find((role) => role !== "super_admin") ?? "super_admin";
    setEditing({ ...(user ?? { id: "", name: "", email: "", role: defaultRole, active: true }), password: "" });
    setError("");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving) return;
    const role = roleId(editing.role);
    if (!role) return setError("Choose a valid staff role.");
    setSaving(true);
    setError("");
    try {
      await apiSaveStaffUser(token, editing.id ? apiUserId(editing.id) : null, {
        name: editing.name,
        email: editing.email,
        role_id: role,
        ...(editing.password && { password: editing.password }),
      });
      await reload();
      logStaffAction(actorId, editing.id ? "ADMIN_USER_UPDATED" : "ADMIN_USER_CREATED",
        `${editing.id ? "Updated" : "Created"} staff user ${editing.email.trim().toLowerCase()} (${roleLabels[editing.role] ?? editing.role})`);
      setEditing(null);
      notify("Staff user saved.", "success");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (user: AdminUser) => {
    try {
      await apiSaveStaffUser(token, apiUserId(user.id), { is_active: !user.active });
      await reload();
      logStaffAction(actorId, "ADMIN_USER_STATUS", `${user.active ? "Disabled" : "Enabled"} staff user ${user.email}`);
      notify(`${user.name} ${user.active ? "disabled" : "enabled"}.`, "success");
    } catch (failure) {
      notify((failure as Error).message, "error");
    }
  };
  const toggleCustomer = (id: string, name: string) => {
    const active = disabledCustomerIds.includes(id);
    const result = setCustomerActive(actorId, id, active);
    if (result) notify(result, "error");
    else notify(`${name} ${active ? "enabled" : "disabled"}.`, "success");
  };
  const customerTable = usePagedRows(customers.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(customerSearch.toLowerCase()),
  ));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">User Management</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Manage staff roles and account access for staff and customers.</p>
      </div>
      <button onClick={() => open()} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]">Add staff user</button>
    </div>
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]"><tr>
          <th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th>
          <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-[var(--border)]">{staffRows.map((user) => <tr key={user.id}>
          <td className="px-4 py-3"><div className="font-medium">{user.name}</div><div className="text-xs text-[var(--muted-foreground)]">{user.email}</div></td>
          <td className="px-4 py-3">{roleLabels[user.role] ?? user.role}</td>
          <td className="px-4 py-3"><span className={user.active ? "text-green-400" : "text-[var(--muted-foreground)]"}>{user.active ? "Active" : "Disabled"}</span></td>
          <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">
            <ActionIconButton action="edit" label={`Edit ${user.name}`} onClick={() => open(user)} />
            <button onClick={() => void toggle(user)} disabled={user.id === actorId} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40">{user.active ? "Disable" : "Enable"}</button>
          </div></td>
        </tr>)}
        {!staffRows.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">{staffTable.loading ? "Loading staff users…" : "No staff users yet."}</td></tr>}</tbody>
      </table>
      </div>
      <TablePagination {...staffTable.pagination} />
    </div>
    {(staffTable.error || loadError) && <p role="alert" className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400">Couldn't load staff users: {staffTable.error || loadError}</p>}
    <p className="text-xs text-[var(--muted-foreground)]">Staff sign in with the email and password set here. Disabling an account signs it out everywhere.</p>
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold">Customer users</h2><p className="text-xs text-[var(--muted-foreground)]">Customer is a storefront role. Silver, Gold, and Platinum are membership tiers.</p></div>
        <input type="search" aria-label="Search customer users" placeholder="Search customers" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[570px] text-left text-sm"><thead className="bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]"><tr>
          <th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Action</th>
        </tr></thead><tbody className="divide-y divide-[var(--border)]">{customerTable.rows.map((user) => {
          const active = !disabledCustomerIds.includes(user.id);
          return <tr key={user.id}><td className="px-4 py-3"><div className="font-medium">{user.name}</div><div className="text-xs text-[var(--muted-foreground)]">{user.email}</div></td>
            <td className="px-4 py-3">Customer</td><td className="px-4 py-3">{active ? "Active" : "Disabled"}</td>
            <td className="px-4 py-3 text-right"><button onClick={() => toggleCustomer(user.id, user.name)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs">{active ? "Disable" : "Enable"}</button></td></tr>;
        })}</tbody></table>
        </div>
        <TablePagination {...customerTable.pagination} />
      </div>
    </section>
    {editing && <AdminModal title={editing.id ? "Edit staff user" : "Add staff user"} closing={modalClosing} onClose={() => setEditing(null)}>
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">Name<input required className={fieldClass} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
        <label className="block text-sm">Email<input required type="email" className={fieldClass} value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></label>
        <label className="block text-sm">{editing.id ? "New password" : "Password"}<input type="password" autoComplete="new-password" required={!editing.id} minLength={8} placeholder={editing.id ? "Leave blank to keep the current password" : "At least 8 characters"} className={fieldClass} value={editing.password} onChange={(event) => setEditing({ ...editing, password: event.target.value })} /></label>
        <label className="block text-sm">Role<select className={fieldClass} value={editing.role} disabled={editing.id === actorId} onChange={(event) => setEditing({ ...editing, role: event.target.value as AdminRole })}>
          {!roleLabels[editing.role] && <option value={editing.role} disabled>Choose a role</option>}
          {(Object.keys(roleLabels) as AdminRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2"><button type="submit" disabled={saving} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)] disabled:opacity-60">{saving ? "Saving…" : "Save user"}</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-[var(--secondary)] px-4 py-2">Cancel</button></div>
      </form>
    </AdminModal>}
  </div>;
}
