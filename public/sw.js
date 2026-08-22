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
 * 3. NO `skipWaiting()`. A new worker waits for every tab to close before taking
 *    over. Swapping the code under a running app mid-session mixes old HTML with
 *    new assets, which is the classic way a PWA breaks in a way nobody can
 *    reproduce. Slower to roll out, impossible to corrupt.
 *
 * KILL SWITCH: loading any page with `?sw=off` unregisters this worker and wipes
 * its caches. A bad service worker is the one bug a user cannot clear by
 * reloading, so there has to be a way out that does not need a developer.
 */

const VERSION = "hw-v3";
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
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/logo.svg",
  "/iconos/icono-180.png",
  "/iconos/icono-192.png",
  "/iconos/icono-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) =>
      // addAll fails the whole install if one file 404s. Individual puts mean a
      // missing icon degrades the cache instead of leaving the app with none.
      Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { cache: "no-store" })
            .then((r) => (r.ok ? c.put(url, r) : null))
            .catch(() => null),
        ),
      ),
    ),
  );
});

// The home screen's own data. Warmed once, on activate, for one reason: a
// service worker does not control the page that installs it, so every request
// the app fires on that first visit goes straight past this file and is never
// copied. Without the warm-up the platform only survives an aeroplane from the
// *second* visit on — and the first visit is exactly when somebody adds it to
// their home screen and then tries it. Three requests, once per version.
const CALENTAR = ["/api/publicaciones", "/api/proyectos", "/api/circulos"];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();

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
          if (res.ok) {
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
