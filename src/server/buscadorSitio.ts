// ============================================================================
// EL BUSCADOR DE UN SITIO PUBLICADO (2026-10-18, Wikiproducts W2, plan 3.8)
// ============================================================================
// El buscador de la plataforma busca en TODO humanity.wiki y el menú de un
// sitio publicado no tenía ninguno. Wikiproducts es una enciclopedia de
// productos: buscar es lo primero que se hace en ella.
//
// `GET /api/sitio/buscar?sitio=<página raíz>&q=<texto>` busca SÓLO dentro del
// sitio: la página raíz, sus subpáginas y las filas de las bases de datos que
// enseña (cada fila es una página), por su título, por los valores de sus
// columnas (marca, modelo, código de barras…) y por el texto de sus bloques.
//
// ── LO QUE NO SE ENSEÑA NO SE ENCUENTRA ────────────────────────────────────
// Se baja desde la raíz por el mismo camino que el sitemap, pero sin entrar en
// lo que es de miembros (`sitio_restricciones`: la página entera o el bloque),
// y no se mira dentro de las columnas que su autor ocultó siempre. Cada
// resultado se vuelve a comprobar con `paginaVisible`. Una búsqueda que
// encuentra lo que la página esconde es una forma de leerlo.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bloquesDe } from './bloquesSql';
import { paginaVisible, descripcionDe } from './sitios';
import { filtrarBloques } from './miembros.js';
import { registrarHtml, esc } from './htmlBloques.js';
import { CLASES_TARJETA, CLASES_COMPACTA, CLASES_GRUPOS, CARGA_INMEDIATA, agruparSecciones } from '../components/sitio/tarjetaSeccion';
import { celdasDe } from './bd/celdas';
import { calcularTabla } from './bd/calculo';
import { rolDe, columnasDestacadas, textoDe, etiquetaColumna } from '../components/bloquesDatos/ficha/modelo';
import { formatear } from '../utils/formatoCelda';

/** Cuántos niveles de página dentro de página (como `sitios.ts`). */
const PROFUNDIDAD = 8;
/** Resultados por página (ronda 3 del evaluador: «escribe algo más concreto»
 *  no era una forma de ver más; ahora se pasa de página). */
const POR_PAGINA = 20;

/** Minúsculas y sin acentos, en SQL: «Batería» encuentra «bateria». Sin la
 *  extensión `unaccent`, que pide permisos de superusuario (ver 0141). */
const plano = (x: any) => sql`translate(lower(${x}), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc')`;
const planoJs = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Todos los `texto` de un árbol de bloques. */
function textos(config: any): string[] {
  const out: string[] = [];
  const recorre = (l: any) => { for (const b of Array.isArray(l) ? l : []) {
    if (typeof b?.texto === 'string') out.push(b.texto);
    recorre(b?.bloques);
    if (Array.isArray(b?.columnas)) for (const c of b.columnas) recorre(c?.bloques);
  } };
  recorre(config?.bloques);
  if (typeof config?.subtitulo === 'string') out.push(config.subtitulo);
  return out;
}


// ── ERRATAS Y SINÓNIMOS (2026-10-18, ronda 1 del evaluador) ────────────────
// «powerbak» no encontraba nada aunque había 23 powerbanks, y «placa» no
// encontraba los paneles. Ahora cada palabra se busca por separado (en
// cualquier orden y en cualquier parte de la página) y vale cualquiera de:
//   · la escrita, sin plural («paneles» → «panel»);
//   · si no sale en ningún título del sitio, la que sí sale y más se le parece
//     (una letra de diferencia en palabras de 4–5 letras, dos a partir de
//     6). Lo que se corrige se dice: «Mostrando resultados de "powerbank"»;
//   · sus SINONIMOS («placa» → «panel»); los de varias palabras cambian la
//     frase entera («batería externa» → «powerbank»).
// Si aun así no hay nada, la respuesta trae las secciones del sitio (las
// páginas que enseñan un catálogo de fichas) para que nadie se quede en una
// página vacía.

