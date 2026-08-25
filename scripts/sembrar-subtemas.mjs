#!/usr/bin/env node
// ============================================================================
// SEMBRAR EL ÁRBOL DE TEMAS (2026-08-25)
// ============================================================================
// Eugenio: «añade los 8 subtemas dentro de cada tema, y luego 8 subsubtemas
// dentro de cada subtema».
//
// Son 14 × 8 = 112 subtemas y 112 × 8 = 896 debajo. Mil ocho nombres.
//
// ── POR QUÉ NO LOS ESCRIBO YO A MANO ────────────────────────────────────────
// Porque serían mil nombres inventados por alguien que no es experto en
// catorce campos distintos, y este árbol es la clasificación COMÚN de la
// plataforma: lo que salga aquí es lo que verá todo el mundo y lo que
// condicionará dónde se guarda cada cosa. Escribirlos a mano deprisa sería
// llenar la casa de muebles malos por tenerla amueblada.
//
// Se le piden al modelo, por objetivo, y se guarda lo que devuelve. Ahí
// tampoco hay magia: es una primera versión razonable que la gente irá
// corrigiendo — que es exactamente lo que Eugenio decidió al elegir «cualquiera
// propone, sin revisión».
//
// ── SE PUEDE VOLVER A EJECUTAR, Y ESO COSTÓ UN ARREGLO ──────────────────────
// La primera versión decía esto mismo y era MENTIRA. El índice único impide
// dos hermanos con el mismo nombre, sí — pero al modelo se le vuelve a
// preguntar y contesta **ocho nombres distintos**, así que la segunda pasada no
// chocaba con nada: añadía otros ocho. Visto en la rueda: AGUA se quedó con
// dieciséis trozos finísimos mientras sus vecinas tenían tres.
//
// Lo que hace falta no es comparar nombres, es contar antes de preguntar: si
// ese padre ya tiene ocho hijos, no se le pide nada a nadie. Así relanzarlo es
// gratis y sigue exactamente donde se cortó.
//
//   node --env-file=.env scripts/sembrar-subtemas.mjs            # los 14
//   node --env-file=.env scripts/sembrar-subtemas.mjs O001       # sólo uno
//   node --env-file=.env scripts/sembrar-subtemas.mjs --solo-primer-nivel
import pg from 'pg';

const OBJETIVOS = [
  ['O001', 'AGUA'], ['O002', 'ALIMENTACIÓN'], ['O003', 'VIVIENDA'], ['O004', 'SALUD'],
  ['O005', 'CONVIVENCIA'], ['O006', 'ECOSISTEMAS'], ['O007', 'EDUCACIÓN'], ['O008', 'MOVILIDAD'],
  ['O009', 'ENERGÍA'], ['O010', 'TECNOLOGÍA'], ['O011', 'EMPLEO'], ['O012', 'GOBERNANZA'],
  ['O013', 'ECONOMÍA'], ['O014', 'CULTURA'],
];

const clave = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const nuevoId = () => `ST_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

/** ¿Cuántos hijos tiene ya? Es lo que hace que relanzar esto no añada otra
 *  tanda: ver la nota de arriba. */
async function cuantosHijos(objetivo, padre) {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM subtemas
      WHERE archived_at IS NULL AND coalesce(padre_id,'') = coalesce($1,'')
        AND ($1 IS NOT NULL OR objetivo_id = $2)`,
    [padre, objetivo]);
  return r.rows[0].n;
}

async function pedirOcho(padre, contexto) {
  const clave_api = process.env.ANTHROPIC_API_KEY;
  if (!clave_api) throw new Error('Falta ANTHROPIC_API_KEY');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': clave_api,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: [
        'Divides un tema en ocho subtemas para una enciclopedia colaborativa sobre los retos del planeta.',
        'Los ocho tienen que CUBRIR el tema entre todos y no solaparse entre sí.',
        'En español, 1 a 4 palabras cada uno, sin numerar, sin explicar, sin comillas.',
        'Nada de nombres genéricos como «Otros», «General», «Varios» o «Introducción».',
        'Contesta SOLO los ocho, uno por línea.',
      ].join('\n'),
      messages: [{ role: 'user', content: contexto ? `Tema: ${padre}\nDentro de: ${contexto}` : `Tema: ${padre}` }],
    }),
  });
  if (!r.ok) throw new Error(`la IA ha contestado ${r.status}`);
  const j = await r.json();
  return String(j.content?.[0]?.text || '')
    .split('\n').map(l => l.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter(l => l.length > 1 && l.length < 60)
    .slice(0, 8);
}

const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

// El autor. No se pone el de una persona: este árbol no lo ha escrito nadie en
// concreto y firmar con la cuenta de alguien sería atribuirle mil decisiones
// que no ha tomado.
const AUTOR = 'SEMILLA';

async function meter(objetivo, padre, nombre, orden) {
  const k = clave(nombre);
  if (!k) return null;
  const y = await pool.query(
    `SELECT id FROM subtemas WHERE archived_at IS NULL AND nombre_clave = $1
       AND coalesce(padre_id,'') = coalesce($2,'') AND ($2 IS NOT NULL OR objetivo_id = $3)`,
    [k, padre, objetivo]);
  if (y.rows.length) return y.rows[0].id;
  const id = nuevoId();
  try {
    await pool.query(
      `INSERT INTO subtemas (id, objetivo_id, padre_id, nombre, nombre_clave, creador_user_id, orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, objetivo, padre, nombre, k, AUTOR, orden]);
    return id;
  } catch (e) {
    if (e.code === '23505') return null;   // otro lo puso mientras tanto
    throw e;
  }
}

const args = process.argv.slice(2);
const soloPrimerNivel = args.includes('--solo-primer-nivel');
const soloUno = args.find(a => /^O\d{3}$/.test(a));
const lista = soloUno ? OBJETIVOS.filter(([id]) => id === soloUno) : OBJETIVOS;

let creados = 0;
for (const [id, titulo] of lista) {
  process.stdout.write(`\n${titulo} `);
  if (await cuantosHijos(id, null) >= 8) { process.stdout.write('(ya estaba)'); continue; }
  let ochos;
  try { ochos = await pedirOcho(titulo, null); }
  catch (e) { console.log('· la IA ha fallado:', e.message); continue; }

  for (let i = 0; i < ochos.length; i++) {
    const hijo = await meter(id, null, ochos[i], i);
    if (!hijo) { process.stdout.write('='); continue; }
    creados++; process.stdout.write('·');
    if (soloPrimerNivel) continue;
    if (await cuantosHijos(id, hijo) >= 8) { process.stdout.write('='); continue; }
    let nietos;
    try { nietos = await pedirOcho(ochos[i], titulo); }
    catch { process.stdout.write('!'); continue; }
    for (let k = 0; k < nietos.length; k++) {
      if (await meter(id, hijo, nietos[k], k)) creados++;
    }
  }
}
console.log(`\n\n${creados} temas nuevos.`);
await pool.end();
