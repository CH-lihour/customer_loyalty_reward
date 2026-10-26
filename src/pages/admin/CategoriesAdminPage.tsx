import { useEffect, useState, type FormEvent } from "react";
import { useShop } from "../../data/shop";
import {
  apiCategoryPage,
  apiDeleteCategory,
  apiSaveCategory,
} from "../../data/api";
import { useApiCatalog } from "../../data/catalog";
import { useApiTable } from "../../data/apiTable";
import { TablePagination } from "../../components/TablePagination";
import type { ProductCategory } from "../../data/mockData";
import { useFeedback } from "../../components/FeedbackProvider";
import { AdminModal } from "../../components/AdminModal";
import { ActionIconButton } from "../../components/ActionIconButton";
import { useModalState } from "../../components/useModalState";
import {
  EmptyRow,
  PageHeader,
  Panel,
  field,
  filterControl,
  primaryButton,
  rowClass,
  secondaryButton,
  tableClass,
  theadClass,
} from "../../components/StockUi";

const blankCategory = (): ProductCategory => ({
  id: "",
  name: "",
  nameKh: "",
  description: "",
  active: true,
  parentId: "",
});

export function AdminCategoriesPage({
  actorId,
  token,
}: {
  actorId: string;
  token: string;
}) {
  const shop = useShop();
  const { notify, confirm } = useFeedback();
  const { loadError, reload: reloadCatalog } = useApiCatalog(token);
  const [editing, setEditing, closing] = useModalState<ProductCategory | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const table = useApiTable(
    (page, perPage) => apiCategoryPage(token, { page, perPage, search: term }),
    term,
  );
  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  /** Refreshes the store's full catalog (storefront, form choices) and the visible page. */
  const reload = async () => {
    await reloadCatalog();
    table.reload();
  };

  const productCount = (name: string) =>
    shop.products.filter((p) => p.category === name).length;
  const original = editing && shop.categories.find((c) => c.id === editing.id);
  const renameCount =
    original && original.name !== editing.name.trim()
      ? productCount(original.name)
      : 0;

  /** "Drinks › Coffee": the category's name after its ancestors' names. */
  const categoryPath = (id: string) => {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = shop.categories.find((c) => c.id === id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = shop.categories.find((c) => c.id === current?.parentId);
    }
    return names.join(" › ");
  };
  /** The category and everything beneath it, none of which can become its parent. */
  const withDescendants = (id: string) => {
    const ids = new Set([id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const c of shop.categories) {
        if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    return ids;
  };
  const blockedParents = editing?.id ? withDescendants(editing.id) : new Set<string>();
  const parentChoices = shop.categories
    .filter((c) => !blockedParents.has(c.id))
    .map((c) => ({ id: c.id, label: categoryPath(c.id), active: c.active }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const open = (category: ProductCategory) => {
    setError("");
    setEditing(category);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving) return;
    const name = editing.name.trim();
    const change = !original
      ? `Created category ${name}`
      : original.name !== name
        ? `Renamed category ${original.name} to ${name}`
        : (original.parentId ?? "") !== (editing.parentId ?? "")
          ? editing.parentId
            ? `Moved category ${name} under ${categoryPath(editing.parentId)}`
            : `Moved category ${name} to the top level`
        : original.active !== editing.active
          ? `${editing.active ? "Activated" : "Deactivated"} category ${name}`
          : `Updated category ${name}`;
    setSaving(true);
    setError("");
    try {
      await apiSaveCategory(token, {
        ...editing,
        name,
        nameKh: editing.nameKh.trim(),
        description: editing.description.trim(),
      });
      await reload();
      shop.logStaffAction(
        actorId,
        original ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
        change,
      );
      setEditing(null);
      notify("Category saved.", "success");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (category: ProductCategory) => {
    const change = `${category.active ? "Deactivated" : "Activated"} category ${category.name}`;
    try {
      await apiSaveCategory(token, {
        id: category.id,
        active: !category.active,
      });
      await reload();
      shop.logStaffAction(actorId, "CATEGORY_UPDATED", change);
      notify(
        `${category.name} ${category.active ? "deactivated" : "activated"}.`,
        "success",
      );
    } catch (failure) {
      notify((failure as Error).message, "error");
    }
  };
  const remove = async (category: ProductCategory) => {
    if (!(await confirm(`Delete the ${category.name} category?`))) return;
    try {
      await apiDeleteCategory(token, category.id);
      await reload();
      shop.logStaffAction(
        actorId,
        "CATEGORY_DELETED",
        `Deleted category ${category.name}`,
      );
      notify(`${category.name} deleted.`, "success");
    } catch (failure) {
      notify((failure as Error).message, "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        eyebrow="E-Commerce"
        title="Categories"
        description="Group products for the storefront filter. Inactive categories are hidden from customers and cannot be assigned to products."
      />
      {(table.error || loadError) && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400"
        >
          Couldn't load categories: {table.error || loadError}
        </p>
      )}

      <Panel
        title="Product categories"
        description={`${shop.categories.length} categories · ${shop.categories.filter((c) => c.active).length} active`}
        flush
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              aria-label="Search categories"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControl}
            />
            <button
              type="button"
              onClick={() => open(blankCategory())}
              className={primaryButton}
            >
              + Add category
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Parent</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Products</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {table.rows.map((c) => (
                <tr key={c.id} className={rowClass}>
                  <td className="p-3 font-medium">
                    {c.name}
                    <div className="text-xs font-normal text-[var(--muted-foreground)]">
                      {c.nameKh}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-[var(--muted-foreground)]">
                    {c.parentId ? categoryPath(c.parentId) || "—" : "—"}
                  </td>
                  <td className="p-3 text-xs text-[var(--muted-foreground)]">
                    {c.description || "—"}
                  </td>
                  <td className="p-3 text-right font-mono-data">
                    {c.productCount}
                  </td>
                  <td className="p-3 text-xs">
                    {c.active ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <ActionIconButton
                        action="edit"
                        label={`Edit ${c.name}`}
                        onClick={() => open(c)}
                      />
                      <ActionIconButton
                        action={c.active ? "deactivate" : "activate"}
                        label={`${c.active ? "Deactivate" : "Activate"} ${c.name}`}
                        onClick={() => toggle(c)}
                      />
                      <ActionIconButton
                        action="delete"
                        label={`Delete ${c.name}`}
                        onClick={() => remove(c)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!table.rows.length && (
                <EmptyRow colSpan={6}>
                  {table.loading
                    ? "Loading categories…"
                    : term
                      ? "No categories match your search."
                      : "No categories yet."}
                </EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...table.pagination} />
      </Panel>

      {editing && (
        <AdminModal
          title={editing.id ? "Edit category" : "Add category"}
          onClose={() => setEditing(null)}
          closing={closing}
        >
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                Name
                <input
                  required
                  maxLength={40}
                  className={field}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Khmer name
                <input
                  className={field}
                  value={editing.nameKh}
                  onChange={(e) =>
                    setEditing({ ...editing, nameKh: e.target.value })
                  }
                />
              </label>
              <label className="text-xs sm:col-span-2">
                Parent category
                <select
                  className={field}
                  value={editing.parentId ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, parentId: e.target.value })
                  }
                >
                  <option value="">None (top-level category)</option>
                  {parentChoices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label}
                      {choice.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs sm:col-span-2">
                Description
                <textarea
                  className={field}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />{" "}
                Active on the storefront
              </label>
            </div>
            {renameCount > 0 && (
              <p className="text-xs text-amber-400">
                Renaming also updates {renameCount} product
                {renameCount === 1 ? "" : "s"} in this category.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`${primaryButton} disabled:opacity-60`}
              >
                {saving ? "Saving…" : "Save category"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
