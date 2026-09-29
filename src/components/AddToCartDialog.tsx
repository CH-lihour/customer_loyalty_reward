import { useEffect, useRef, useState } from "react";
import type { Product } from "../data/mockData";

type Props = {
  product: Product;
  available: number;
  money: (amount: number) => string;
  onClose: () => void;
  onConfirm: (qty: number) => void;
};

export function AddToCartDialog({ product, available, money, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [qty, setQty] = useState(1);
  const selectedQty = Math.min(qty, available);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      aria-labelledby="add-to-cart-title"
      className="add-to-cart-dialog"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gold-mid)]">Add to cart</p>
          <h2 id="add-to-cart-title" className="mt-1 font-display text-xl font-semibold">Confirm your item</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl text-[var(--muted-foreground)] hover:text-[var(--foreground)]">×</button>
      </div>

      <div className="mt-5 flex items-center gap-4 rounded-xl bg-[var(--secondary)] p-3">
        <img src={product.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{product.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{product.nameKh}</p>
          <p className="mt-1 font-semibold text-[var(--gold-mid)]">{money(product.price)} each</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <label htmlFor="add-to-cart-qty" className="text-sm font-semibold">Quantity</label>
          <p className="text-xs text-[var(--muted-foreground)]">{available} available</p>
        </div>
        <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--secondary)]">
          <button type="button" aria-label="Decrease quantity" disabled={selectedQty <= 1} onClick={() => setQty(selectedQty - 1)} className="px-3 py-2 disabled:opacity-40">−</button>
          <input
            id="add-to-cart-qty"
            type="number"
            min={1}
            max={available}
            step={1}
            value={selectedQty}
            onChange={(event) => setQty(Math.max(1, Math.min(available, Math.trunc(Number(event.target.value)) || 1)))}
            className="w-14 border-x border-[var(--border)] bg-transparent py-2 text-center text-sm outline-none"
          />
          <button type="button" aria-label="Increase quantity" disabled={selectedQty >= available} onClick={() => setQty(selectedQty + 1)} className="px-3 py-2 disabled:opacity-40">+</button>
        </div>
      </div>

      <div className="mt-5 flex justify-between border-t border-[var(--border)] pt-4 text-sm">
        <span className="text-[var(--muted-foreground)]">Total</span>
        <strong className="text-lg text-[var(--gold-mid)]">{money(product.price * selectedQty)}</strong>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button>
        <button type="button" disabled={available < 1} onClick={() => onConfirm(selectedQty)} className="flex-1 rounded-lg bg-[var(--gold-mid)] py-2.5 text-sm font-semibold text-[var(--background)] disabled:opacity-40">Confirm & Add</button>
      </div>
    </dialog>
  );
}
