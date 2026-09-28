import { useState, type FormEvent } from "react";
import { Icon } from "../../components/Icon";
import { useFeedback } from "../../components/FeedbackProvider";
import { adminPageLabels, adminRoleLabels } from "../../data/adminAccess";
import { useShop } from "../../data/shop";

const fieldClass = "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-mid)]";

export function AdminProfilePage({ userId }: { userId: string }) {
  const { adminUsers, rolePermissions, updateAdminProfile } = useShop();
  const { notify } = useFeedback();
  const user = adminUsers.find((item) => item.id === userId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [error, setError] = useState("");

  if (!user) return null;
  const startEditing = () => {
    setName(user.name);
    setEmail(user.email);
    setError("");
    setEditing(true);
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = updateAdminProfile(userId, { name, email });
    if (result) return setError(result);
    setEditing(false);
    setError("");
    notify("Profile updated.", "success");
  };
  const permissions = rolePermissions[user.role].filter((page) => page !== "profile");

  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="font-display text-2xl font-semibold">My Profile</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Your admin account and current access.</p></div>
      <button onClick={editing ? () => setEditing(false) : startEditing} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]">{editing ? "Cancel" : "Edit profile"}</button>
    </div>
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--secondary)] text-[var(--gold-mid)]"><Icon name="user" className="h-7 w-7" /></div>
        <div><div className="font-display text-lg font-semibold">{user.name}</div><div className="text-sm text-[var(--muted-foreground)]">{adminRoleLabels[user.role]}</div></div>
      </div>
      {editing ? <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">Name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} /></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]">Save changes</button>
      </form> : <div className="grid gap-3 sm:grid-cols-2">
        {[["Email", user.email], ["Role", adminRoleLabels[user.role]], ["Status", user.active ? "Active" : "Disabled"]].map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--secondary)] p-3 text-sm"><div className="mb-1 text-xs text-[var(--muted-foreground)]">{label}</div>{value}</div>)}
      </div>}
    </section>
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-3 font-semibold">Your admin access</h2>
      <div className="flex flex-wrap gap-2">{permissions.map((page) => <span key={page} className="rounded-lg bg-[var(--secondary)] px-3 py-1.5 text-xs">{adminPageLabels[page]}</span>)}</div>
    </section>
  </div>;
}
