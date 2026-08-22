/*
 * HOW MUCH ROOM IS TAKEN AT THE BOTTOM OF THE SCREEN (2026-08-22, Programador 3)
 *
 * Found by looking, not by reasoning: on a phone the platform has a fixed
 * navigation bar glued to `bottom: 0` with `z-index: 9999`. Both of my overlays
 * — the "you are offline" banner and the "add to home screen" card — were
 * anchored to the bottom too, so they sat underneath it. The offline banner was
 * invisible on the exact device it was written for, and the install card had its
 * only button covered.
 *
 * WHY MEASURE INSTEAD OF HARD-CODING 44px: that bar is somebody else's file and
 * is not always there — it is mobile-only, and layouts change. A number copied
 * from today's CSS would rot silently and put the banner back under the bar.
 * Measuring is a few lines and cannot go stale.
 *
 * Callers must sit above it: `z-index` over 9999, and this much clearance.
 */

export const POR_ENCIMA_DE_LA_BARRA = "10000";

/** Height in px of whatever is pinned along the bottom edge (0 if nothing is). */
export function huecoInferior(): number {
  let max = 0;
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none") continue;
    const r = el.getBoundingClientRect();
    // Pinned to the bottom edge, full width, and not the whole screen: that is a
    // bar. The height ceiling keeps a full-screen fixed overlay out of this.
    if (Math.abs(r.bottom - window.innerHeight) > 2) continue;
    if (r.width < window.innerWidth * 0.8) continue;
    if (r.height === 0 || r.height > 160) continue;
    max = Math.max(max, r.height);
  }
  return Math.round(max);
}

/**
 * Keep `el` clear of that bar, now and after the screen changes size (rotating a
 * phone swaps the mobile bar in or out).
 */
export function mantenerSobreLaBarra(el: HTMLElement, margen = 0) {
  const aplicar = () => {
    el.style.bottom = `calc(${huecoInferior() + margen}px + env(safe-area-inset-bottom))`;
  };
  aplicar();
  window.addEventListener("resize", aplicar);
  // The bar mounts after React renders, which can be after we do.
  setTimeout(aplicar, 500);
}
