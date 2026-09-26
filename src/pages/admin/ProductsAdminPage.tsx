import { useState, type FormEvent } from "react"
import { categories, type Product } from "../../data/mockData"
import { useShop } from "../../data/shop"
import { useFeedback } from "../../components/FeedbackProvider"
import { AdminModal } from "../../components/AdminModal"

const blank = (): Product => ({
  id: "",
  name: "",
  nameKh: "",
  category: "Coffee & Tea",
  price: 0,
  stock: 0,
  image: "",
  description: "",
  normalPoints: 0,
  bonusMultiplier: 1,
  featured: false,
})
const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm"

export function AdminProductsPage() {
  const { products, saveProduct, deleteProduct } = useShop()
  const { notify, confirm } = useFeedback()
  const [editing, setEditing] = useState<Product | null>(null)
  const [filter, setFilter] = useState("All")
  const [error, setError] = useState("")
  const change = <K extends keyof Product>(key: K, value: Product[K]) =>
    setEditing((p) => (p ? { ...p, [key]: value } : p))
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (
      !editing ||
      !editing.name.trim() ||
      !editing.category ||
      editing.price <= 0 ||
      editing.stock < 0 ||
      editing.normalPoints < 0 ||
      editing.bonusMultiplier < 1
    ) {
      setError("Enter a name, positive price, valid stock, and point values.")
      return
    }
    saveProduct({
      ...editing,
      id: editing.id || `p-${Date.now()}`,
      image:
        editing.image.trim() ||
        "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop&auto=format",
    })
    setEditing(null)
    setError("")
    notify("Product saved.", "success")
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <button
          onClick={() => setEditing(blank())}
          className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          + Add Product
        </button>
      </div>
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
          title={editing.id ? "Edit Product" : "New Product"}
          onClose={() => {
            setEditing(null)
            setError("")
          }}
          wide
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  {categories
                    .filter((c) => c !== "All")
                    .map((c) => (
                      <option key={c}>{c}</option>
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
              <label className="text-xs sm:col-span-2">
                Image URL
                <input
                  className={input}
                  type="url"
                  value={editing.image}
                  onChange={(e) => change("image", e.target.value)}
                  placeholder="Optional"
                />
              </label>
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
              <button className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-[var(--background)]">
                Save Product
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
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
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
            {products
              .filter((p) => filter === "All" || p.category === filter)
              .map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img
                        className="h-9 w-9 rounded object-cover"
                        src={p.image}
                        alt=""
                      />
                      {p.name}
                    </div>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3 text-right">${p.price.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.stock}</td>
                  <td className="p-3 text-right">
                    {p.normalPoints} Ã— {p.bonusMultiplier}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-[var(--gold-mid)] mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        void confirm(`Delete ${p.name}?`).then((ok) => {
                          if (ok) {
                            deleteProduct(p.id)
                            notify(`${p.name} deleted.`, "success")
                          }
                        })
                      }}
                      className="text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
