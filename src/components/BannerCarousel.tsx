import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { apiBanners, type Banner } from "../data/api";
import { Icon } from "./Icon";

/** How long each slide shows before the next, in milliseconds. */
const AUTO_ADVANCE_MS = 5000;
/** How far a swipe must travel, in pixels, to change slide. */
const SWIPE_PX = 40;

const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, "");

/** Opens an in-app path like /products through the app's router; other links open in a new tab. */
function followLink(url: string) {
  if (url.startsWith("/")) {
    window.history.pushState(null, "", `${basePath}${url}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0 });
  } else {
    window.open(url, "_blank", "noopener");
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The home-page banner slider: live campaigns the admin chose to show, loaded from the public API so guests
 * see them too. Renders nothing when there are no banners or the API cannot be reached.
 */
export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);
  // Auto-advance pauses while the pointer is over the slider or keyboard focus is inside it.
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const paused = hovered || keyboardFocused;
  const [reducedMotion] = useState(prefersReducedMotion);
  const swipeStart = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiBanners().then(
      (loaded) => !cancelled && setBanners(loaded),
      // The banner is decoration; without the API the home page simply shows no slider.
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const count = banners.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = setTimeout(() => go(index + 1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [count, paused, reducedMotion, index, go]);

  if (!count) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(index - 1);
    else if (event.key === "ArrowRight") go(index + 1);
    else return;
    event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent) => {
    swipeStart.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (swipeStart.current === null) return;
    const moved = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(moved) >= SWIPE_PX) go(index + (moved < 0 ? 1 : -1));
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // A mouse click also focuses the arrow it hits; only keyboard focus should hold the slide.
      onFocus={(event) => setKeyboardFocused(event.target.matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocused(false);
      }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[image:var(--hero-gradient)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-mid)]"
    >
      <div
        className={`flex touch-pan-y select-none ${reducedMotion ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${banner.title}`}
            aria-hidden={i !== index}
            className="relative aspect-[4/3] w-full shrink-0 sm:aspect-[3/1]"
          >
            {banner.image && (
              <img
                src={banner.image}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
            <div className="relative flex h-full max-w-xl flex-col justify-center gap-2 p-6 pb-10 text-white sm:p-10 sm:px-16">
              {banner.multiplier > 1 && (
                <span className="w-fit rounded-full bg-[var(--gold-mid)] px-3 py-1 text-xs font-semibold text-[var(--background)]">
                  {banner.multiplier}× points
                </span>
              )}
              <h2 className="font-display text-2xl font-semibold leading-tight md:text-4xl">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="text-sm leading-relaxed text-white/85 md:text-base">{banner.subtitle}</p>
              )}
              {banner.linkUrl && (
                <button
                  type="button"
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => followLink(banner.linkUrl)}
                  className="mt-2 w-fit rounded-lg bg-[var(--gold-mid)] px-5 py-2.5 text-sm font-semibold text-[var(--background)]"
                >
                  {banner.buttonLabel || "Learn more"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full sm:block bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
          >
            <Icon name="chevron" className="h-5 w-5 rotate-90" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full sm:block bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
          >
            <Icon name="chevron" className="h-5 w-5 -rotate-90" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-[var(--gold-mid)]" : "w-2 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
