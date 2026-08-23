/*
 * SERVICE WORKER (2026-08-22, Programador 3)
 *
 * What this buys: the platform opens without a network. The shell, the built
 * assets and the icons come from disk, so a phone in a lift or a plane still
 * gets the app instead of the dinosaur.
 *
 * BEFORE YOU CHANGE THIS, DECIDE — the three rules that matter:
 *
 * 1. `/api/*` IS KEPT, BUT ONLY EVER SERVED WHEN THE NETWORK FAILED, AND NEVER
 *    SILENTLY. The first version refused to cache the API at all, to avoid the
 *    thing this project has spent two nights killing: data that claims to be
 *    current when it is not. But refusing to cache means offline shows nothing,
 *    and Eugenio wants his projects readable on a plane.
 *    So: the network always wins while it works — a cached answer can never
 *    shadow a live one. The copy only appears when the request actually failed,
 *    and it arrives stamped with `X-Desde-Cache: 1` and the time it was taken,
 *    so the app can say "saved 3 hours ago" instead of pretending it is now.
 *    Only GET, and never anything that writes.
 *
 * 2. HASHED ASSETS ARE CACHE-FIRST, EVERYTHING ELSE IS NETWORK-FIRST. Files under
 *    /assets/ carry a content hash in the name, so a given URL can never change
 *    meaning: serving them from disk is free and safe. Anything without a hash
 *    could change under the same URL, so the network wins and the cache is only
 *    the fallback.
 *
 * 3. `skipWaiting()` — REVERSED ON 2026-08-22, AND HERE IS WHY. The first
 *    version refused it: a worker that takes over mid-session can mix old HTML
 *    with new assets, which is the classic unreproducible PWA bug. But waiting
 *    for every tab to close never happens on a phone — an installed app resumes
 *    from the switcher for days — and the result was worse than the thing being
 *    avoided: Eugenio's iPhone sat three deploys behind, and the only way out
 *    was asking him to type `?sw=off` into Safari. His answer: «es un apaño, yo
 *    quiero que funcione sin esa url cutre».
 *
 *    So the new worker takes over immediately, throws away the stale code
 *    caches, and reloads its clients — but only the ones nobody is looking at.
 *    A page you can see is never reloaded under you: it gets the "Actualizar"
 *    button instead (`src/avisoVersionNueva.ts`), because a deploy must not be
 *    allowed to throw away what somebody is typing. A hidden page — an installed
 *    app in the switcher, which is the case that matters — is reloaded, and by
 *    the time you look at it again it is already the new version.
 *
 * KILL SWITCH: loading any page with `?sw=off` unregisters this worker and wipes
 * its caches. A bad service worker is the one bug a user cannot clear by
 * reloading, so there has to be a way out that does not need a developer.
 */

// SIGUE SIENDO v5 A PROPÓSITO (2026-08-23). Cambiar este número tira TODAS las
// cachés al activarse, incluida la de tus datos — o sea que todo el mundo se
// queda sin copia para trabajar sin conexión hasta que vuelva a navegar. Eso se
// paga cuando el contenido guardado ya no vale; aquí lo que ha cambiado es la
// REGLA de qué se guarda, no lo guardado.
//
// Lo único que puede haber colado la versión anterior es algún Word o PDF que
// alguien se descargara en la media hora que estuvo viva, y eso lo echa solo
// `recortar()`. El fichero cambia igual, así que el navegador instala este
// worker de todas formas: `VERSION` sólo da nombre a las cachés, no decide si
// hay actualización.
const VERSION = "hw-v5";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const MEDIA = `${VERSION}-media`;
// Your own data — projects, pages, tasks — kept only so a plane is not a wall.
// 200 answers is plenty for what one person actually opens, and small enough
// that nobody wakes up with a full phone.
const DATOS = `${VERSION}-datos`;
const MAX_DATOS = 200;
// Endpoints that serve the same answer to everyone: never kept. See the fetch
// handler for why — a copy of somebody else's public page must not survive them
// taking it down.
const PUBLICO = ["/api/publicar/"];
// Images, styles and fonts only, and no more than this many. Enough for the
// icons and the maps you actually opened; not enough to quietly eat a phone.
const MAX_MEDIA = 60;

