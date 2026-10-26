import { useShop } from "../../data/shop";
import { useModalState } from "../../components/useModalState";
import { ImagePreviewDialog } from "../../components/ImagePreviewDialog";
import { ProductCover, ProductGallery } from "../../components/ProductImage";

interface Props {
  productId: string;
  onAddToCart: (productId: string) => void;
  onViewProduct: (productId: string) => void;
  onBack: () => void;
  guest?: boolean;
}

const relatedLimit = 4;

export function ProductDetailPage({
  productId,
  onAddToCart,
  onViewProduct,
  onBack,
  guest = false,
}: Props) {
  const { storefrontProducts: products, money } = useShop();
  const product = products.find((p) => p.id === productId);
  // The index of the image open in the full-size preview, or null when it is closed.
  const [previewIndex, setPreviewIndex, previewClosing] = useModalState<
    number | null
  >(null);
  if (!product) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">
          Product not found
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          This product may have been removed or is no longer for sale.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-[var(--gold-mid)] px-5 py-2 font-semibold text-[var(--background)]"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const related = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, relatedLimit);
  const stockLabel =
    product.stock < 1
      ? "Out of stock"
      : product.stock < 20
        ? `Only ${product.stock} left`
        : `${product.stock} in stock`;

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-[var(--muted-foreground)] hover:text-[var(--gold-mid)]"
      >
        ← Back to products
      </button>

      <article className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductGallery
          images={product.images}
          name={product.name}
          onOpen={setPreviewIndex}
          className="aspect-square w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
        />

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gold-mid)]">
              {product.category}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
              {product.name}
            </h1>
            <p className="mt-1 text-[var(--muted-foreground)]">
              {product.nameKh}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <strong className="text-3xl text-[var(--gold-mid)]">
              {money(product.price)}
            </strong>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${product.stock < 20 ? "bg-red-500/15 text-red-400" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}
            >
              {stockLabel}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">
                Base points
              </dt>
              <dd className="font-semibold">+{product.normalPoints} pts</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">
                Bonus multiplier
              </dt>
              <dd className="font-semibold">{product.bonusMultiplier}×</dd>
            </div>
          </dl>

          {product.description && (
            <section>
              <h2 className="mb-1 text-sm font-semibold">Description</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--muted-foreground)]">
                {product.description}
              </p>
            </section>
          )}

          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() => onAddToCart(product.id)}
            className="w-full rounded-lg bg-[var(--gold-mid)] py-3 font-semibold text-[var(--background)] hover:bg-[var(--gold-light)] disabled:opacity-40 sm:max-w-xs"
          >
            {product.stock < 1
              ? "Out of Stock"
              : guest
                ? "Sign in to add"
                : "Add to Cart"}
          </button>
        </div>
      </article>

      {related.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold">
            More in {product.category}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onViewProduct(p.id)}
                className="card-glow group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-left"
              >
                <ProductCover
                  images={p.images}
                  alt={p.name}
                  className="h-36 w-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-3">
                  <p className="text-sm font-medium leading-snug group-hover:text-[var(--gold-mid)]">
                    {p.name}
                  </p>
                  <p className="mt-1 font-semibold text-[var(--gold-mid)]">
                    {money(p.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {previewIndex !== null && (
        <ImagePreviewDialog
          images={product.images.map((image) => image.url)}
          startIndex={previewIndex}
          name={product.name}
          onClose={() => setPreviewIndex(null)}
          closing={previewClosing}
        />
      )}
    </div>
  );
}
