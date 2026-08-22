/*
 * "YOU ARE LOOKING AT A SAVED COPY" BANNER (2026-08-22, Programador 3)
 *
 * The service worker keeps your own data so the platform is readable without a
 * network. That is only safe if you can tell. Cached data shown as if it were
 * live is the exact failure this project keeps finding, and an offline mode that
 * hides its own staleness is that failure with better manners.
 *
 * So the worker stamps every parachute answer with `X-Desde-Cache` and the time
 * it was taken, and this reads the stamp and says it out loud.
 *
 * WHY IT WRAPS `fetch` INSTEAD OF LIVING IN A COMPONENT: the data is read from
 * dozens of places, none of which know about the cache and none of which should
 * have to. Wrapping the one function they all go through means the warning
 * cannot be forgotten in the next screen somebody writes. It only reads two
 * headers and passes everything else through untouched.
 */

import { mantenerSobreLaBarra, POR_ENCIMA_DE_LA_BARRA } from "./anclajeInferior";

const ID = "aviso-sin-conexion";

function hace(desde: string | null): string {
  if (!desde) return "hace un rato";
  const ms = Date.now() - new Date(desde).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "hace menos de un minuto";
  if (min < 60) return `hace ${min} minuto${min === 1 ? "" : "s"}`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} hora${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

function pintar(texto: string) {
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("div");
    el.id = ID;
    el.setAttribute("role", "status");
    el.style.cssText = [
      "position:fixed",
      "left:0",
      "right:0",
      // bottom is set below: on a phone the nav bar owns the bottom edge, and
      // this banner spent its first version hidden behind it.
      `z-index:${POR_ENCIMA_DE_LA_BARRA}`,
      "padding:0.6rem 1rem",
      // The notch and the home bar: without this it sits under them on an iPhone.
      "padding-bottom:max(0.6rem,env(safe-area-inset-bottom))",
      "background:#8a6d00",
      "color:#fff",
      "font:600 13px/1.35 system-ui,sans-serif",
      "text-align:center",
    ].join(";");
    document.body.appendChild(el);
    mantenerSobreLaBarra(el);
  }
  el.textContent = texto;
}

function quitar() {
  document.getElementById(ID)?.remove();
}

export function vigilarSinConexion() {
  const original = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await original(...args);
    try {
      if (res.headers.get("X-Desde-Cache") === "1") {
        pintar(
          `Sin conexión — estás viendo una copia guardada ${hace(res.headers.get("X-Cacheado-En"))}. Los cambios que hagas no se guardarán.`,
        );
      }
    } catch {
      /* reading a header must never break a request */
    }
    return res;
  };

  // Coming back online clears it. Losing the network does NOT show it on its own:
  // the banner claims you are looking at old data, and that is only true once
  // something has actually been served from the cache.
  window.addEventListener("online", quitar);
}