/** Palabras que en una tienda de energía quieren decir lo mismo. Sin acentos. */
const SINONIMOS: string[][] = [
  ['placa', 'panel', 'modulo'],
  ['powerbank', 'power bank', 'bateria externa', 'bateria portatil', 'cargador portatil'],
  ['estacion de energia', 'estacion portatil', 'generador solar'],
  ['bateria', 'acumulador'],
  ['luz', 'luces', 'lampara', 'farol', 'foco'],
  ['fotovoltaico', 'fotovoltaica', 'solar'],
  ['inversor', 'ondulador'],
];

/** Distancia de edición, con corte: deja de contar al pasar de `tope`. */
function distancia(a: string, b: string, tope: number): number {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < min) min = cur[j];
    }
    if (min > tope) return tope + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** La raíz de una palabra sin el plural: «paneles» → «panel», «placas» →
 *  «placa». Como se busca por trozo, la raíz encuentra también el plural. */
const raizDe = (w: string) => w.length >= 6 && w.endsWith('es') ? w.slice(0, -2) : w.length >= 5 && w.endsWith('s') ? w.slice(0, -1) : w;

/** Una búsqueda, ya entendida: cada forma de leerla es una lista de palabras,
 *  y cada palabra, los trozos que valen por ella. Encaja la página que tiene,
 *  en alguna forma, todas las palabras (en el título, en sus datos o en su
 *  texto, da igual dónde y en qué orden). */
export type Lectura = string[][];

/** Las formas de leer `q` y la corrección, si la hubo. */
export function variantes(q: string, vocabulario: Map<string, number>): { lecturas: Lectura[]; corregido: string | null } {
  const conocida = (w: string) => vocabulario.has(w) || vocabulario.has(raizDe(w))
    || [...vocabulario.keys()].some(v => v.startsWith(raizDe(w)) && raizDe(w).length >= 4)
    || SINONIMOS.some(g => g.some(x => x === w || x === raizDe(w)));
  // 1. Erratas: cada palabra desconocida, por la conocida más cercana.
  const corregir = (w: string) => {
    if (w.length < 4 || /\d/.test(w) || conocida(w)) return w;
    const tope = w.length >= 6 ? 2 : 1;
    let mejor: string | null = null, dMejor = tope + 1, fMejor = 0;
    for (const [v, f] of vocabulario) {
      const d = distancia(w, v, tope);
      if (d < dMejor || (d === dMejor && f > fMejor)) { mejor = v; dMejor = d; fMejor = f; }
    }
    return mejor && dMejor <= tope ? mejor : w;
  };
  const corregida = q.split(' ').filter(Boolean).map(corregir).join(' ');

  // 2. Los sinónimos de varias palabras se cambian en la frase entera
  //    («batería externa» → «powerbank»); los de una, palabra a palabra.
  // La escrita va primero: si encuentra algo por sí sola, no se dice que se corrigió.
  const frases = new Set<string>([q, corregida]);
  for (const base of new Set([q, corregida])) {
    for (const g of SINONIMOS) for (const x of g.filter(x => x.includes(' '))) {
      if (!(' ' + base + ' ').includes(' ' + x + ' ')) continue;
      for (const y of g) if (y !== x) frases.add((' ' + base + ' ').replace(' ' + x + ' ', ' ' + y + ' ').trim());
    }
  }
  const lecturas: Lectura[] = [...frases].slice(0, 6).map(f => f.split(' ').filter(Boolean).map(w => {
    const alt = new Set<string>([raizDe(w)]);
    for (const g of SINONIMOS) if (g.some(x => x === w || raizDe(x) === raizDe(w))) {
      for (const y of g) if (!y.includes(' ')) alt.add(raizDe(y));
    }
    return [...alt];
  }));
  return { lecturas, corregido: corregida !== q ? corregida : null };
}

/** ¿Encaja este texto (ya en minúsculas y sin acentos) con alguna lectura? */
export const encaja = (pajar: string, lecturas: Lectura[]) =>
  lecturas.some(l => l.every(alt => alt.some(a => pajar.includes(a))));

