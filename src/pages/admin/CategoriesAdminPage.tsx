import { useState, type FormEvent } from "react";
import { useShop } from "../../data/shop";
import type { ProductCategory } from "../../data/mockData";
import { useFeedback } from "../../components/FeedbackProvider";
import { AdminModal } from "../../components/AdminModal";
import { ActionIconButton } from "../../components/ActionIconButton";
import { useModalState } from "../../components/useModalState";
import { EmptyRow, PageHeader, Panel, field, filterControl, primaryButton, rowClass, secondaryButton, tableClass, theadClass } from "../../components/StockUi";

const blankCategory = (): ProductCategory => ({ id: "", name: "", nameKh: "", description: "", active: true });

export function AdminCategoriesPage({ actorId }: { actorId: string }) {
  const shop = useShop();
  const { notify, confirm } = useFeedback();
  const [editing, setEditing, closing] = useModalState<ProductCategory | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const productCount = (name: string) => shop.products.filter((p) => p.category === name).length;
  const term = search.trim().toLowerCase();
  const rows = shop.categories.filter((c) => !term || c.name.toLowerCase().includes(term) || c.nameKh.includes(term));
  const original = editing && shop.categories.find((c) => c.id === editing.id);
  const renameCount = original && original.name !== editing.name.trim() ? productCount(original.name) : 0;

  const open = (category: ProductCategory) => {
    setError("");
    setEditing(category);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const result = shop.saveCategory(actorId, editing);
    if (result) return setError(result);
    setEditing(null);
    notify("Category saved.", "success");
  };
  const toggle = (category: ProductCategory) => {
    const result = shop.saveCategory(actorId, { ...category, active: !category.active });
    notify(result ?? `${category.name} ${category.active ? "deactivated" : "activated"}.`, result ? "error" : "success");
  };
  const remove = (category: ProductCategory) => {
    void confirm(`Delete the ${category.name} category?`).then((ok) => {
      if (!ok) return;
      const result = shop.deleteCategory(actorId, category.id);
      notify(result ?? `${category.name} deleted.`, result ? "error" : "success");
    });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-8">
      <PageHeader eyebrow="E-Commerce" title="Categories"
        description="Group products for the storefront filter. Inactive categories are hidden from customers and cannot be assigned to products." />

      <Panel title="Product categories" description={`${shop.categories.length} categories · ${shop.categories.filter((c) => c.active).length} active`} flush
        actions={
          <div className="flex flex-wrap gap-2">
            <input type="search" aria-label="Search categories" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className={filterControl} />
            <button type="button" onClick={() => open(blankCategory())} className={primaryButton}>+ Add category</button>
          </div>
        }>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}><tr><th className="p-3">Category</th><th className="p-3">Description</th><th className="p-3 text-right">Products</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={rowClass}>
                  <td className="p-3 font-medium">{c.name}<div className="text-xs font-normal text-[var(--muted-foreground)]">{c.nameKh}</div></td>
                  <td className="p-3 text-xs text-[var(--muted-foreground)]">{c.description || "—"}</td>
                  <td className="p-3 text-right font-mono-data">{productCount(c.name)}</td>
                  <td className="p-3 text-xs">{c.active ? <span className="text-green-400">Active</span> : <span className="text-[var(--muted-foreground)]">Inactive</span>}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <ActionIconButton action="edit" label={`Edit ${c.name}`} onClick={() => open(c)} />
                      <ActionIconButton action={c.active ? "deactivate" : "activate"} label={`${c.active ? "Deactivate" : "Activate"} ${c.name}`} onClick={() => toggle(c)} />
                      <ActionIconButton action="delete" label={`Delete ${c.name}`} onClick={() => remove(c)} />
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <EmptyRow colSpan={5}>{term ? "No categories match your search." : "No categories yet."}</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <AdminModal title={editing.id ? "Edit category" : "Add category"} onClose={() => setEditing(null)} closing={closing}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">Name<input required maxLength={40} className={field} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label className="text-xs">Khmer name<input className={field} value={editing.nameKh} onChange={(e) => setEditing({ ...editing, nameKh: e.target.value })} /></label>
              <label className="text-xs sm:col-span-2">Description<textarea className={field} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active on the storefront
              </label>
            </div>
            {renameCount > 0 && <p className="text-xs text-amber-400">Renaming also updates {renameCount} product{renameCount === 1 ? "" : "s"} in this category.</p>}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={primaryButton}>Save category</button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
