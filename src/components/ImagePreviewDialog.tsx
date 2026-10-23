import { useEffect, useRef, useState } from "react";
import { ProductPhoto } from "./ProductImage";

type Props = {
  /** A single image, or use `images` to page through several. */
  image?: string;
  images?: string[];
  /** Which of `images` to show first. */
  startIndex?: number;
  name: string;
  onClose: () => void;
  closing: boolean;
};

const navButton =
  "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xl leading-none text-white hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-[var(--gold-mid)]";

export function ImagePreviewDialog({ image, images, startIndex = 0, name, onClose, closing }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const list = images ?? (image ? [image] : []);
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, list.length - 1)));
  const step = (by: number) => setIndex((current) => (current + by + list.length) % list.length);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${name} image preview`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (list.length < 2) return;
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onClose();
      }}
      className={`image-preview-dialog ${closing ? "modal-leaving" : ""}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <span className="min-w-0 truncate text-sm font-semibold">
          {name}
          {list.length > 1 && <span className="ml-2 font-normal text-[var(--muted-foreground)]">{index + 1} / {list.length}</span>}
        </span>
        <button type="button" onClick={onClose} aria-label="Close image preview" className="rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]">×</button>
      </div>
      <div className="relative grid min-h-40 place-items-center p-3 sm:p-5">
        {list[index] ? (
          <img src={list[index]} alt={`${name}, image ${index + 1}`} className="max-h-[min(70dvh,760px)] max-w-full object-contain" />
        ) : (
          <ProductPhoto alt={name} className="h-48 w-64 rounded-lg" />
        )}
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous image" className={`${navButton} left-3`}>‹</button>
            <button type="button" onClick={() => step(1)} aria-label="Next image" className={`${navButton} right-3`}>›</button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto border-t border-[var(--border)] px-4 py-3">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${i === index ? "border-[var(--gold-mid)]" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <ProductPhoto src={src} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </dialog>
  );
}