/** El camino desde la raíz por el que se baja (como el sitemap, sin lo de miembros). */
function bajaDesde(raiz: string) {
  return sql`
    WITH RECURSIVE baja(id, n) AS (
      SELECT ${raiz}::text, 0
      UNION
      SELECT h.hijo, b.n + 1 FROM baja b
      JOIN knowledge_windows w ON w.id = b.id
      CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
      CROSS JOIN LATERAL (
        SELECT f.pagina_id AS hijo FROM bd_filas f
        WHERE blq->>'tipo' = 'basedatos' AND f.tabla_id = blq->>'tabla_id'
          AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.pagina_id IS NOT NULL AND f.oculta = false
        UNION ALL
        SELECT blq->>'entityId' WHERE blq->>'tipo' = 'subpagina' AND blq->>'entityId' IS NOT NULL
      ) h
      WHERE b.n < ${PROFUNDIDAD}
        AND NOT EXISTS (
          SELECT 1 FROM sitio_restricciones rs
          WHERE rs.pagina_id = w.id AND (rs.bloque_id = '' OR rs.bloque_id = blq->>'id')
        )
    )`;
}

/** Las palabras de los títulos del sitio (y de sus tablas), con cuántas veces
 *  salen. También cada pareja seguida, junta: «power bank» → «powerbank». */
const vocabularios = new Map<string, { hasta: number; v: Map<string, number> }>();
async function vocabularioDe(db: any, raiz: string): Promise<Map<string, number>> {
  const ya = vocabularios.get(raiz);
  if (ya && ya.hasta > Date.now()) return ya.v;
  const r = await db.execute(sql`${bajaDesde(raiz)}
    SELECT w.title, t.titulo AS tabla FROM baja b
    JOIN knowledge_windows w ON w.id = b.id AND w.deleted_at IS NULL AND w.archived_at IS NULL
    LEFT JOIN bd_filas f ON f.pagina_id = w.id AND f.deleted_at IS NULL
    LEFT JOIN bd_tablas t ON t.id = f.tabla_id`);
  const v = new Map<string, number>();
  const suma = (w: string) => { if (w.length >= 3 && !/^\d+$/.test(w)) v.set(w, (v.get(w) || 0) + 1); };
  for (const x of r.rows as any[]) for (const t of [x.title, x.tabla]) {
    const ps = planoJs(String(t || '')).split(/[^a-z0-9ñ]+/).filter(Boolean);
    ps.forEach((p, i) => { suma(p); if (i > 0) suma(ps[i - 1] + p); });
  }
  if (vocabularios.size > 50) vocabularios.clear();
  vocabularios.set(raiz, { hasta: Date.now() + 5 * 60_000, v });
  return v;
}

/** Las secciones de un sitio: las páginas que enseñan un catálogo de fichas
 *  (un bloque de base de datos cuya tabla tiene plantilla de ficha), con
 *  cuántas fichas tienen y la portada de alguna. Es lo que se ofrece cuando
 *  una búsqueda no encuentra nada, en la página de error y en la portada. */