// Only the things that are useless to miss. The app's own code lives under
// /assets/ with a hash, and gets cached as it is used instead of guessed here.
/*
 * EL CÓDIGO DE LA APLICACIÓN, RELLENADO EN CADA COMPILACIÓN por
 * `scripts/sellar-sw.mjs`. Vacío aquí, con contenido en `dist/sw.js`.
 *
 * POR QUÉ EXISTE. La versión anterior decía, con toda la seguridad del mundo,
 * que los ficheros con hash «se guardan según se usan, en vez de adivinarlos
 * aquí». Suena bien y está mal: **un service worker no controla la página que
 * lo instala**, así que en la primera visita el JavaScript de la aplicación
 * pasa de largo y no se guarda. Probado el 2026-08-22: cargar una vez, apagar
 * el servidor y recargar daba una **pantalla en blanco** — el HTML venía de la
 * caché y el código que tenía que pintarlo no estaba.
 *
 * Alguien que instala la aplicación y se mete en el metro esa misma tarde es
 * exactamente ese caso. Y no se pueden escribir los nombres a mano porque
 * cambian en cada compilación: por eso los pone el build.
 */
const BUILD = [];

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/logo.svg",
  "/iconos/icono-180.png",
  "/iconos/icono-192.png",
  "/iconos/icono-512.png",
  ...BUILD,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      const assets = await caches.open(ASSETS);
      // addAll fails the whole install if one file 404s. Individual puts mean a
      // missing icon degrades the cache instead of leaving the app with none.
      await Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { cache: "no-store" })
            .then((r) => (r.ok ? (url.startsWith("/assets/") ? assets : shell).put(url, r) : null))
            .catch(() => null),
        ),
      );
    })(),
  );
});

// The home screen's own data. Warmed once, on activate, for one reason: a
// service worker does not control the page that installs it, so every request
// the app fires on that first visit goes straight past this file and is never
// copied. Without the warm-up the platform only survives an aeroplane from the
// *second* visit on — and the first visit is exactly when somebody adds it to
// their home screen and then tries it. Three requests, once per version.
const CALENTAR = ["/api/publicaciones", "/api/proyectos", "/api/circulos"];

