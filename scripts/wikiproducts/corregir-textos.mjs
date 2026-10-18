#!/usr/bin/env node
// ============================================================================
// CORRECT A SENTENCE ON A SITE PAGE, AND SHOW WHAT THE PAGES SAY (2026-10-18, W3a)
// ============================================================================
// Some of the site's pages were written by hand in the editor, so their text
// lives only in production. `datos/textos.json` says:
//   · `cambios`: on page «pagina» (by title), replace «buscar» with «cambiar»
//     in the text block that contains it. Through
//     PATCH /api/v1/pages/:id/blocks/:blockId: one block, nothing else moves.
//     A sentence already corrected is not found again, so it runs every time.
//   · `informe`: pages whose text is printed to the log, so the people who
//     cannot open production can read what it says (they are public pages).
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/corregir-textos.mjs [--base …] [--seco]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const BASE = (opcion('--base', process.env.HW_BASE || process.env.HW_URL || 'http://localhost:3000')).replace(/\/$/, '');
const CLAVE = process.env.HW_API_KEY;
const SECO = args.includes('--seco');
if (!CLAVE) { console.error('Falta HW_API_KEY (una clave hw_live_… con alcance de escritura).'); process.exit(1); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const textos = JSON.parse(readFileSync(path.join(dir, 'datos', 'textos.json'), 'utf8'));

async function api(metodo, ruta, cuerpo) {
  if (SECO && metodo !== 'GET') { console.log(`  (seco) ${metodo} ${ruta}`); return {}; }
  for (let intento = 0; intento < 8; intento++) {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (r.status === 429) {
      const s = Number(r.headers.get('retry-after')) || 10;
      process.stdout.write(`  … límite de la API, espero ${s} s\n`);
      await new Promise(ok => setTimeout(ok, s * 1000));
      continue;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status}: ${j.error || JSON.stringify(j)}`);
    return j;
  }
  throw new Error(`${metodo} ${ruta}: demasiados reintentos`);
}

const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const todos = l => (Array.isArray(l) ? l : []).flatMap(b => [b, ...todos(b?.bloques)]);

// Every page the key's owner can see, by title.
const paginas = [];
for (let cursor = null, n = 0; n < 30; n++) {
  const r = await api('GET', `/api/v1/pages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
  paginas.push(...r.data);
  cursor = r.next_cursor; if (!cursor) break;
}
const porTitulo = t => paginas.filter(p => normal(p.title) === normal(t));

const fallos = [];
let hechos = 0;
console.log('== Correcciones de texto ==');
for (const c of textos.cambios || []) {
  const ps = porTitulo(c.pagina);
  if (!ps.length) { fallos.push(`no encuentro la página «${c.pagina}»`); continue; }
  let visto = false;
  for (const p of ps) {
    const pg = await api('GET', `/api/v1/pages/${p.id}`);
    for (const b of todos(pg.blocks)) {
      if (typeof b?.texto !== 'string') continue;
      if (b.texto.includes(c.cambiar) && !b.texto.includes(c.buscar)) { visto = true; continue; }
      if (!b.texto.includes(c.buscar)) continue;
      visto = true;
      try {
        await api('PATCH', `/api/v1/pages/${p.id}/blocks/${b.id}`, { text: b.texto.split(c.buscar).join(c.cambiar) });
        hechos++;
        console.log(`  ~ ${p.title}: «${c.buscar}» → «${c.cambiar}»`);
      } catch (e) { fallos.push(`${p.title}: ${e.message}`); }
    }
  }
  if (!visto) console.log(`  · ${c.pagina}: no dice «${c.buscar}» (nada que cambiar)`);
}

console.log('\n== Lo que dicen las páginas (para leerlas sin abrir producción) ==');
for (const t of textos.informe || []) {
  const ps = porTitulo(t);
  if (!ps.length) { console.log(`\n--- «${t}»: no hay ninguna página con ese título`); continue; }
  for (const p of ps) {
    const pg = await api('GET', `/api/v1/pages/${p.id}`);
    console.log(`\n--- «${p.title}» (${p.id}) ---\n${String(pg.markdown || '').slice(0, 6000)}`);
  }
}

console.log(`\nHecho: ${hechos} textos corregidos, ${fallos.length} fallos.`);
if (fallos.length) { for (const f of fallos) console.log(`  ✗ ${f}`); process.exit(1); }
