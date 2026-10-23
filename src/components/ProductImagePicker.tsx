import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductImage } from "../data/mockData";
import { ProductPhoto } from "./ProductImage";

/** Matches the API: up to 8 images per product, JPG, PNG or WebP, 4 MB each. */
export const maxProductImages = 8;
const maxImageBytes = 4 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  /** Images already saved on the product. */
  existing: ProductImage[];
  /** Ids of saved images marked for removal. */
  removedIds: number[];
  /** Files picked from this computer, uploaded on save. */
  files: File[];
  onChange: (next: { removedIds: number[]; files: File[] }) => void;
};

const removeButton =
  "absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-sm leading-none text-white hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-[var(--gold-mid)]";

/** Picks product photos from the local machine and shows what the product will have after saving. */
export function ProductImagePicker({ existing, removedIds, files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const kept = existing.filter((image) => image.id === undefined || !removedIds.includes(image.id));
  const total = kept.length + files.length;
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (picked: FileList | null) => {
    if (!picked?.length) return;
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of Array.from(picked)) {
      if (!acceptedTypes.includes(file.type)) rejected.push(`${file.name} is not a JPG, PNG or WebP image`);
      else if (file.size > maxImageBytes) rejected.push(`${file.name} is larger than 4 MB`);
      else accepted.push(file);
    }
    const room = maxProductImages - total;
    if (accepted.length > room) rejected.push(`only ${maxProductImages} images are allowed, so ${accepted.length - room} ${accepted.length - room === 1 ? "was" : "were"} left out`);
    setNotice(rejected.length ? `Skipped: ${rejected.join("; ")}.` : "");
    onChange({ removedIds, files: [...files, ...accepted.slice(0, Math.max(0, room))] });
    if (inputRef.current) inputRef.current.value = "";
  };

  const tiles = [
    ...kept.map((image) => ({ key: `saved-${image.id ?? image.url}`, src: image.url, remove: () => image.id !== undefined && onChange({ removedIds: [...removedIds, image.id], files }), label: "Remove image" })),
    ...files.map((file, i) => ({ key: `new-${file.name}-${i}`, src: previews[i], remove: () => onChange({ removedIds, files: files.filter((_, j) => j !== i) }), label: `Remove ${file.name}`, isNew: true })),
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span>Images <span className="text-[var(--muted-foreground)]">· {total} / {maxProductImages} · the first is the cover</span></span>
        {removedIds.length > 0 && (
          <button type="button" onClick={() => onChange({ removedIds: [], files })} className="text-[var(--gold-mid)] hover:underline">
            Undo removals
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((tile, i) => (
          <div key={tile.key} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
            <ProductPhoto src={tile.src} alt="" className="h-full w-full" />
            {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-[var(--gold-mid)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)]">Cover</span>}
            {"isNew" in tile && <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">New</span>}
            <button type="button" onClick={tile.remove} aria-label={tile.label} className={removeButton}>×</button>
          </div>
        ))}
        {total < maxProductImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:border-[var(--gold-mid)] hover:text-[var(--gold-mid)]"
          >
            <span className="flex flex-col items-center gap-1"><span className="text-2xl leading-none">+</span>Add images</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        aria-label="Choose product images"
        onChange={(event) => add(event.target.files)}
        className="sr-only"
      />
      <p className="text-[11px] text-[var(--muted-foreground)]">JPG, PNG or WebP, up to 4 MB each. New images are uploaded when you save.</p>
      {notice && <p role="status" className="text-xs text-amber-400">{notice}</p>}
    </div>
  );
}