self.addEventListener("install", () => {
  // Take over as soon as this worker is ready instead of waiting for every tab
  // to close. See rule 3: on a phone that wait never ends.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();

      // AND RELOAD WHOEVER IS STILL RUNNING THE OLD CODE — BUT NEVER A PAGE
      // SOMEBODY IS LOOKING AT.
      //
      // Reloading repairs a stuck install without asking the page for help,
      // which matters because the stale page is exactly the code that cannot be
      // trusted to update itself. But it also throws away whatever is typed and
      // not yet saved, and this team deployed fifteen times in four hours: a
      // long publication would be lost by somebody else's deploy.
      //
      // So the rule is: a HIDDEN page is reloaded — nobody is typing into a page
      // they cannot see, and this is exactly the case that matters, an installed
      // app sitting in the switcher. A VISIBLE page is left alone, and
      // `avisoVersionNueva.ts` offers it the "Actualizar" button instead, which
      // is a person deciding rather than a deploy deciding for them.
      const abiertos = await self.clients.matchAll({ type: "window" });
      for (const c of abiertos) {
        if (c.visibilityState === "visible" || c.focused) continue;
        try {
          await c.navigate(c.url);
        } catch {
          // Safari does not always allow navigate(); the page then picks up the
          // new build on its next navigation, which is no worse than before.
        }
      }

      const c = await caches.open(DATOS);
      await Promise.all(
        CALENTAR.map(async (ruta) => {
          try {
            // Same-origin credentials, so this sees what the person sees: their
            // own feed, not a logged-out one.
            const res = await fetch(ruta, { credentials: "same-origin" });
            if (!res.ok) return;
            const cabeceras = new Headers(res.headers);
            cabeceras.set("X-Cacheado-En", new Date().toISOString());
            await c.put(ruta, new Response(await res.blob(), { status: 200, headers: cabeceras }));
          } catch {
            // No network while activating: nothing to warm, and nothing broken.
          }
        }),
      );
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // third parties are theirs
  if (url.searchParams.has("sw") && url.searchParams.get("sw") === "off") return;

  // ── NUNCA TOCAR UNA RESPUESTA QUE NO TERMINA (2026-08-23) ─────────────────
  // ESTE FUE MI FALLO Y CONGELÓ LA APLICACIÓN DE EUGENIO. `hw-v4` metía toda
  // respuesta de `/api/` por la rama de abajo, que hace `res.clone()` y luego
  // `await copia.blob()` dentro de un `event.waitUntil`. Sobre
  // `/api/telecom/conexion` —que es Server-Sent Events, `text/event-stream`, y
  // **no termina nunca por diseño**— eso hace dos cosas, las dos malas:
  //
  //   1. `blob()` no se resuelve JAMÁS, así que el `waitUntil` queda pendiente
  //      para siempre. Uno por conexión, por pestaña.
  //   2. Clonar una respuesta en streaming obliga al navegador a GUARDAR TODO
  //      el flujo en memoria para poder dárselo a las dos ramas. Un flujo que
  //      no acaba es memoria que no para de crecer.
  //
  // Con varias pestañas abiertas y 8 GB de RAM, eso es exactamente lo que se
  // ve desde fuera: «la aplicación se queda constantemente, a veces recargando,
  // durante minutos». Reproducido en el navegador ejecutando la misma línea que
  // ejecuta este fichero: sigue colgada a los 8 segundos.
  //
  // SE FILTRA POR LA PETICIÓN, NO POR LA RESPUESTA, y a propósito: para cuando
  // la respuesta llega ya la hemos interceptado, y el daño de clonar está
  // hecho. `EventSource` manda siempre `Accept: text/event-stream`, así que
  // esto vale para el chat de hoy y para cualquier flujo que alguien añada
  // mañana sin acordarse de este comentario.
  //
  // `return` sin `respondWith` = el navegador la trata como si no hubiera
  // service worker. Es lo correcto: una conexión permanente no se guarda en
  // caché ni sirve de nada sin red.
  if ((req.headers.get("accept") || "").includes("text/event-stream")) return;

  // The API: network always wins; the copy is only a parachute (rule 1).
  if (url.pathname.startsWith("/api/")) {
    // NOT the public-page endpoints. Those answer the same to everybody, so a
    // copy would sit in a stranger's browser — and when the author unpublishes a
    // page, that stranger would still be served it from their own disk. The
    // point of this cache is your own work on a plane, not other people's pages
    // outliving the decision to take them down. (Spotted by Programador 2.)
    if (PUBLICO.some((p) => url.pathname.startsWith(p))) {
      event.respondWith(fetch(req));
      return;
    }
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only keep what is safe to show later. An error page cached as if it
          // were data would be the same lie in another costume.
          // EL SEGUNDO CINTURÓN: SOLO SE GUARDA JSON.
          //
          // Lo de arriba mira la petición; esto mira la respuesta, por si algo
          // devuelve un flujo sin pedirlo con la cabecera `Accept`. Clonar es lo
          // que cuesta caro, así que la decisión se toma ANTES de clonar.
          //
          // Y la regla es una lista blanca, no una negra. Empezó siendo «todo
          // menos `text/event-stream`», que arreglaba el fallo del día pero
          // dejaba pasar lo siguiente: bajo `/api/` hay TRES flujos
          // (`telecom.ts`, `navegadorRemoto.ts`, `documentos.ts`) y además
          // descargas binarias — `/api/documentos/:id/docx` y `/pdf` devuelven
          // un Word y un PDF de verdad. Con la lista negra, cada documento que
          // alguien se descargara se copiaba entero en la caché de DATOS y
          // ocupaba una de las 200 plazas, echando de ahí lo que sí sirve para
          // trabajar sin conexión.
          //
          // Esta caché existe para los DATOS de la aplicación, y los datos de
          // esta aplicación son JSON. Todo lo demás que viva bajo `/api/` pasa
          // de largo: se sirve, no se guarda.
          const tipo = res.headers.get("content-type") || "";
          if (res.ok && tipo.includes("application/json")) {
            const copia = res.clone();
            // waitUntil, NOT fire-and-forget. Without it the browser is free to
            // kill the worker the moment the response reaches the page, and the
            // copy is never written. That is exactly what happened: /api/data/*
            // landed in the cache and the feed (/api/publicaciones, /api/proyectos)
            // did not, seemingly at random, and offline the home screen said
            // "0 publicaciones".
            event.waitUntil(
              (async () => {
                const c = await caches.open(DATOS);
                const cuerpo = await copia.blob();
                const cabeceras = new Headers(copia.headers);
                cabeceras.set("X-Cacheado-En", new Date().toISOString());
                await c.put(req, new Response(cuerpo, { status: 200, headers: cabeceras }));
                await recortar(c, MAX_DATOS);
              })().catch(() => {
                // A cache that cannot be written is a slower app, never a broken
                // one: the live response has already gone to the page.
              }),
            );
          }
          return res;
        })
        .catch(async () => {
          const guardado = await caches.match(req);
          if (!guardado) throw new TypeError("Sin conexión y sin copia guardada");
          // Stamped, so nobody downstream can mistake this for a live answer.
          const cuerpo = await guardado.blob();
          const cabeceras = new Headers(guardado.headers);
          cabeceras.set("X-Desde-Cache", "1");
          return new Response(cuerpo, { status: 200, headers: cabeceras });
        }),
    );
    return;
  }

  // Navigations: network first so a deploy is visible immediately; the cached
  // shell only appears when the network actually failed.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          event.waitUntil(caches.open(SHELL).then((c) => c.put("/", copy)).catch(() => {}));
          return res;
        })
        .catch(async () => {
          const hit = await caches.match("/", { ignoreSearch: true });
          return (
            hit ||
            new Response(
              "<!doctype html><meta charset=utf-8><title>Sin conexión</title>" +
                "<body style='font:16px system-ui;padding:2rem;background:#2b2258;color:#fff'>" +
                "<h1>Sin conexión</h1><p>No hemos podido cargar la plataforma y no hay copia guardada todavía. " +
                "Vuelve a intentarlo cuando tengas red.</p>",
              { headers: { "content-type": "text/html; charset=utf-8" } },
            )
          );
        }),
    );
    return;
  }

  // Hashed build output: safe to serve from disk forever (rule 2).
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {}));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else: network wins, cache is the parachute — but only for things
  // worth keeping. The first version cached every same-origin GET, and the
  // browser showed what that means: Vite's dev modules, a user's uploaded photo
  // and a multi-megabyte GeoJSON all landed in the cache. An unbounded cache is
  // a disk leak the user cannot see, so this keeps a whitelist and a ceiling.
  const cacheable =
    req.destination === "image" ||
    req.destination === "style" ||
    req.destination === "font";

  if (!cacheable) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          event.waitUntil(
            caches
              .open(MEDIA)
              .then(async (c) => {
                await c.put(req, copy);
                await recortar(c, MAX_MEDIA);
              })
              .catch(() => {}),
          );
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});

// Oldest-first trim. Crude on purpose: the Cache API has no size or date, so the
// insertion order of keys() is the only signal available without keeping a
// parallel index that could drift out of sync with the cache itself.
async function recortar(cache, maximo) {
  const claves = await cache.keys();
  if (claves.length <= maximo) return;
  for (const k of claves.slice(0, claves.length - maximo)) {
    await cache.delete(k);
  }
}
