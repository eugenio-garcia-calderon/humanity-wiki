/*
 * PWA REGISTRATION (2026-08-22, Programador 3)
 *
 * WHY THIS DOES NOT REGISTER IN DEVELOPMENT BY DEFAULT: three people run this
 * platform at once on this machine (3000, 3001, 3002). A service worker caching
 * assets under someone else's dev server is the fastest way to make a colleague
 * chase a bug that is really a stale file. So it registers in production, and in
 * development only when you ask for it with `?sw=on` — which is also how you test
 * offline locally.
 *
 * `?sw=off` unregisters and wipes the caches, on any environment. That is the way
 * out for a user stuck on a bad worker, and it works without a developer.
 */

import { vigilarSinConexion } from "./avisoSinConexion";

export function registrarPWA() {
  if (!("serviceWorker" in navigator)) return;

  // El aviso se monta siempre que haya service worker: es lo que impide que una
  // copia guardada se lea como si fuera de ahora.
  vigilarSinConexion();

  const params = new URLSearchParams(location.search);
  const pedido = params.get("sw");

  if (pedido === "off") {
    navigator.serviceWorker.getRegistrations().then((rs) => {
      rs.forEach((r) => r.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((ns) => ns.forEach((n) => caches.delete(n)));
    }
    console.info("[pwa] service worker desactivado y cachés borradas");
    return;
  }

  const debeRegistrar = import.meta.env.PROD || pedido === "on";
  if (!debeRegistrar) return;

  // After load: registering during boot competes for bandwidth with the very
  // assets the first paint needs.
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((r) => console.info("[pwa] activo, ámbito", r.scope))
      .catch((e) => console.warn("[pwa] no se pudo registrar:", e.message));
  });
}
