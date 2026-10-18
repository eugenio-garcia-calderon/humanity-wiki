#!/usr/bin/env node
// ============================================================================
// THE PUBLIC SITE, AS FILES, FOR THE LOCAL COPY (2026-10-18, W3a for W7)
// ============================================================================
// The evaluator (W7) rebuilds Wikiproducts on its own machine and cannot reach
// production or the shops' photos. `exportar-en-servidor.sh` reads the site's
// public pages and the product rows' photo cells straight from the database
// (read-only) and pipes them here as one JSON on stdin. This writes, into
// the folder given as the first argument:
//   paginas.json  { knowledge_windows, sitio_config, sitio_categorias,
//                   sitio_restricciones, dominios_paginas }
//   fotos.json    [{ tabla, nombre, archivo, mime, credito }]
//   fotos/        a copy of each stored photo, named as in `archivo`
// Only public site content. Who made what (user ids), the domain's owner and
// anything that looks like a token or secret are dropped here, a second time
// after the SQL, so a column added later cannot leak by default.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const salida = process.argv[2];
if (!salida) { console.error('Uso: node exportar.mjs <carpeta> < datos.json'); process.exit(1); }
const UPLOADS = process.env.UPLOADS_DIR || '/data/uploads';
const dir = path.dirname(fileURLToPath(import.meta.url));
const esquema = JSON.parse(readFileSync(path.join(dir, 'esquema-bd.json'), 'utf8'));
const claveDe = new Map(esquema.tablas.map(t => [t.titulo, t.clave]));

const entrada = JSON.parse(readFileSync(0, 'utf8'));

// Columns of a row that say who someone is, never site content.
const PERSONAL = /^(creator_user_id|created_by|updated_by|creado_por|invitado_por|propietario_user_id|user_id|email)$/i;
// Anywhere in a row: what looks like a credential.
const SECRETO = /(token|secret|password|contrase|api_?key|huella|stripe)/i;
const limpio = (v, arriba = false) => {
  if (Array.isArray(v)) return v.map(x => limpio(x));
  if (!v || typeof v !== 'object') return v;
  const o = {};
  for (const [k, x] of Object.entries(v)) {
    if (SECRETO.test(k) || (arriba && PERSONAL.test(k))) continue;
    o[k] = limpio(x);
  }
  return o;
};
const filas = l => (Array.isArray(l) ? l : []).map(r => limpio(r, true));

mkdirSync(path.join(salida, 'fotos'), { recursive: true });
const paginas = {
  knowledge_windows: filas(entrada.knowledge_windows),
  sitio_config: filas(entrada.sitio_config),
  sitio_categorias: filas(entrada.sitio_categorias),
  sitio_restricciones: filas(entrada.sitio_restricciones),
  dominios_paginas: filas(entrada.dominios_paginas),
};
writeFileSync(path.join(salida, 'paginas.json'), JSON.stringify(paginas, null, 2) + '\n');

// A photo is ours when the cell points at /uploads/<year>/<month>/<uuid>.<ext>;
// `privado/` (paid downloads) never matches.
const NUESTRA = /\/uploads\/(\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif|gif))$/i;
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif' };
const fotos = [], sin = [];
for (const f of entrada.fotos || []) {
  const m = NUESTRA.exec(String(f.url || ''));
  const tabla = claveDe.get(f.tabla_titulo) || f.tabla_titulo;
  if (!m) { sin.push(`${tabla} · ${f.nombre}`); continue; }
  const origen = path.join(UPLOADS, m[1]);
  if (!existsSync(origen)) { sin.push(`${tabla} · ${f.nombre} (falta el fichero)`); continue; }
  const archivo = m[1].replace(/\//g, '-');
  copyFileSync(origen, path.join(salida, 'fotos', archivo));
  fotos.push({ tabla, nombre: f.nombre, archivo, mime: MIME[m[2].toLowerCase()], credito: f.credito || null });
}
writeFileSync(path.join(salida, 'fotos.json'), JSON.stringify(fotos, null, 2) + '\n');

console.error(`Páginas: ${paginas.knowledge_windows.length} · sitio_config: ${paginas.sitio_config.length} · dominios: ${paginas.dominios_paginas.length}`);
console.error(`Fotos: ${fotos.length} copiadas; ${sin.length} filas sin foto nuestra${sin.length ? ': ' + sin.slice(0, 20).join('; ') : ''}`);
