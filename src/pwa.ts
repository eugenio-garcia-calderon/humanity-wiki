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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO TEST THIS, AND WHERE NOT TO (read before you debug anything here)
 *
 * **The in-app automation browser cannot run a service worker.** Every request a
 * worker handles fails there with `net::ERR_FAILED`, while the same URL loads
 * fine with `?sw=off`. This is not your code: a fifteen-line worker whose only
 * body is `fetch(event.request)` fails there too. Half a session was spent
 * hunting a bug that did not exist. **Use real Chrome.**
 *
 * And test with the server actually stopped, in production mode:
 *
 *   NODE_ENV=production PORT=3002 node --env-file=.env \
 *     ../../node_modules/.bin/tsx server.ts
 *
 * then kill it and reload. Everything that has gone wrong with this feature went
 * wrong only in that state: cache writes lost because they sat outside
 * `event.waitUntil`, and a first visit that cached nothing because a worker does
 * not control the page that installs it. Neither is visible while the server is
 * up, and both made the app open empty on a plane.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dominioPropio } from "./utils/subdominio";
import { vigilarSinConexion } from "./avisoSinConexion";
import { ofrecerInstalacion } from "./avisoInstalar";
import { vigilarVersion } from "./avisoVersionNueva";

export function registrarPWA() {
  if (!("serviceWorker" in navigator)) return;

  // ── EN EL DOMINIO DE OTRO, NADA DE ESTO (2026-08-22) ───────────────────────
  // Lo vio prog3 al preguntar por el `scope` del manifiesto, y tenía razón:
  // `lamieldelasierra.com` sirve esta misma aplicación, así que sin este
  // freno haría tres cosas que no le tocan.
  //
  //   1. Ofrecerle a un cliente de esa tienda instalar «Humanity.wiki». El
  //      nombre no es el suyo y la intención tampoco: entró a comprar miel.
  //   2. Registrar un service worker EN EL ORIGEN DE OTRA PERSONA. Es lo único
  //      que un usuario no puede quitarse recargando, así que un fallo nuestro
  //      dejaría rota la web de alguien que no nos ha instalado nada.
  //   3. Guardar en caché el armazón de la aplicación bajo su dominio.
  //
  // Un dominio propio es una WEB, no nuestra app. Y el service worker de la
  // app se registra sólo donde la app vive.
  if (dominioPropio()) {
    // Y se quita el enlace al manifiesto, que va en el `index.html` estático y
    // llega igual. Sin esto el navegador seguiría ofreciendo la instalación
    // aunque no haya service worker.
    document.querySelector('link[rel="manifest"]')?.remove();
    return;
  }

  // El aviso se monta siempre que haya service worker: es lo que impide que una
  // copia guardada se lea como si fuera de ahora.
  vigilarSinConexion();

  // Y QUE LA APLICACIÓN SEPA CUÁNDO SE HA QUEDADO VIEJA. Sin esto, una copia
  // guardada puede enseñar la versión de ayer indefinidamente. Pasó el
  // 2026-08-22: tres despliegues en verde, el código demostrablemente en el
  // fichero que servía el servidor, y el iPhone de Eugenio enseñando todavía la
  // aplicación de antes — «no ha cambiado nada».
  vigilarVersion();

  // Y el empujón para instalarla en un iPhone, que es el único sitio donde el
  // navegador no lo ofrece por su cuenta.
  window.addEventListener("load", ofrecerInstalacion);

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
      // `updateViaCache: "none"`: el servidor manda `Cache-Control: max-age=14400`
      // para /sw.js, o sea que un arreglo urgente en el worker tardaría cuatro
      // horas en llegar a un móvil. Así el navegador lo pide siempre de verdad.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => console.info("[pwa] activo, ámbito", r.scope))
      .catch((e) => console.warn("[pwa] no se pudo registrar:", e.message));
  });
}
