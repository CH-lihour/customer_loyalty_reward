import { useEffect, useRef } from "react";

type Props = {
  image: string;
  name: string;
  onClose: () => void;
  closing: boolean;
};

export function ImagePreviewDialog({ image, name, onClose, closing }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onClose();
      }}
      className={`image-preview-dialog ${closing ? "modal-leaving" : ""}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <span className="min-w-0 truncate text-sm font-semibold">{name}</span>
        <button type="button" onClick={onClose} aria-label="Close image preview" className="rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]">×</button>
      </div>
      <div className="grid min-h-40 place-items-center p-3 sm:p-5">
        <img src={image} alt={name} className="max-h-[min(75dvh,800px)] max-w-full object-contain" />
      </div>
    </dialog>
  );
}
