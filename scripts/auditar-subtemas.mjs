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
// Sobre los 1080, con las dos preguntas: **141 grupos, 105 parejas marcadas por
// parecido, de las que 45 quedan arriba como posibles copias y 60 bajan por
// parecer cortes.**
//
// La segunda pregunta —la regla de la partición, de prog8— **reduce a la mitad
// lo que hay que leer primero, y no mejora la puntería**. Entre esas 45 sigue
// habiendo cosas que no son copias: «Drenaje urbano» contra «Infraestructura de
// riego», «Ganadería intensiva» contra «Bienestar animal». Lo que ha mejorado
// es el ORDEN, no el criterio, y conviene no confundir las dos cosas.
//
// De la primera pasada, con una sola pregunta, salían 120 arriba. Mirando el
// informe a mano:
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

/**
 * ── LA SEGUNDA PREGUNTA: ¿ES UNA PARTICIÓN O UNA COPIA? (2026-08-25) ─────────
 *
 * La regla es de prog8, y es la mejor cosa que ha salido de esta auditoría.
 * Pasó el auditor por su objetivo y de las cuatro parejas marcadas, tres eran
 * falsas — y las tres tenían **la misma forma exacta**:
 *
 *     «Fabricación en Asia»          contra  «Fabricación en Europa»
 *     «Carga familiar»               contra  «Reparto urbano»
 *     «Aviación de corta distancia»  contra  «Aviación regional»
 *
 * Comparten el sustantivo y se diferencian en un calificativo que nombra **dos
 * valores distintos de un mismo eje**: geografía, uso, alcance.
 *
 * Y eso es lo CONTRARIO de un duplicado. Clasificar es trazar una raya, y los
 * dos lados de una raya siempre se parecen: comparten todo menos aquello por lo
 * que se separan. Un auditor que mide parecido marca toda raya bien trazada —
 * y cuanto mejor esté trazada, más la marca.
 *
 * «Desalación» y «Desalinización» no tienen eje: son la misma palabra dos
 * veces. «Asia» y «Europa» sí lo tienen.
 *
 * Así que a cada pareja marcada se le hace una segunda pregunta, y ésta va
 * sola: sin la lista de hermanos alrededor y sin la palabra «duplicado»
 * delante, para que no arrastre la respuesta de antes.
 *
 * ── PERO NO DESCARTA: ETIQUETA. Y ESO SE DECIDIÓ MIDIENDO ──────────────────
 * La primera versión tiraba a la basura lo que saliera CORTE. Calibrado contra
 * nueve parejas revisadas a mano: **7 de 9**, y uno de los dos fallos fue
 * llamar CORTE a «Refrigeración y congelación» contra «Conservación en frío
 * controlado», que es una copia de manual.
 *
 * O sea que descartando se pierden duplicados de verdad, en silencio — un
 * auditor que esconde justo lo que busca es peor que uno ruidoso. Así que las
 * parejas siguen todas en el informe, con su etiqueta, y las COPIA salen
 * primero. La mejora no es filtrar: es **ordenar**, que baja el trabajo de
 * quien lee sin decidir por él.
 */
async function esUnaParticion(a, b) {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return false;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8,
        system: [
          'Te doy dos temas hermanos de una clasificación. Decides si son un CORTE o una COPIA.',
          'CORTE: comparten el asunto y se diferencian en dos valores excluyentes de un mismo eje',
          '  (dónde, cuándo, para quién, de qué tamaño, en qué fase). Ejemplos de corte:',
          '  «Fabricación en Asia» y «Fabricación en Europa»; «Vivienda urbana» y «Vivienda rural»;',
          '  «Prevención» y «Tratamiento»; «Corto plazo» y «Largo plazo».',
          'COPIA: dicen lo mismo con otras palabras y sobra uno. Ejemplos de copia:',
          '  «Desalación» y «Desalinización»; «Refrigeración» y «Conservación en frío».',
          'Contesta SOLO una palabra: CORTE o COPIA.',
        ].join('\n'),
        messages: [{ role: 'user', content: `1. ${a}\n2. ${b}` }],
      }),
    });
    if (!r.ok) return false;
    const j = await r.json();
    return /CORTE/i.test(String(j.content?.[0]?.text || ''));
  } catch { return false; }
}

const objetivos = await pool.query(`SELECT id, title FROM objectives WHERE archived_at IS NULL ORDER BY id`);
let grupos = 0, marcadas = 0, cortes = 0, sospechas = 0;
const informe = [];

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
      marcadas++;
      const corte = await esUnaParticion(a.nombre, b.nombre);
      if (corte) cortes++; else sospechas++;
      // Nada se tira: se guarda con su etiqueta y al final salen las copias
      // primero. Ver la nota de `esUnaParticion`.
      informe.push({ corte, texto:
        `${corte ? '· corte ' : '¿COPIA?'}  ${o.title} › ${nombrePadre}\n` +
        `    «${a.nombre}»  [${a.creador_user_id}]\n` +
        `    «${b.nombre}»  [${b.creador_user_id}]\n` });
    }
  }
  process.stderr.write(`${o.title} `);
}
// Las dudosas primero: es lo único que hace este informe por quien lo lee.
for (const l of informe.filter(x => !x.corte)) console.log(l.texto);
console.log('\n──────── y estas parecen cortes, no copias ────────\n');
for (const l of informe.filter(x => x.corte)) console.log(l.texto);
console.error(`\n\n${grupos} grupos. ${marcadas} marcadas por parecido: ${sospechas} podrían ser copias, ${cortes} parecen cortes.`);
await pool.end();