export async function seccionesDe(db: any, raiz: string) {
  const r = await db.execute(sql`${bajaDesde(raiz)}
    -- Por qué subpágina de la raíz se llega a cada página: una subpágina que
    -- sólo lleva a secciones ya enseñadas en tarjetas no se repite como enlace.
    , via(id, primera, n) AS (
      SELECT h.hijo, h.hijo, 1 FROM knowledge_windows w
      CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
      CROSS JOIN LATERAL (SELECT blq->>'entityId' AS hijo) h
      WHERE w.id = ${raiz} AND blq->>'tipo' = 'subpagina' AND h.hijo IS NOT NULL
      UNION
      SELECT blq->>'entityId', v.primera, v.n + 1 FROM via v
      JOIN knowledge_windows w ON w.id = v.id AND w.deleted_at IS NULL
      CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
      WHERE blq->>'tipo' = 'subpagina' AND blq->>'entityId' IS NOT NULL AND v.n < ${PROFUNDIDAD}
    )
    , cat AS (
      SELECT w.id, w.title, w.config, w.slug, w.publico, blq->>'tabla_id' AS tabla_id, MIN(b.n) AS n
      FROM baja b
      JOIN knowledge_windows w ON w.id = b.id AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
      CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
      JOIN bd_tablas t ON t.id = blq->>'tabla_id' AND t.archived_at IS NULL AND (t.config->'plantilla'->>'pagina_id') IS NOT NULL
      WHERE blq->>'tipo' = 'basedatos' AND NOT EXISTS (SELECT 1 FROM bd_filas f WHERE f.pagina_id = w.id)
      GROUP BY w.id, w.title, w.config, w.slug, w.publico, blq->>'tabla_id'
    )
    SELECT c.*,
      (SELECT count(*) FROM bd_filas f WHERE f.tabla_id = c.tabla_id AND f.deleted_at IS NULL
         AND f.archived_at IS NULL AND f.pagina_id IS NOT NULL AND f.oculta = false)::int AS fichas,
      -- La foto del primer producto del catálogo, en el orden de la galería:
      -- la portada de su ficha o, si no tiene, la columna de foto (W1,
      -- ficha 'imagen', o la 'foto' del cargador, como en bd.ts).
      (SELECT u FROM (
         SELECT f.orden, COALESCE(NULLIF(pw.config->>'portada', ''), NULLIF(trim(f.valores->>k.id), '')) AS u
         FROM bd_filas f JOIN knowledge_windows pw ON pw.id = f.pagina_id AND pw.deleted_at IS NULL
         LEFT JOIN bd_columnas k ON k.tabla_id = f.tabla_id AND k.archived_at IS NULL
           AND (k.config->>'ficha' = 'imagen' OR (k.config->>'ficha' IS NULL AND k.config->>'clave' = 'foto' AND k.tipo = 'url'))
         WHERE f.tabla_id = c.tabla_id AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
       ) m WHERE m.u ~ '^(https?://[^[:space:]]+|/[^/][^[:space:]]*)$' ORDER BY m.orden LIMIT 1) AS muestra,
      (SELECT array_agg(DISTINCT v.primera) FROM via v WHERE v.id = c.id) AS vias
    FROM cat c
    ORDER BY c.n, c.id`);
  const out: { id: string; titulo: string; descripcion: string; fichas: number; portada: string | null; slug: string | null; vias: string[] }[] = [];
  const vistos = new Map<string, number>();
  for (const x of r.rows as any[]) {
    const i = vistos.get(x.id);
    if (i !== undefined) { out[i].fichas += Number(x.fichas) || 0; out[i].portada ||= x.muestra || null;
      for (const v of x.vias || []) if (v && !out[i].vias.includes(v)) out[i].vias.push(v);
      continue; }
    if (!(await paginaVisible(db, x.id))) continue;
    vistos.set(x.id, out.length);
    out.push({ id: x.id, titulo: String(x.title || '').trim() || 'Sin título', descripcion: descripcionDe(x.config),
      fichas: Number(x.fichas) || 0, portada: x.config?.portada || x.muestra || null,
      // Su nombre corto (`powerbanks`), que es su dirección canónica en el sitio.
      slug: x.publico && typeof x.slug === 'string' && x.slug && !x.slug.includes('/') ? x.slug : null,
      vias: Array.isArray(x.vias) ? x.vias.filter(Boolean) : [] });
  }
  // EL GRUPO DE CADA SECCIÓN (ronda 2 del evaluador): la subpágina de la raíz
  // por la que se llega a ella («Energía portátil»), con su título y su
  // dirección, en el orden en que la raíz las enlaza. La portada agrupa las
  // tarjetas por aquí; si cada sección es su propio grupo (una categoría
  // pidiendo las suyas), no hay nada que agrupar.
  const ids = [...new Set(out.flatMap(o => o.vias))].filter(v => !out.some(o => o.id === v));
  if (ids.length) {
    const g = (await db.execute(sql`
      SELECT w.id, w.title, w.slug, w.publico, (
        SELECT min(o.n) FROM knowledge_windows r
        CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('r')}) WITH ORDINALITY o(b, n)
        WHERE r.id = ${raiz} AND o.b->>'tipo' = 'subpagina' AND o.b->>'entityId' = w.id) AS orden
      FROM knowledge_windows w
      WHERE w.id = ANY(string_to_array(${ids.join(',')}, ',')) AND w.deleted_at IS NULL AND w.archived_at IS NULL
    `)).rows as any[];
    const grupos = new Map(g.map(x => [String(x.id), { id: String(x.id), titulo: String(x.title || '').trim() || 'Sin título', orden: Number(x.orden) || 0,
      slug: x.publico && typeof x.slug === 'string' && x.slug && !x.slug.includes('/') ? x.slug : null }]));
    for (const o of out) {
      const mio = o.vias.map(v => grupos.get(v)).filter(Boolean).sort((a, b) => a!.orden - b!.orden)[0];
      if (mio) (o as any).grupo = { id: mio.id, titulo: mio.titulo, slug: mio.slug, orden: mio.orden };
    }
  }
  return out;
}

