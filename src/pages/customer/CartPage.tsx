import { products, CURRENT_USER, tierConfig } from '../../data/mockData';

export interface CartItem { productId: string; qty: number; }

interface Props {
  cart: CartItem[];
  onUpdateCart: (items: CartItem[]) => void;
  onNav: (p: string) => void;
}

export function CartPage({ cart, onUpdateCart, onNav }: Props) {
  const items = cart.map(ci => ({ ...ci, product: products.find(p => p.id === ci.productId)! })).filter(ci => ci.product);
  const subtotal = items.reduce((s, ci) => s + ci.product.price * ci.qty, 0);
  const multiplier = tierConfig[CURRENT_USER.tier].multiplier;
  const pointsToEarn = Math.floor(items.reduce((s, ci) => s + ci.product.normalPoints * ci.qty * ci.product.bonusMultiplier, 0) * multiplier);

  const setQty = (productId: string, qty: number) => {
    if (qty === 0) onUpdateCart(cart.filter(c => c.productId !== productId));
    else onUpdateCart(cart.map(c => c.productId === productId ? { ...c, qty } : c));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-6xl">🛒</div>
        <h2 className="font-display text-xl font-semibold">Your cart is empty</h2>
        <p className="text-[var(--muted-foreground)] text-sm">Start shopping to earn loyalty points!</p>
        <button onClick={() => onNav('products')} className="px-6 py-2 bg-[var(--gold-mid)] text-[var(--background)] font-semibold rounded-lg hover:bg-[var(--gold-light)] transition-colors">
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <h1 className="font-display text-2xl font-semibold">Your Cart</h1>

      <div className="flex flex-col gap-3">
        {items.map(ci => (
          <div key={ci.productId} className="flex gap-4 items-center bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
            <img src={ci.product.image} alt={ci.product.name} className="w-16 h-16 rounded-lg object-cover bg-[var(--secondary)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{ci.product.name}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{ci.product.nameKh}</div>
              <div className="text-sm font-semibold text-[var(--gold-mid)] mt-1">${ci.product.price} ea</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setQty(ci.productId, ci.qty - 1)} className="w-7 h-7 rounded-lg bg-[var(--secondary)] flex items-center justify-center hover:bg-[var(--muted)] transition-colors font-semibold">−</button>
              <span className="font-mono-data w-5 text-center text-sm">{ci.qty}</span>
              <button onClick={() => setQty(ci.productId, ci.qty + 1)} className="w-7 h-7 rounded-lg bg-[var(--secondary)] flex items-center justify-center hover:bg-[var(--muted)] transition-colors font-semibold">+</button>
            </div>
            <div className="text-right shrink-0 w-16">
              <div className="font-semibold">${(ci.product.price * ci.qty).toFixed(0)}</div>
              <div className="text-xs text-[var(--muted-foreground)]">+{ci.product.normalPoints * ci.qty} pts</div>
            </div>
            <button onClick={() => setQty(ci.productId, 0)} className="text-[var(--muted-foreground)] hover:text-red-400 transition-colors text-lg shrink-0">×</button>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Subtotal ({items.length} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Shipping</span>
            <span className="text-green-400">Free</span>
          </div>
          <div className="border-t border-[var(--border)] pt-2 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[var(--gold-mid)] mt-1">
            <span className="flex items-center gap-1">⭐ Points you'll earn <span className="text-xs text-[var(--muted-foreground)]">({CURRENT_USER.tier} {multiplier}× multiplier)</span></span>
            <span className="font-mono-data font-semibold">+{pointsToEarn} pts</span>
          </div>
        </div>
        <button className="w-full mt-4 py-3 rounded-xl bg-[var(--gold-mid)] text-[var(--background)] font-semibold hover:bg-[var(--gold-light)] transition-colors">
          Proceed to Checkout →
        </button>
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-2">Points are awarded when order is completed</p>
      </div>
    </div>
  );
}
