import { useState } from "react";
import { useShop } from "../../data/shop";
import { useFeedback } from "../../components/FeedbackProvider";
import { Icon } from "../../components/Icon";

export function CartPage({ onNav, guest = false, onSignIn }: { onNav: (page: string) => void; guest?: boolean; onSignIn?: () => void }) {
  const shop = useShop();
  const { notify } = useFeedback();
  const [checkingOut, setCheckingOut] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(guest ? "" : shop.currentUser.phone);
  const [error, setError] = useState("");
  const items = shop.cart
    .map((item) => ({
      ...item,
      product: shop.products.find((p) => p.id === item.productId),
    }))
    .filter((item) => item.product !== undefined);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product!.price * item.qty,
    0,
  );
  const multiplier = guest ? 1 : shop.tiers[shop.currentUser.tier].multiplier;
  const today = new Date().toISOString().slice(0, 10);
  const campaignMultiplier = Math.max(
    1,
    ...shop.campaigns
      .filter((c) => c.active && c.startDate <= today && c.endDate >= today)
      .map((c) => c.multiplier),
  );
  const points = Math.floor(
    items.reduce(
      (sum, item) =>
        sum +
        item.product!.normalPoints * item.product!.bonusMultiplier * item.qty,
      0,
    ) *
      multiplier *
      campaignMultiplier,
  );
  const setQty = (id: string, qty: number) =>
    shop.setCart(
      shop.cart
        .map((c) =>
          c.productId === id
            ? {
                ...c,
                qty: Math.max(
                  0,
                  Math.min(
                    qty,
                    shop.products.find((p) => p.id === id)?.stock ?? 0,
                  ),
                ),
              }
            : c,
        )
        .filter((c) => c.qty > 0),
    );

  if (!items.length)
    return (
      <div className="text-center py-24 space-y-4">
        <Icon name="cart" className="mx-auto h-12 w-12 text-[var(--gold-mid)]" />
        <h1 className="font-display text-2xl">Your cart is empty</h1>
        <button
          onClick={() => onNav("products")}
          className="rounded-lg bg-[var(--gold-mid)] text-[var(--background)] px-5 py-2 font-semibold"
        >
          Browse Products
        </button>
      </div>
    );
  return (
    <div className="w-full space-y-5">
      <h1 className="font-display text-2xl font-semibold">Your Cart</h1>
      {items.map(({ product, productId, qty }) => (
        <div
          key={productId}
          className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <img
            src={product!.image}
            alt={product!.name}
            className="h-16 w-16 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-32">
            <div className="font-semibold">{product!.name}</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {shop.money(product!.price)} each · {product!.stock} in stock
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQty(productId, qty - 1)}
              className="rounded bg-[var(--secondary)] px-2"
            >
              −
            </button>
            <span>{qty}</span>
            <button
              aria-label="Increase quantity"
              disabled={qty >= product!.stock}
              onClick={() => setQty(productId, qty + 1)}
              className="rounded bg-[var(--secondary)] px-2 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <strong>{shop.money(product!.price * qty)}</strong>
          <button
            type="button"
            aria-label={`Remove ${product!.name}`}
            title={`Remove ${product!.name}`}
            onClick={() => setQty(productId, 0)}
            className="grid h-9 w-9 place-items-center rounded-lg text-red-400 hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            <Icon name="trash" className="h-5 w-5" />
          </button>
        </div>
      ))}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
        <h2 className="font-semibold">Order Summary</h2>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <strong>{shop.money(subtotal)}</strong>
        </div>
        <div className="flex justify-between text-[var(--gold-mid)]">
          <span>Points after order completion</span>
          <strong>+{points}</strong>
        </div>
        {guest ? (
          <button onClick={onSignIn} className="w-full rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-3 font-semibold">
            Sign in to checkout
          </button>
        ) : !checkingOut ? (
          <button
            onClick={() => setCheckingOut(true)}
            className="w-full rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-3 font-semibold"
          >
            Proceed to Checkout →
          </button>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const result = shop.checkout(address, phone);
              if (result) {
                setError(result);
                notify(result, "error");
              } else {
                notify(
                  "Order placed! Points will arrive when it is completed.",
                  "success",
                );
                onNav("orders");
              }
            }}
          >
            <h3 className="font-semibold">Delivery details</h3>
            <input
              required
              aria-label="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, city, province"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
            />
            <input
              required
              aria-label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Cambodian phone number"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Demo order · No payment is collected
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-2 font-semibold"
              >
                Place Order
              </button>
              <button
                type="button"
                onClick={() => setCheckingOut(false)}
                className="rounded-lg bg-[var(--secondary)] px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
