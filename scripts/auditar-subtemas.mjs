#!/usr/bin/env node
// ============================================================================
// BUSCAR SINÓNIMOS EN EL ÁRBOL SEMBRADO (2026-08-25)
// ============================================================================
// La siembra de `0121` y `0123` entró **por SQL directo**, no por
// `POST /api/temas`. Y ahí está el agujero: el desempatador que compara
// significados vive en esa ruta, así que los 1080 nombres nunca pasaron por él.
//
// Lo encontró prog8 en su objetivo: «Cicloturismo y micormovilidad» (mío, y con
// una errata) y «Movilidad eléctrica ligera» (suyo) son el mismo campo. Mi
// propio comentario en `0120` dice que un árbol común se degrada por sinónimos
// y no por vandalismo — y la puerta que puse para evitarlo tenía al lado una
// ventana abierta que era la propia semilla.
//
// Esto NO borra nada. Lee, pregunta y escribe un informe. Fundir dos temas es
// decidir cuál se queda y a dónde van sus hijos, y eso no lo hace un script a
// las tres de la mañana.
//
// ── LO QUE DA, MEDIDO: UNA LISTA PARA MIRAR, NO PARA OBEDECER ───────────────
// Primera pasada sobre los 1080: **120 parejas sospechosas en 142 grupos**. Eso
// no es un árbol lleno de duplicados, es un auditor que salta con cualquier
// parecido. Mirando el informe a mano:
//
//   · lo encontró de verdad — «Movilidad eléctrica ligera» contra
//     «Cicloturismo y micormovilidad», que era el caso conocido; y
//     «Refrigeración y congelación» contra «Conservación en frío controlado»;
//   · y marcó como iguales cosas que no lo son — «Conflictos armados y
//     refugiados» contra «Persecución por identidad», que son dos causas
//     distintas de lo mismo.
//
// O sea: **encuentra los reales y los entierra entre falsos**. Sirve para que
// una persona repase 120 parejas en vez de 1080 nombres, y para nada más. Si
// algún día se quiere que decida sola, primero hay que hacerle bajar esa cifra
// — y comprobarlo contra un puñado revisado a mano, no contra la sensación de
// que ahora acierta más.
//
//   node --env-file=.env scripts/auditar-subtemas.mjs > informe.txt
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

async function parejasQueSobran(hermanos, contexto) {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) throw new Error('Falta ANTHROPIC_API_KEY');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: [
        'Te doy una lista de temas hermanos de una enciclopedia. Buscas SOLO los que sobran por decir lo mismo.',
        'Dos temas dicen lo mismo cuando quien busca uno esperaría encontrar el otro.',
        'Estar relacionados NO basta: «Riego» y «Sequía» se tocan y son distintos.',
        'Ser uno parte del otro NO basta: «Riego» y «Riego por goteo» son distintos.',
        'Contesta una línea por pareja, con el formato: numero,numero',
        'Si no sobra ninguno, contesta exactamente: NINGUNO',
      ].join('\n'),
      messages: [{ role: 'user', content: `${contexto}\n\n` + hermanos.map((h, i) => `${i + 1}. ${h.nombre}`).join('\n') }],
    }),
  });
  if (!r.ok) throw new Error(`la IA ha contestado ${r.status}`);
  const j = await r.json();
  const texto = String(j.content?.[0]?.text || '').trim();
  if (/^NINGUNO/i.test(texto)) return [];
  return texto.split('\n').map(l => {
    const m = l.match(/(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    const a = hermanos[Number(m[1]) - 1], b = hermanos[Number(m[2]) - 1];
    return a && b && a.id !== b.id ? [a, b] : null;
  }).filter(Boolean);
}

const objetivos = await pool.query(`SELECT id, title FROM objectives WHERE archived_at IS NULL ORDER BY id`);
let grupos = 0, sospechas = 0;

for (const o of objetivos.rows) {
  const todos = await pool.query(
    `SELECT id, padre_id, nombre, creador_user_id FROM subtemas
      WHERE objetivo_id = $1 AND archived_at IS NULL ORDER BY orden`, [o.id]);
  const porPadre = new Map();
  for (const s of todos.rows) {
    const k = s.padre_id || '(raíz)';
    if (!porPadre.has(k)) porPadre.set(k, []);
    porPadre.get(k).push(s);
  }
  for (const [padre, hermanos] of porPadre) {
    if (hermanos.length < 2) continue;
    grupos++;
    const nombrePadre = padre === '(raíz)' ? o.title : (todos.rows.find(x => x.id === padre)?.nombre || padre);
    let parejas = [];
    try { parejas = await parejasQueSobran(hermanos, `Dentro de: ${o.title} › ${nombrePadre}`); }
    catch (e) { console.error(`! ${o.title} / ${nombrePadre}: ${e.message}`); continue; }
    for (const [a, b] of parejas) {
      sospechas++;
      console.log(`${o.title} › ${nombrePadre}`);
      console.log(`    «${a.nombre}»  [${a.creador_user_id}]`);
      console.log(`    «${b.nombre}»  [${b.creador_user_id}]`);
      console.log('');
    }
  }
  process.stderr.write(`${o.title} `);
}
console.error(`\n\n${grupos} grupos mirados, ${sospechas} parejas sospechosas.`);
await pool.end();
