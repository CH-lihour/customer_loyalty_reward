import { useState } from "react";
import { useShop } from "../../data/shop";
import { ProductCover } from "../../components/ProductImage";

interface Props {
  onAddToCart: (productId: string) => void;
  onViewProduct: (productId: string) => void;
  guest?: boolean;
}

export function ProductsPage({ onAddToCart, onViewProduct, guest = false }: Props) {
  const {
    storefrontProducts: products,
    categories: categoryList,
    money,
  } = useShop();
  const categories = [
    "All",
    ...categoryList.filter((c) => c.active).map((c) => c.name),
  ];
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.nameKh.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search products…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--gold-mid)]/50 sm:w-64"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === category ? "bg-[var(--gold-mid)] text-[var(--background)]" : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <article
            key={product.id}
            className="card-glow group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
          >
            <button
              type="button"
              aria-label={`View details for ${product.name}`}
              onClick={() => onViewProduct(product.id)}
              className="relative block h-44 w-full overflow-hidden bg-[var(--secondary)] text-left"
            >
              <ProductCover
                images={product.images}
                alt={product.name}
                showCount
                className="h-full w-full transition-transform duration-500 group-hover:scale-105"
              />
              {product.bonusMultiplier > 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-[var(--gold-mid)] px-2 py-0.5 text-xs font-bold text-[var(--background)]">
                  {product.bonusMultiplier}× pts
                </span>
              )}
              <span
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${product.stock < 20 ? "bg-red-500/85 text-white" : "bg-[var(--secondary)]/85 text-[var(--muted-foreground)]"}`}
              >
                {product.stock < 1
                  ? "Out of stock"
                  : product.stock < 20
                    ? `Only ${product.stock} left`
                    : `${product.stock} in stock`}
              </span>
            </button>
            <div className="flex flex-1 flex-col p-4">
              <p className="mb-1 text-xs text-[var(--muted-foreground)]">
                {product.category}
              </p>
              <button
                type="button"
                onClick={() => onViewProduct(product.id)}
                className="text-left font-medium leading-snug hover:text-[var(--gold-mid)]"
              >
                {product.name}
              </button>
              <p className="text-xs text-[var(--muted-foreground)]">
                {product.nameKh}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                {product.description}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <strong className="text-lg text-[var(--gold-mid)]">
                  {money(product.price)}
                </strong>
                <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                  +{product.normalPoints} pts
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onViewProduct(product.id)}
                  className="rounded-lg border border-[var(--border)] py-2 text-xs font-semibold"
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => onAddToCart(product.id)}
                  disabled={product.stock < 1}
                  className="rounded-lg bg-[var(--gold-mid)] py-2 text-xs font-semibold text-[var(--background)] disabled:opacity-40"
                >
                  {product.stock < 1
                    ? "Sold Out"
                    : guest
                      ? "Sign in to add"
                      : "Add to Cart"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
          No products match your search.
        </div>
      )}
    </div>
  );
}