// El bloque «Secciones del sitio» también en el HTML del servidor: son los
// enlaces de la portada a cada catálogo, lo primero que un buscador sigue.
// El mismo dibujo que `SeccionesSitio.tsx`, para que la página no salte.
registrarHtml('secciones', (b, ctx) => {
  const lista = ctx.extra.get('secciones') as Awaited<ReturnType<typeof seccionesDe>> | undefined;
  if (!lista?.length) return '';
  const titulo = typeof b?.datos?.titulo === 'string' ? b.datos.titulo.trim() : '';
  let n = 0;
  const tarjeta = (s: (typeof lista)[number], K: Record<string, string>) => {
    const i = n++;
    return `<li><a href="${esc(ctx.enlacePagina(s.id))}" class="${K.enlace}">`
      + (s.portada ? `<span class="${K.marco}"><img src="${esc(s.portada)}" alt="" width="320" height="240" loading="${i < CARGA_INMEDIATA ? 'eager' : 'lazy'}" class="${K.imagen}"></span>`
        : `<span class="${K.marco}" aria-hidden="true"></span>`)
      + `<span class="${K.cuerpo}"><span class="${K.titulo}">${esc(s.titulo)}</span>`
      + `<span class="${K.cuenta}">${s.fichas === 1 ? '1 producto' : `${s.fichas} productos`}</span>`
      + (s.descripcion ? `<span class="${K.descripcion}">${esc(s.descripcion)}</span>` : '')
      + '</span></a></li>';
  };
  const grupos = b?.datos?.ambito !== 'pagina' ? agruparSecciones(lista as any[]) : null;
  const cuerpo = grupos
    ? `<div class="${CLASES_GRUPOS.fila}">` + grupos.map(g => `<section class="${CLASES_GRUPOS.grupo}" style="flex-grow:${g.secciones.length};flex-basis:0">`
        + `<h3 class="${CLASES_GRUPOS.titulo}"><a href="${esc(ctx.enlacePagina(g.id))}" class="${CLASES_GRUPOS.enlaceTitulo}">${esc(g.titulo)}</a></h3>`
        + `<ul class="${CLASES_GRUPOS.lista}" style="--n:${g.secciones.length}">${g.secciones.map((s: any) => tarjeta(s, CLASES_COMPACTA)).join('')}</ul></section>`).join('') + '</div>'
    : `<ul class="${CLASES_TARJETA.lista}">${lista.map(s => tarjeta(s, CLASES_TARJETA)).join('')}</ul>`;
  return `<section>${titulo ? `<h2 class="mb-3 text-xl font-black text-slate-900">${esc(titulo)}</h2>` : ''}${cuerpo}</section>`;
}, async (db, bloques, ctx) => {
  const bloque = bloques.find(x => x?.tipo === 'secciones');
  if (!bloque || ctx.extra.has('secciones')) return;
  // «De esta página» (una categoría: sus subcategorías) o, por defecto, del sitio.
  const desde = bloque.datos?.ambito === 'pagina' ? ctx.pagina?.id : (ctx.pagina?.sitio?.raizId || ctx.pagina?.id);
  if (!desde) return;
  const lista = await seccionesDe(db, desde);
  ctx.extra.set('secciones', lista);
  ctx.extra.set('subpaginas-en-tarjetas', new Set(lista.flatMap(s => [s.id, ...s.vias])));
});

