#!/usr/bin/env node
/*
 * STAMP THE BUILD INTO THE SERVICE WORKER (2026-08-22, Programador 3)
 *
 * THE PROBLEM THIS SOLVES. A browser only re-installs a service worker when the
 * bytes of `sw.js` change. `public/sw.js` is a static file, so a normal deploy —
 * which changes the app bundle, never the worker — produced a byte-identical
 * worker and the browser had no reason to look again. Result: a phone with the
 * app installed could sit on the version from three deploys ago, and the only
 * way out was asking a person to type `?sw=off` into Safari. Eugenio's words:
 * «es un apaño, yo quiero que funcione sin esa url cutre». He is right.
 *
 * WHAT THIS DOES. After the build, append the name of the freshly built app
 * bundle to `dist/sw.js`. That name carries a content hash, so:
 *
 *   - deploy that changes nothing  → same bundle name → same worker → no churn
 *   - deploy that changes the app  → new bundle name  → new worker  → the
 *     browser installs it on the next navigation, and its `activate` throws away
 *     the stale code caches and reloads the open tabs
 *
 * The worker becomes the thing that repairs a stuck install, and it needs no
 * cooperation from the old code already running on the phone — which is the
 * whole point, because that old code is precisely what cannot be trusted to
 * update itself.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const sw = join(dist, "sw.js");

/*
 * THE ENTRY BUNDLE, READ FROM `index.html` AND NOT FROM THE DIRECTORY.
 *
 * The first version listed `dist/assets/` and took the first `index-*.js` it
 * found. Caught on the very first build: there were two — the real entry, and a
 * chunk that happens to come from a module called `index`. It picked the chunk.
 * A stamp taken from a file the page never loads would sit there unchanged
 * across deploys, so the worker would never change, so nothing would ever
 * update — and it would all look perfectly healthy. `index.html` is the only
 * place that says which file the browser actually runs.
 */
const html = readFileSync(join(dist, "index.html"), "utf8");
// Todo lo que la página carga de arranque: el módulo de entrada, sus
// precargas, y la hoja de estilos. Sin la hoja, sin conexión la aplicación
// abriría desnuda; sin el módulo, en blanco.
const arranque = [...new Set(
  [...html.matchAll(/["'](\/assets\/[A-Za-z0-9._-]+\.(?:js|css))["']/g)].map((m) => m[1]),
)];
const entrada = arranque.find((f) => /\/assets\/index-.*\.js$/.test(f));

if (!entrada) {
  console.error("sellar-sw: dist/index.html no referencia ningún /assets/index-*.js — ¿ha corrido vite build?");
  process.exit(1);
}

const original = readFileSync(sw, "utf8");

/*
 * Dos cosas de una: `BUILD` le dice al worker QUÉ guardar en la instalación
 * —sin esto la primera visita se queda sin el código de la aplicación y sin
 * conexión abre en blanco— y, como su contenido cambia en cada compilación,
 * también hace que `sw.js` cambie, que es lo único que hace al navegador
 * reinstalarlo. Detección de versión y precarga con la misma línea.
 */
const lista = JSON.stringify(arranque);
const conBuild = original.replace(/^const BUILD = \[.*?\];$/m, `const BUILD = ${lista};`);

if (conBuild === original) {
  console.error("sellar-sw: no encuentro la línea `const BUILD = [];` en sw.js. ¿La han quitado?");
  process.exit(1);
}

// Idempotent: re-running the stamp replaces the line instead of stacking them.
const limpio = conBuild.replace(/\n\/\/ BUILD: .*\n?$/, "\n");
writeFileSync(sw, `${limpio}\n// BUILD: ${entrada}\n`);

console.log(`sellar-sw: ${arranque.length} ficheros de arranque sellados (entrada: ${entrada})`);
