import { useState } from "react";
import type { ProductImage as ProductImageData } from "../data/mockData";
import { Icon } from "./Icon";

/** Shown when a product has no image, or its image fails to load. */
function ImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`grid place-items-center bg-[var(--secondary)] text-[var(--muted-foreground)] ${className}`}>
      <span className="flex flex-col items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
        <Icon name="image" className="h-6 w-6 opacity-70" />
        No image
      </span>
    </div>
  );
}

/** One product image that falls back to a placeholder instead of a broken image. */
export function ProductPhoto({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <ImagePlaceholder className={className} />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className={`object-cover ${className}`} />;
}

/** A product's cover (its first image), with a "+N" badge when it has more. */
export function ProductCover({ images, alt, className = "", showCount = false }: {
  images: ProductImageData[];
  alt: string;
  className?: string;
  showCount?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <ProductPhoto src={images[0]?.url} alt={alt} className="h-full w-full" />
      {showCount && images.length > 1 && (
        <span className="absolute bottom-1 right-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          +{images.length - 1}
        </span>
      )}
    </div>
  );
}

/**
 * A large image with a row of thumbnails to switch between a product's photos.
 * `onOpen` receives the shown image's index, for opening a full-size preview.
 */
export function ProductGallery({ images, name, className = "", onOpen }: {
  images: ProductImageData[];
  name: string;
  className?: string;
  onOpen?: (index: number) => void;
}) {
  const [active, setActive] = useState(0);
  const index = Math.min(active, Math.max(0, images.length - 1));
  const main = <ProductPhoto src={images[index]?.url} alt={name} className="h-full w-full" />;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--secondary)]">
        {onOpen && images.length ? (
          <button type="button" onClick={() => onOpen(index)} aria-label={`Inspect image ${index + 1} of ${name}`} className="h-full w-full cursor-zoom-in">
            {main}
          </button>
        ) : main}
        {images.length > 1 && (
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {index + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={`${name} photos`}>
          {images.map((image, i) => (
            <button
              key={image.id ?? image.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-[var(--gold-mid)]" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <ProductPhoto src={image.url} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