/**
 * LO QUE SE VE DE UNA FICHA EN LOS RESULTADOS (ronda 2 del evaluador,
 * 2026-10-18): «los resultados son solo título + subcategoría, sin foto,
 * precio ni dato clave». A cada ficha se le pone su foto (la columna de foto si
 * la página no tiene portada), su precio «desde» y la cifra que dice cómo de
 * grande es (`tamano`, o la primera destacada con valor), con los mismos roles
 * que la ficha y las tarjetas de la galería (`ficha/modelo.ts`). Un precio de
 * 0 no se enseña: es que ninguna tienda lo vende todavía.
 */
async function completarFichas(db: any, resultados: any[]) {
  const porTabla = new Map<string, any[]>();
  for (const r of resultados) if (r.tablaId) porTabla.set(r.tablaId, [...(porTabla.get(r.tablaId) || []), r]);
  for (const [tablaId, lista] of porTabla) {
    try {
      const columnas = (await db.execute(sql`
        SELECT id, nombre, tipo, opciones, config FROM bd_columnas
        WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
      `)).rows as any[];
      const filas = (await db.execute(sql`
        SELECT id, pagina_id, valores FROM bd_filas
        WHERE tabla_id = ${tablaId} AND deleted_at IS NULL AND archived_at IS NULL
          AND pagina_id = ANY(string_to_array(${lista.map(r => r.id).join(',')}, ','))
      `)).rows as any[];
      const preparadas = filas.map(f => ({ id: f.id, pagina: f.pagina_id, celdas: celdasDe(f.valores || {}, columnas) }));
      const { porFila } = await calcularTabla(db, { columnas, filas: preparadas });
      const visibles = columnas.filter(c => c.config?.visibilidad !== 'nunca');
      const foto = columnas.find(c => rolDe(c) === 'imagen');
      const precio = visibles.find(c => rolDe(c) === 'precio_min');
      const cifras = [visibles.find(c => rolDe(c) === 'tamano'), ...columnasDestacadas({ columnas } as any)].filter(Boolean) as any[];
      for (const f of preparadas) {
        const r = lista.find(x => x.id === f.pagina); if (!r) continue;
        const celdas = { ...f.celdas, ...(porFila[f.id] || {}) };
        const texto = (c: any) => { const v = celdas[c.id]; return v?.estado === 'ok' ? formatear(v, c) : ''; };
        const cf: any = foto ? celdas[foto.id] : null;
        const u = cf?.estado === 'ok' ? String(cf.valor ?? '').trim() : '';
        if (!r.portada && /^(https?:\/\/\S+|\/[^/]\S*)$/.test(u)) r.portada = u;
        const p: any = precio ? celdas[precio.id] : null;
        if (precio && p?.estado === 'ok' && Number(p.valor) > 0) r.precio = texto(precio);
        // Con su unidad, como lo dice la ficha: «Energía nominal: 86,4 Wh».
        const fila = { celdas } as any;
        const cifra = cifras.find(c => textoDe(fila, c));
        if (cifra) r.dato = { nombre: etiquetaColumna(cifra), valor: textoDe(fila, cifra) };
      }
    } catch (e) { console.error('buscador: fichas', e); }
  }
  for (const r of resultados) delete r.tablaId;
}

