import { useState, type FormEvent } from "react"
import type { Product } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { apiDeleteProduct, apiProductPage, apiSaveProduct } from "../../data/api"
import { useApiCatalog } from "../../data/catalog"
import { useApiTable } from "../../data/apiTable"
import { TablePagination } from "../../components/TablePagination"
import { useFeedback } from "../../components/FeedbackProvider"
import { AdminModal } from "../../components/AdminModal"
import { useModalState } from "../../components/useModalState"
import { ActionIconButton } from "../../components/ActionIconButton"
import { ImagePreviewDialog } from "../../components/ImagePreviewDialog"
import { ProductCover } from "../../components/ProductImage"
import { ProductImagePicker } from "../../components/ProductImagePicker"

const blank = (category: string): Product => ({
  id: "",
  name: "",
  nameKh: "",
  category,
  price: 0,
  stock: 0,
  images: [],
  description: "",
  normalPoints: 0,
  bonusMultiplier: 1,
  featured: false,
})
const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm"

export function AdminProductsPage({ actorId, token }: { actorId: string; token: string }) {
  const { products, categories: categoryList, logStaffAction } = useShop()
  const { notify, confirm } = useFeedback()
  const { loadError, reload: reloadCatalog } = useApiCatalog(token)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing, modalClosing] = useModalState<Product | null>(null)
  const [previewId, setPreviewId, previewClosing] = useModalState<string | null>(null)
  const [filter, setFilter] = useState("All")
  const [error, setError] = useState("")
  const [imageChanges, setImageChanges] = useState<{ removedIds: number[]; files: File[] }>({ removedIds: [], files: [] })
  /** Opens the product form, starting with no pending image changes. */
  const openEditor = (product: Product) => {
    setImageChanges({ removedIds: [], files: [] })
    setError("")
    setEditing(product)
  }
  const filterCategoryId = categoryList.find((c) => c.name === filter)?.id
  const table = useApiTable(
    (page, perPage) => apiProductPage(token, { page, perPage, category_id: filterCategoryId }),
    filterCategoryId ?? "",
  )
  // Stock is kept by the store, not the API.
  const pageRows = table.rows.map((p) => ({ ...p, stock: products.find((item) => item.id === p.id)?.stock ?? 0 }))
  /** Refreshes the store's full catalog and the visible page; `stock` sets counts by product id. */
  const reload = async (stock?: Record<string, number>) => {
    await reloadCatalog(stock)
    table.reload()
  }
  const previewProduct = pageRows.find((product) => product.id === previewId)
  const categories = ["All", ...categoryList.map((c) => c.name)]
  const inactive = new Set(categoryList.filter((c) => !c.active).map((c) => c.name))
  // An inactive category stays selectable only for products already in it.
  const assignable = categoryList
    .filter((c) => c.active || c.name === editing?.category)
    .map((c) => c.name)
  const addProduct = () => {
    const first = categoryList.find((c) => c.active)
    if (!first) {
      notify("Create or activate a category before adding products.", "error")
      return
    }
    openEditor(blank(first.name))
  }
  const change = <K extends keyof Product>(key: K, value: Product[K]) =>
    setEditing((p) => (p ? { ...p, [key]: value } : p))
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing || saving) return
    if (
      !editing.name.trim() ||
      !assignable.includes(editing.category) ||
      editing.price <= 0 ||
      editing.stock < 0 ||
      editing.normalPoints < 0 ||
      editing.bonusMultiplier < 1
    ) {
      setError("Enter a name, category, positive price, valid stock, and point values.")
      return
    }
    const category = categoryList.find((c) => c.name === editing.category)
    if (!category) {
      setError("Choose a category.")
      return
    }
    const product = {
      ...editing,
      name: editing.name.trim(),
      nameKh: editing.nameKh.trim(),
      description: editing.description.trim(),
    }
    setSaving(true)
    setError("")
    try {
      const id = await apiSaveProduct(token, product, category.id, {
        newImages: imageChanges.files,
        removeImageIds: imageChanges.removedIds,
      })
      // Stock is kept by the store, not the API.
      await reload({ [id]: product.stock })
      logStaffAction(
        actorId,
        editing.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
        `${editing.id ? "Updated" : "Created"} product ${product.name}`,
      )
      setEditing(null)
      notify("Product saved.", "success")
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const remove = async (product: Product) => {
    if (!(await confirm(`Delete ${product.name}?`))) return
    try {
      await apiDeleteProduct(token, product.id)
      await reload()
      logStaffAction(actorId, "PRODUCT_DELETED", `Deleted product ${product.name}`)
      notify(`${product.name} deleted.`, "success")
    } catch (failure) {
      notify((failure as Error).message, "error")
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <button
          onClick={addProduct}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Product
        </button>
      </div>
      {(table.error || loadError) && (
        <p role="alert" className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
          Couldn't load products: {table.error || loadError}
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              filter === c
                ? "bg-[var(--gold-mid)] text-[var(--background)]"
                : "border border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {editing && (
        <AdminModal
          closing={modalClosing}
          title={editing.id ? "Edit Product" : "New Product"}
          onClose={() => {
            setEditing(null)
            setError("")
          }}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs">
                Name
                <input
                  className={input}
                  value={editing.name}
                  onChange={(e) => change("name", e.target.value)}
                  required
                />
              </label>
              <label className="text-xs">
                Khmer name
                <input
                  className={input}
                  value={editing.nameKh}
                  onChange={(e) => change("nameKh", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Category
                <select
                  className={input}
                  value={editing.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {!assignable.includes(editing.category) && (
                    <option value={editing.category} disabled>
                      {editing.category || "Choose a category"}
                    </option>
                  )}
                  {assignable.map((c) => (
                    <option key={c} value={c}>
                      {c}
                      {inactive.has(c) ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Price (USD)
                <input
                  className={input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editing.price}
                  onChange={(e) => change("price", Number(e.target.value))}
                  required
                />
              </label>
              <label className="text-xs">
                Stock
                <input
                  className={input}
                  type="number"
                  min="0"
                  value={editing.stock}
                  onChange={(e) => change("stock", Number(e.target.value))}
                  required
                />
              </label>
              <label className="text-xs">
                Base points
                <input
                  className={input}
                  type="number"
                  min="0"
                  value={editing.normalPoints}
                  onChange={(e) =>
                    change("normalPoints", Number(e.target.value))
                  }
                  required
                />
              </label>
              <label className="text-xs">
                Bonus multiplier
                <input
                  className={input}
                  type="number"
                  min="1"
                  step="0.1"
                  value={editing.bonusMultiplier}
                  onChange={(e) =>
                    change("bonusMultiplier", Number(e.target.value))
                  }
                  required
                />
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <ProductImagePicker
                  existing={editing.images}
                  removedIds={imageChanges.removedIds}
                  files={imageChanges.files}
                  onChange={setImageChanges}
                />
              </div>
              <label className="text-xs sm:col-span-2 lg:col-span-3">
                Description
                <textarea
                  className={input}
                  value={editing.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.featured}
                  onChange={(e) => change("featured", e.target.checked)}
                />{" "}
                Featured product
              </label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={saving}
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-[var(--background)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Product"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setError("")
                }}
                className="rounded-lg bg-[var(--secondary)] px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      )}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3 text-right">Points</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPreviewId(p.id)} disabled={!p.images.length} aria-label={`Inspect images of ${p.name}`} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-mid)] enabled:cursor-zoom-in">
                        <ProductCover images={p.images} alt="" showCount className="h-12 w-12 rounded-lg" />
                      </button>
                      <div className="min-w-0">
                        <div className="font-medium">{p.name}</div>
                        {p.nameKh && <div className="text-xs text-[var(--muted-foreground)]">{p.nameKh}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {p.category}
                    {inactive.has(p.category) && (
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                        (hidden)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">${p.price.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.stock}</td>
                  <td className="p-3 text-right">
                    {p.normalPoints} × {p.bonusMultiplier}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                    <ActionIconButton action="edit" label={`Edit ${p.name}`} onClick={() => openEditor(p)} />
                    <ActionIconButton
                      action="delete"
                      label={`Delete ${p.name}`}
                      onClick={() => void remove(p)}
                    />
                    </div>
                  </td>
                </tr>
              ))}
            {!pageRows.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                  {table.loading ? "Loading products…" : "No products yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <TablePagination {...table.pagination} />
      </div>
      {previewProduct && <ImagePreviewDialog images={previewProduct.images.map((image) => image.url)} name={previewProduct.name} onClose={() => setPreviewId(null)} closing={previewClosing} />}
    </div>
  )
}
