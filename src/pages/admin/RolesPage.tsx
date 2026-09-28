import { useState } from "react";
import { useFeedback } from "../../components/FeedbackProvider";
import { useShop } from "../../data/shop";
import { adminPageLabels, adminPages, adminRoleLabels, type AdminPage, type AdminRole } from "../../data/adminAccess";

const editableRoles: AdminRole[] = ["marketing_manager", "loyalty_manager"];

export function AdminRolesPage({ actorId }: { actorId: string }) {
  const { rolePermissions, saveRolePermissions } = useShop();
  const { notify } = useFeedback();
  const [role, setRole] = useState<AdminRole>("marketing_manager");
  const [draft, setDraft] = useState<Partial<Record<AdminRole, AdminPage[]>>>({});
  const selected = draft[role] ?? rolePermissions[role];
  const sections = adminPages.filter((page) => page !== "users" && page !== "roles" && page !== "profile");
  const toggle = (page: AdminPage) => setDraft((current) => ({
    ...current,
    [role]: selected.includes(page) ? selected.filter((item) => item !== page) : [...selected, page],
  }));
  const save = () => {
    const result = saveRolePermissions(actorId, role, selected);
    if (result) return notify(result, "error");
    setDraft((current) => ({ ...current, [role]: undefined }));
    notify(`${adminRoleLabels[role]} permissions saved.`, "success");
  };

  return <div className="max-w-4xl space-y-5">
    <div><h1 className="font-display text-2xl font-semibold">Role Permissions</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose which admin sections each staff role can access. Changes apply to active sessions immediately.</p>
    </div>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <label className="block text-sm font-medium">Staff role<select value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 sm:w-72">
        {editableRoles.map((item) => <option value={item} key={item}>{adminRoleLabels[item]}</option>)}
      </select></label>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {sections.map((page) => <label key={page} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-sm">
          <input type="checkbox" checked={selected.includes(page)} onChange={() => toggle(page)} className="accent-[var(--gold-mid)]" />{adminPageLabels[page]}
        </label>)}
      </div>
      <button onClick={save} className="mt-5 rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]">Save permissions</button>
    </div>
    <p className="text-xs text-[var(--muted-foreground)]">Every staff role can access My Profile. Super Admin always has access to every section, including User Management and Role Permissions.</p>
  </div>;
}
