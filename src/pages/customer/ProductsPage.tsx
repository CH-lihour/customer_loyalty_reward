import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { categories, type Product } from "../../data/mockData";
import { useShop } from "../../data/shop";

interface Props {
  onAddToCart: (productId: string) => void;
  guest?: boolean;
}

function ProductDetail({
  product,
  money,
  onClose,
  onAddToCart,
  guest,
}: {
  product: Product;
  money: (amount: number) => string;
  onClose: () => void;
  onAddToCart: (productId: string) => void;
  guest: boolean;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        className="product-dialog"
      >
        <div className="relative h-52 bg-[var(--secondary)] sm:h-64">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close product details"
            className="absolute right-3 top-3 rounded-full bg-[var(--background)]/90 px-3 py-1 text-xl"
          >
            ×
          </button>
        </div>
        <div className="space-y-3 p-5 sm:p-6">
          <div>
            <p className="text-xs text-[var(--gold-mid)]">{product.category}</p>
            <h2
              id="product-detail-title"
              className="font-display text-xl font-semibold"
            >
              {product.name}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {product.nameKh}
            </p>
          </div>
          <p className="text-sm leading-relaxed">{product.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong className="text-xl text-[var(--gold-mid)]">
              {money(product.price)}
            </strong>
            <span className="text-[var(--muted-foreground)]">
              {product.stock} in stock · +{product.normalPoints} base pts ·{" "}
              {product.bonusMultiplier}× bonus
            </span>
          </div>
          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() => {
              onAddToCart(product.id);
              onClose();
            }}
            className="w-full rounded-lg bg-[var(--gold-mid)] py-2 font-semibold text-[var(--background)] disabled:opacity-40"
          >
            {product.stock < 1 ? "Out of Stock" : guest ? "Sign in to add" : "Add to Cart"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function ProductsPage({ onAddToCart, guest = false }: Props) {
  const { products, money } = useShop();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((p) => p.id === selectedId);
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
              onClick={() => setSelectedId(product.id)}
              className="relative block h-44 w-full overflow-hidden bg-[var(--secondary)] text-left"
            >
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                onClick={() => setSelectedId(product.id)}
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
                  onClick={() => setSelectedId(product.id)}
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
                  {product.stock < 1 ? "Sold Out" : guest ? "Sign in to add" : "Add to Cart"}
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
      {selected && (
        <ProductDetail
          product={selected}
          money={money}
          onClose={() => setSelectedId(null)}
          onAddToCart={onAddToCart}
          guest={guest}
        />
      )}
    </div>
  );
}
