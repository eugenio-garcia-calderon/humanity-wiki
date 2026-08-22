/*
 * SERVICE WORKER (2026-08-22, Programador 3)
 *
 * What this buys: the platform opens without a network. The shell, the built
 * assets and the icons come from disk, so a phone in a lift or a plane still
 * gets the app instead of the dinosaur.
 *
 * BEFORE YOU CHANGE THIS, DECIDE — the three rules that matter:
 *
 * 1. `/api/*` IS NEVER CACHED. Not "cached briefly", never. A cached API answer
 *    is a stale number shown as if it were live, and this project has spent two
 *    nights killing exactly that: a thing that claims to be true when it is not.
 *    Offline you get a clean network error, which the app can say out loud.
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

const VERSION = "hw-v2";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const MEDIA = `${VERSION}-media`;
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

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // third parties are theirs
  if (url.pathname.startsWith("/api/")) return; // rule 1: never
  if (url.searchParams.has("sw") && url.searchParams.get("sw") === "off") return;

  // Navigations: network first so a deploy is visible immediately; the cached
  // shell only appears when the network actually failed.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("/", copy));
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
              caches.open(ASSETS).then((c) => c.put(req, copy));
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
          caches.open(MEDIA).then(async (c) => {
            await c.put(req, copy);
            await recortar(c, MAX_MEDIA);
          });
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
