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
 *
 * WHY `elementsFromPoint` AND NOT A SWEEP OVER THE DOM: the first version walked
 * every element in `body` calling `getComputedStyle` and `getBoundingClientRect`
 * on each. That forces a full layout per element, and it was wired to `resize`,
 * which fires dozens of times while a phone rotates. Asking the browser what is
 * already painted at the bottom edge is one call and no layout thrash.
 *
 * Callers must sit above it: `z-index` over 9999, and this much clearance.
 */

export const POR_ENCIMA_DE_LA_BARRA = "10000";

/** Height in px of whatever is pinned along the bottom edge (0 if nothing is). */
export function huecoInferior(): number {
  // One pixel up from the bottom edge, in the middle: whatever a fixed bar is
  // covering, it is covering this point.
  const x = Math.round(window.innerWidth / 2);
  const y = window.innerHeight - 1;
  let max = 0;
  for (const el of document.elementsFromPoint(x, y)) {
    if (!(el instanceof HTMLElement)) continue;
    if (el === document.body || el === document.documentElement) continue;
    if (getComputedStyle(el).position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    // A bar, not a full-screen overlay: pinned low, wide, and short.
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
    // Hide first: `elementsFromPoint` would otherwise find this very element
    // sitting at the bottom edge and measure it against itself.
    const antes = el.style.visibility;
    el.style.visibility = "hidden";
    const hueco = huecoInferior();
    el.style.visibility = antes;
    el.style.bottom = `calc(${hueco + margen}px + env(safe-area-inset-bottom))`;
  };

  aplicar();

  // Debounced: a rotation fires `resize` dozens of times, and the answer only
  // matters once the screen has settled.
  let pendiente: number | undefined;
  const alRedimensionar = () => {
    window.clearTimeout(pendiente);
    pendiente = window.setTimeout(aplicar, 150);
  };
  window.addEventListener("resize", alRedimensionar);

  // The bar mounts after React renders, which can be after we do.
  window.setTimeout(aplicar, 500);
}