export function registrarBuscadorSitio(app: Express, db: any) {
  // Las secciones del sitio, para la portada y la página de error.
  app.get('/api/sitio/secciones', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.query.sitio || '').trim();
      // `desde`: las secciones que cuelgan de esa página (una categoría).
      const desde = String(req.query.desde || '').trim() || raiz;
      if (!raiz) return res.status(400).json({ error: 'Falta el sitio.' });
      if (!(await paginaVisible(db, raiz)) || (desde !== raiz && !(await paginaVisible(db, desde)))) return res.status(404).json({ error: 'Ese sitio no existe o no está publicado.' });
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ secciones: await seccionesDe(db, desde) });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/sitio/buscar', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.query.sitio || '').trim();
      const q = planoJs(String(req.query.q || '').replace(/\s+/g, ' ').trim()).slice(0, 100);
      if (!raiz) return res.status(400).json({ error: 'Falta el sitio en el que buscar.' });
      if (q.length < 2) return res.json({ q, resultados: [] });
      if (!(await paginaVisible(db, raiz))) return res.status(404).json({ error: 'Ese sitio no existe o no está publicado.' });

      // Todo lo que se puede encontrar de cada página, en un solo texto plano
      // (el «pajar»): título, nombre de su tabla, valores de sus columnas
      // visibles y texto de sus bloques. Cada palabra de la búsqueda tiene que
      // estar en él (o uno de sus sinónimos); `%` y `_` son letras, no comodines.
      const { lecturas, corregido } = variantes(q, await vocabularioDe(db, raiz));
      const patron = (a: string) => `%${a.replace(/[\\%_]/g, m => '\\' + m)}%`;
      const condicion = sql.join(lecturas.map(l => sql`(${sql.join(l.map(alt =>
        sql`h.pajar LIKE ANY(string_to_array(${alt.map(patron).join('\n')}, E'\n'))`), sql` AND `)})`), sql` OR `);
      const r = await db.execute(sql`${bajaDesde(raiz)}
        SELECT DISTINCT ON (w.id) w.id, w.title, w.slug, w.config, t.titulo AS tabla, t.id AS tabla_id,
          (t.config->'plantilla'->>'pagina_id') IS NOT NULL AS es_ficha, h.valores
        FROM baja b
        JOIN knowledge_windows w ON w.id = b.id AND w.kind = 'pagina'
          AND w.deleted_at IS NULL AND w.archived_at IS NULL
        LEFT JOIN bd_filas f ON f.pagina_id = w.id AND f.deleted_at IS NULL AND f.archived_at IS NULL
        LEFT JOIN bd_tablas t ON t.id = f.tabla_id
        CROSS JOIN LATERAL (SELECT (
          SELECT string_agg(kv.value, ' ') FROM jsonb_each_text(COALESCE(f.valores, '{}'::jsonb)) kv
          JOIN bd_columnas c ON c.id = kv.key AND c.archived_at IS NULL
          WHERE (c.config->>'visibilidad') IS DISTINCT FROM 'nunca'
        ) AS valores) v
        CROSS JOIN LATERAL (SELECT v.valores, ${plano(sql`concat_ws(' ', w.title, replace(w.title, ' ', ''), t.titulo, v.valores, (
          SELECT string_agg(tx #>> '{}', ' ') FROM jsonb_path_query(w.config, 'lax $.**.texto') tx
          WHERE jsonb_typeof(tx) = 'string'
        ))`)} AS pajar) h
        WHERE ${condicion}
        ORDER BY w.id
        LIMIT 400
      `);

      // QUÉ VA PRIMERO (2026-10-18; por relevancia desde la ronda 3). Antes
      // mandaba el tipo de página y luego el título: buscando «powerbak»
      // salían un farol y una lámpara antes que las estaciones. Ahora cada
      // página suma puntos, y el tipo sólo desempata:
      //   · todas las palabras en el título (también con los espacios
      //     quitados: «powerbank» está en «Power Bank»): 100, y la frase tal
      //     cual se escribió en el título, 30 más;
      //   · cada palabra que está en el título: 10;
      //   · el nombre de su tabla lo dice («powerbank» → la tabla Powerbanks): 40;
      //   · es una ficha (fila de una tabla con plantilla, W1): 5; algo a lo que
      //     las fichas apuntan (marcas, fabricantes…): 2.
      // La marca está en el título de cada ficha, así que cuenta como título.
      // Sale de cómo están hechas las tablas, no de sus nombres: vale para
      // cualquier sitio, no sólo para Wikiproducts.
      const fichas = [...new Set((r.rows as any[]).filter(x => x.es_ficha).map(x => String(x.tabla_id)))];
      const apuntadas = new Set<string>();
      if (fichas.length) {
        const c = await db.execute(sql`
          SELECT DISTINCT config->>'tabla_destino' AS destino FROM bd_columnas
          WHERE tabla_id = ANY(string_to_array(${fichas.join(',')}, ',')) AND tipo = 'relacion'
            AND archived_at IS NULL AND (config->>'inversa_de') IS NULL AND (config->>'tabla_destino') IS NOT NULL
        `);
        for (const x of c.rows as any[]) if (!fichas.includes(String(x.destino))) apuntadas.add(String(x.destino));
      }
      // Con los espacios quitados también: «powerbank» está en «Power Bank».
      const juntos = (t: any) => { const p = planoJs(String(t || '')); return `${p} ${p.replace(/\s+/g, '')}`; };
      const frase = planoJs(corregido || q);
      for (const x of r.rows as any[]) {
        const titulo = juntos(x.title);
        const palabras = Math.max(0, ...lecturas.map(l => l.filter(alt => alt.some(a => titulo.includes(a))).length));
        x.puntos = (encaja(titulo, lecturas) ? 100 : 0) + (titulo.includes(frase) ? 30 : 0) + palabras * 10
          + (encaja(juntos(x.tabla), lecturas) ? 40 : 0)
          + (x.es_ficha ? 5 : x.tabla_id && apuntadas.has(String(x.tabla_id)) ? 2 : 0);
      }
      const filas = (r.rows as any[]).sort((a, b) => b.puntos - a.puntos
        || String(a.title || '').localeCompare(String(b.title || ''), 'es'));
      const pagina = Math.min(Math.max(1, Math.floor(Number(req.query.pagina)) || 1), 50);
      const desde = (pagina - 1) * POR_PAGINA;
      const resultados: any[] = [];
      // ¿Algo encontrado tal como se escribió? Entonces no hubo corrección.
      let tal = false;
      // Se revisan en orden hasta llenar esta página y saber si hay otra.
      let validos = 0;
      for (const x of filas) {
        if (validos > desde + POR_PAGINA) break;
        if (!(await paginaVisible(db, x.id))) continue;
        // El texto, sin los bloques de miembros: si sólo coincidía ahí, no
        // es un resultado para quien no es miembro.
        const { config } = await filtrarBloques(db, x.id, x.config, null);
        const pajar = juntos(x.title) + ' ' + planoJs([x.tabla, x.valores, ...textos(config)].filter(Boolean).join(' '));
        if (!encaja(pajar, lecturas)) continue;
        if (encaja(pajar, lecturas.slice(0, 1))) tal = true;
        if (validos++ < desde || validos > desde + POR_PAGINA) continue;
        resultados.push({
          id: x.id, tablaId: x.es_ficha ? String(x.tabla_id) : null,
          titulo: String(x.title || '').trim() || 'Sin título',
          descripcion: descripcionDe(config),
          tabla: x.tabla || null,
          portada: config?.portada || null,
          // La dirección legible de la ficha (`categoria/ficha`): el enlace
          // va directo a ella, sin pasar por el 301 de `/p/:id`.
          ruta: typeof x.slug === 'string' && x.slug.includes('/') ? x.slug : null,
        });
      }
      await completarFichas(db, resultados);
      // Lo mismo para cualquiera que pregunte: se puede guardar un poco.
      // Sin nada que enseñar: por dónde seguir.
      const secciones = resultados.length || pagina > 1 ? undefined : await seccionesDe(db, raiz);
      res.set('Cache-Control', 'public, max-age=60');
      res.json({ q, corregido: resultados.length && !tal ? corregido : null, resultados, pagina, por_pagina: POR_PAGINA, mas: validos > desde + POR_PAGINA, secciones });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
