import { useEffect, useState } from "react";
import { useShop } from "../../data/shop";
import { tierRule } from "../../data/tiers";
import { useFeedback } from "../../components/FeedbackProvider";
import { ProductCover } from "../../components/ProductImage";
import { Icon } from "../../components/Icon";
import { KhqrPayment } from "../../components/KhqrPayment";
import type { OrderPayment } from "../../data/mockData";
import { apiCreateOrder, apiPointRules, type PlacedOrder, type PointRules } from "../../data/api";
import { refreshCustomerPoints } from "../../data/pointSync";

export function CartPage({
  onNav,
  guest = false,
  onSignIn,
  token = null,
}: {
  onNav: (page: string) => void;
  guest?: boolean;
  onSignIn?: () => void;
  /** The signed-in customer's API token, used to make and check the KHQR payment. */
  token?: string | null;
}) {
  const shop = useShop();
  const { notify } = useFeedback();
  const [checkingOut, setCheckingOut] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(guest ? "" : shop.currentUser.phone);
  const [error, setError] = useState("");
  // Delivery details are in and the customer is on the KHQR step.
  const [paying, setPaying] = useState(false);
  // The payment of the order just placed, for the receipt shown after the cart empties.
  const [paid, setPaid] = useState<OrderPayment | null>(null);
  // The API's copy of that order, with the points it earned.
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  // The API's tier and campaign multipliers, so the preview matches the points checkout awards.
  const [rules, setRules] = useState<PointRules | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiPointRules(token).then((next) => !cancelled && setRules(next), () => {});
    return () => {
      cancelled = true;
    };
  }, [token]);
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
  const multiplier = guest ? 1 : (rules?.tierMultiplier ?? tierRule(shop.tiers, shop.currentUser.tier).multiplier);
  const today = new Date().toISOString().slice(0, 10);
  const campaignMultiplier = rules?.campaignMultiplier ?? Math.max(
    1,
    ...shop.campaigns
      .filter((c) => c.active && c.startDate <= today && (!c.endDate || c.endDate >= today))
      .map((c) => c.multiplier),
  );
  // The small nudge matches the API, which keeps 2.3 × 100 = 229.99999 from rounding down to 229.
  const points = Math.floor(
    items.reduce(
      (sum, item) =>
        sum +
        item.product!.normalPoints * item.product!.bonusMultiplier * item.qty,
      0,
    ) *
      multiplier *
      campaignMultiplier +
      1e-6,
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

  if (paid)
    return (
      <div className="text-center py-24 space-y-4">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500/15 text-green-400">
          <Icon name="check" className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl">Payment received</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Paid{" "}
          {paid.currency === "KHR"
            ? `${Number(paid.amount).toLocaleString()} ៛`
            : `$${paid.amount}`}{" "}
          by KHQR · Transaction {paid.transactionId}
          <br />
          Order {placed?.orderNumber} is placed.
        </p>
        {placed && placed.pointsEarned + placed.referralBonus > 0 && (
          <p className="text-[var(--gold-mid)] font-semibold">
            +{placed.pointsEarned.toLocaleString()} points earned
            {placed.referralBonus > 0 &&
              ` · +${placed.referralBonus} referral welcome bonus`}
            <br />
            <span className="text-sm font-normal text-[var(--muted-foreground)]">
              Balance: {placed.pointsBalance.toLocaleString()} points
            </span>
          </p>
        )}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => onNav("orders")}
            className="rounded-lg bg-[var(--gold-mid)] text-[var(--background)] px-5 py-2 font-semibold"
          >
            View My Orders
          </button>
          <button
            onClick={() => onNav("products")}
            className="rounded-lg bg-[var(--secondary)] px-5 py-2"
          >
            Keep Shopping
          </button>
        </div>
      </div>
    );
  if (!items.length)
    return (
      <div className="text-center py-24 space-y-4">
        <Icon
          name="cart"
          className="mx-auto h-12 w-12 text-[var(--gold-mid)]"
        />
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
          <ProductCover
            images={product!.images}
            alt={product!.name}
            className="h-16 w-16 shrink-0 rounded-lg"
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
          <span>Points you earn when you pay</span>
          <strong>+{points}</strong>
        </div>
        {guest ? (
          <button
            onClick={onSignIn}
            className="w-full rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-3 font-semibold"
          >
            Sign in to checkout
          </button>
        ) : !checkingOut ? (
          <button
            onClick={() => setCheckingOut(true)}
            className="w-full rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-3 font-semibold"
          >
            Proceed to Checkout →
          </button>
        ) : paying && token ? (
          <KhqrPayment
            token={token}
            amount={
              shop.currency === "KHR"
                ? Math.round(subtotal * shop.exchangeRate)
                : subtotal
            }
            currency={shop.currency}
            onPaid={async (payment, md5) => {
              const problem = shop.checkoutError(address, phone);
              if (problem) {
                notify(problem, "error");
                return problem;
              }
              // The API prices the order, saves it and awards its points (and any referral bonus).
              let order: PlacedOrder;
              try {
                order = await apiCreateOrder(token, {
                  items: shop.cart,
                  address: address.trim(),
                  phone: phone.trim(),
                  khqrMd5: md5,
                });
              } catch (e) {
                const message = (e as Error).message;
                notify(message, "error");
                return message;
              }
              shop.checkout(address, phone, payment, order);
              setPlaced(order);
              setPaid(payment);
              notify(
                order.pointsEarned > 0
                  ? `Payment received. You earned ${order.pointsEarned} points!`
                  : "Payment received. Your order is placed!",
                "success",
              );
              refreshCustomerPoints(token, shop.currentUser.id, shop.syncCustomerPoints).catch(() => {});
              return null;
            }}
            onCancel={() => setPaying(false)}
          />
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const result = token
                ? shop.checkoutError(address, phone)
                : "Sign in again to pay with KHQR.";
              if (result) {
                setError(result);
                notify(result, "error");
              } else {
                setError("");
                setPaying(true);
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
              Payment by KHQR · Demo only, no money is charged
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
                Continue to Payment
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
