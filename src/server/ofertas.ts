// ============================================================================
// LAS OFERTAS DE UN PRODUCTO (2026-10-18, Wikiproducts W5)
// ============================================================================
// «Dónde comprarlo» en la ficha de producto: las filas de la base de datos
// «Ofertas» que apuntan a esta ficha por su propiedad «Producto», ya con el
// nombre del distribuidor, el precio puesto en casa, el plazo, la comisión y
// lo que necesita el botón de la cesta.
//
// Lo usan dos sitios y por eso vive aquí y no en el componente: el bloque
// «Ofertas» de la página (por `GET /api/ofertas`) y el HTML que el servidor
// manda a los buscadores (requisito R1 de SEO), que tiene que decir lo mismo.
//
// ── POR QUÉ SE LEE LA TABLA ENTERA ──────────────────────────────────────────
// El botón de compra necesita el producto que hay detrás de cada fila, y esa
// copia se hace al leer la tabla (`bd/tienda.ts`). Leer solo las ofertas de
// esta ficha y pasárselas a `sincronizarTienda` sería un desastre: esa función
// retira de la venta todo lo que no recibe. Así que se lee la tabla de ofertas
// entera, igual que la lee su pantalla. Cuesta lo mismo que abrirla; la huella
// hace que una tabla que no ha cambiado no escriba nada. Apuntado como deuda
// en `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md` para cuando haya miles.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bdInterno, celdasDe } from './bd.js';
import { opinionesTerceros, textoOpinion, type OpinionTercero } from './bd/opinionesTerceros.js';
import { enlacesDe, enlacesInversos, celdaDeEnlaces, CLASE_DE_TIPO, type Apuntado } from './bd/enlaces.js';
import { ficherosDe, celdaDeFicheros, CLASE_FICHERO, type Fichero } from './bd/ficheros.js';
import { sincronizarTienda, columnaConRol, enlaceSeguro, type CompraFila } from './bd/tienda.js';
import { ordenarOfertas, relEnlaceTienda, totalOferta, comisionDeLinea, textoComision, motivoSinPrecio, lineasCompra, contarOfertas, textoResumenOfertas, textoCondiciones, textoEnvioTienda, envioCompraTienda, type CondicionesTienda } from '../utils/ofertas.js';
import { registrarHtml, esc } from './htmlBloques.js';
import { atencionDistribuidores } from './bd/comunidad.js';
import { paginaVisible } from './sitios.js';

export type OfertaPublica = {
  fila_id: string;
  distribuidor_id: string | null;
  distribuidor: string | null;
  precio_centimos: number | null;
  envio_centimos: number | null;
  moneda: string;
  stock: number | null;
  agotada: boolean;
  /** Its shop says it does not ship to Spain (`envia_espana` unticked on the
   *  shop's row): shown, but never «A la venta», never in «Desde», no cart. */
  fuera_de_espana: boolean;
  /** The shop says it has it, with or without a count («en stock»). `null` = not said. */
  en_stock: boolean | null;
  plazo: string | null;
  /** La oferta en la web de la tienda, ya filtrada (solo http/https). */
  enlace: string | null;
  /** El `rel` con el que se pinta ese enlace: `sponsored` si hay comisión. */
  rel: string;
  /** `null` = sin acuerdo con la tienda. */
  comision_pct: number | null;
  /** Fecha ISO de la última vez que se miró el precio, si la tabla la lleva. */
  comprobado: string | null;
  /** Doméstico: si el precio incluye la instalación. `null` = no se dice. */
  instalacion: boolean | null;
  /** Lo que necesita el botón de la cesta; `null` si la tabla no tiene botón. */
  compra: CompraFila | null;
  /** Nota de atención al cliente del distribuidor (1–5, `bd/comunidad.ts`); `null` sin votos suficientes. */
  nota_distribuidor: number | null;
  /** Cuántas personas puntuaron esa atención y cuántas hacen falta para que
   *  haya nota («1 de 3 votos»). `null` si su tabla no tiene ese criterio. */
  votos_distribuidor: { votos: number; umbral: number } | null;
  /** The shop's delivery, shipping, returns and warranty conditions, from its
   *  «Distribuidores» row; `null` when it has none or is someone else's table. */
  tienda: CondicionesTienda | null;
  /** The shop's rating elsewhere (Trustpilot…), with link and date. Shown
   *  apart: it never orders and never counts as the community note. */
  opiniones_distribuidor: OpinionTercero[];
};

const valorDe = (c: any) => (c && c.estado === 'ok' ? c.valor : null);

/** Las tablas de ofertas de una tabla de productos: las que tienen una
 *  propiedad con el papel «Producto» que apunta a ella. */
async function tablasDeOfertas(db: any, tablaProductos: string): Promise<string[]> {
  // The products table owner's own offers first: anyone can point a relation
  // at a table they can read, and their table must not take this sheet's place.
  const r = await db.execute(sql`
    SELECT DISTINCT c.tabla_id,
           (COALESCE(po.creador_user_id, t.creador_user_id) = COALESCE(pp.creador_user_id, tp.creador_user_id)) AS suya
    FROM bd_columnas c JOIN bd_tablas t ON t.id = c.tabla_id
    LEFT JOIN proyectos po ON po.id = t.proyecto_id
    JOIN bd_tablas tp ON tp.id = ${tablaProductos}
    LEFT JOIN proyectos pp ON pp.id = tp.proyecto_id
    WHERE c.tipo = 'relacion' AND c.archived_at IS NULL AND c.config->>'rol' = 'producto'
      AND c.config->>'tabla_destino' = ${tablaProductos}
      AND t.archived_at IS NULL AND t.deleted_at IS NULL
    ORDER BY suya DESC NULLS LAST, c.tabla_id
  `);
  return (r.rows as any[]).map(x => x.tabla_id);
}

// ── WHO MAY READ THE OFFERS OF A SHEET (2026-10-18) ─────────────────────────
// The offers table is never embedded in a page by itself: it is shown through
// the «Ofertas» block of the product sheet. So its visibility cannot be the
// generic table rule (embedded in a published page), or the block is empty for
// every visitor. Rule:
//   1. Whoever can read the offers table reads it (owner, admin, public).
//   2. Otherwise, whoever can read the PRODUCT SHEET reads that sheet's offers
//      — and only if the offers table belongs to the same owner as the
//      products table. Someone else's table pointing at a public sheet does
//      not get to advertise on it.
// What leaves is always `OfertaPublica`: price, shipping, stock, link, lead
// time and the commission, which is public by design (ethics code).
async function duenoDe(db: any, tablaId: string): Promise<string | null> {
  const r = await db.execute(sql`
    SELECT t.creador_user_id, t.proyecto_id, p.creador_user_id AS proyecto_creador
    FROM bd_tablas t LEFT JOIN proyectos p ON p.id = t.proyecto_id
    WHERE t.id = ${tablaId} AND t.deleted_at IS NULL AND t.archived_at IS NULL
  `);
  const t = r.rows[0] as any;
  return t ? (t.proyecto_id ? t.proyecto_creador : t.creador_user_id) || null : null;
}

async function permisoOfertas(
  db: any, req: Pick<Request, 'user'>, ficha: { tabla_id: string; pagina_id: string | null }, tablaId: string,
): Promise<{ tabla: any } | { error: string; codigo: number }> {
  const directo = await bdInterno.puedeConTabla!(req as Request, tablaId, false);
  const fichaVisible = !('error' in await bdInterno.puedeConTabla!(req as Request, ficha.tabla_id, false))
    || (!!ficha.pagina_id && await paginaVisible(db, ficha.pagina_id));
  // Reading the offers never reveals a sheet the reader cannot see.
  if (!fichaVisible) return { error: 'No tienes acceso a esa ficha.', codigo: 403 };
  if (!('error' in directo)) return directo;
  const [dO, dP] = await Promise.all([duenoDe(db, tablaId), duenoDe(db, ficha.tabla_id)]);
  if (!dO || dO !== dP) return directo;
  const t = (await db.execute(sql`SELECT * FROM bd_tablas WHERE id = ${tablaId}`)).rows[0];
  return { tabla: t };
}

// ── THE SHOP'S CONDITIONS (evaluator round 2, fix 3) ────────────────────────
// Read from the distributor rows by column `rol`, so the table can be renamed
// or reordered. Only from a distributors table of the SAME owner as the
// offers: a relation can point at anyone's table, and someone else's row must
// not get to promise «free returns» on this sheet.
const ROLES_TIENDA = {
  envia_espana: ['casilla'], entrega_min: ['numero'], entrega_max: ['numero'], envio_tienda: ['moneda', 'numero'],
  envio_gratis_desde: ['moneda', 'numero'], devolucion_dias: ['numero'], devolucion_gratis: ['casilla'],
  garantia: ['seleccion', 'texto'], condiciones: ['url'], condiciones_fecha: ['fecha'],
} as const;

export async function condicionesDeTiendas(db: any, ids: string[], dueno: string | null): Promise<Map<string, CondicionesTienda>> {
  const out = new Map<string, CondicionesTienda>();
  const unicos = [...new Set(ids)];
  if (!unicos.length || !dueno) return out;
  const filas = (await db.execute(sql`
    SELECT id, tabla_id, valores FROM bd_filas
    WHERE id IN (${sql.join(unicos.map(i => sql`${i}`), sql`, `)}) AND archived_at IS NULL AND deleted_at IS NULL
  `)).rows as any[];
  const porTabla = new Map<string, any[]>();
  for (const f of filas) (porTabla.get(f.tabla_id) || porTabla.set(f.tabla_id, []).get(f.tabla_id)!).push(f);
  for (const [tablaId, deTabla] of porTabla) {
    if ((await duenoDe(db, tablaId)) !== dueno) continue;
    const columnas = (await db.execute(sql`
      SELECT id, tipo, opciones, config FROM bd_columnas WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
    `)).rows as any[];
    const col = Object.fromEntries(Object.entries(ROLES_TIENDA).map(([r, t]) => [r, columnaConRol(columnas, r, [...t])])) as Record<keyof typeof ROLES_TIENDA, any>;
    if (!Object.values(col).some(Boolean)) continue;
    for (const f of deTabla) {
      const celdas: Record<string, any> = celdasDe(f.valores || {}, columnas);
      const v = (r: keyof typeof ROLES_TIENDA) => (col[r] ? valorDe(celdas[col[r].id]) : null);
      const n = (r: keyof typeof ROLES_TIENDA) => { const x = v(r); return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null; };
      const cent = (r: keyof typeof ROLES_TIENDA) => { const x = n(r); return x === null ? null : Math.round(x * 100); };
      // A «seleccion» cell stores the option id; the box needs its label.
      const gId = v('garantia');
      const g = col.garantia?.tipo === 'seleccion' ? (col.garantia.opciones || []).find((o: any) => o?.id === gId)?.label ?? null : gId;
      const e = v('envia_espana'), b = v('devolucion_gratis'), u = v('condiciones'), d = v('condiciones_fecha');
      out.set(f.id, {
        envia_a_espana: typeof e === 'boolean' ? e : null,
        entrega_min_dias: n('entrega_min'), entrega_max_dias: n('entrega_max'),
        envio_centimos: cent('envio_tienda'), envio_gratis_desde_centimos: cent('envio_gratis_desde'),
        devolucion_dias: n('devolucion_dias'), devolucion_gratis: typeof b === 'boolean' ? b : null,
        garantia: typeof g === 'string' && g.trim() ? g.trim() : null,
        condiciones_url: enlaceSeguro(u), condiciones_fecha: d ? String(d).slice(0, 10) : null,
      });
    }
  }
  return out;
}

/**
 * Las ofertas de una ficha, en el orden de `ordenarOfertas` (que no lee la
 * comisión). Se dice de qué ficha por `filaId` o por `paginaId` (la página de
 * la fila, que es lo que conoce el bloque). `tablaId` es la tabla de ofertas;
 * sin ella se busca la que apunta a la tabla de la ficha.
 */
export async function ofertasDeProducto(
  db: any, req: Pick<Request, 'user'>,
  o: { filaId?: string | null; paginaId?: string | null; tablaId?: string | null; todas?: boolean },
): Promise<{ ofertas: OfertaPublica[]; tabla_id: string | null; fila_id: string | null; producto_de?: Record<string, string> } | { error: string; codigo: number }> {
  const f = o.filaId
    ? await db.execute(sql`SELECT id, tabla_id, pagina_id FROM bd_filas WHERE id = ${o.filaId} AND deleted_at IS NULL`)
    : o.paginaId
      ? await db.execute(sql`SELECT id, tabla_id, pagina_id FROM bd_filas WHERE pagina_id = ${o.paginaId} AND deleted_at IS NULL LIMIT 1`)
      : null;
  const ficha = f?.rows[0] as any;
  // Sin ficha no es un error: el bloque puede estar en una página normal, y
  // ahí «no hay ofertas» es la respuesta verdadera.
  if (!ficha) return { ofertas: [], tabla_id: o.tablaId || null, fila_id: null };

  const tablaId = o.tablaId || (await tablasDeOfertas(db, ficha.tabla_id))[0] || null;
  if (!tablaId) return { ofertas: [], tabla_id: null, fila_id: ficha.id };
  const permiso = await permisoOfertas(db, req, ficha, tablaId);
  if ('error' in permiso) return permiso;
  const columnas = (await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config, orden FROM bd_columnas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
  `)).rows as any[];
  const cProducto = columnaConRol(columnas, 'producto', ['relacion']);
  // The «Producto» column must point at THIS sheet's table: a table passed by
  // the client that points elsewhere is not this product's offers.
  if (!cProducto || cProducto.config?.tabla_destino !== ficha.tabla_id) return { ofertas: [], tabla_id: tablaId, fila_id: ficha.id };
  const colTitulo = columnas.find(c => c.tipo === 'texto')?.id ?? null;

  const filas = (await db.execute(sql`
    SELECT id, valores FROM bd_filas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL AND deleted_at IS NULL
    ORDER BY orden, created_at
  `)).rows as any[];
  const ids = filas.map(x => x.id);
  const enlaces = await enlacesDe(db, ids);
  const ficheros = await ficherosDe(db, ids);
  for (const c of columnas) {
    if (!CLASE_DE_TIPO[c.tipo] || !c.config?.inversa_de) continue;
    const inv = await enlacesInversos(db, c.config.inversa_de, ids);
    for (const [id, lista] of Object.entries(inv)) ((enlaces[id] ||= {})[c.id] = lista);
  }
  const preparadas = filas.map(fila => {
    const celdas: Record<string, any> = celdasDe(fila.valores || {}, columnas);
    const apuntados: Record<string, Apuntado[]> = {};
    const archivos: Record<string, Fichero[]> = {};
    for (const c of columnas) {
      if (CLASE_DE_TIPO[c.tipo]) { celdas[c.id] = celdaDeEnlaces(enlaces[fila.id]?.[c.id]); if (enlaces[fila.id]?.[c.id]) apuntados[c.id] = enlaces[fila.id][c.id]; }
      if (CLASE_FICHERO[c.tipo]) { celdas[c.id] = celdaDeFicheros(ficheros[fila.id]?.[c.id]); if (ficheros[fila.id]?.[c.id]) archivos[c.id] = ficheros[fila.id][c.id]; }
    }
    return { id: fila.id, celdas, archivos, apuntados };
  });

  const compras = columnas.some(c => c.tipo === 'compra')
    ? await sincronizarTienda(db, { tablaId, duenoId: permiso.tabla.creador_user_id, columnas, colTitulo, filas: preparadas })
    : {};

  const cPrecio = columnaConRol(columnas, 'precio', ['moneda', 'numero']);
  const cEnvio = columnaConRol(columnas, 'envio', ['moneda', 'numero']);
  const cStock = columnaConRol(columnas, 'stock', ['numero']);
  const cDisponible = columnaConRol(columnas, 'disponible', ['casilla']);
  const cDist = columnaConRol(columnas, 'distribuidor', ['relacion']);
  const cComision = columnaConRol(columnas, 'comision', ['porcentaje', 'numero']);
  const cEnlace = columnaConRol(columnas, 'enlace', ['url']);
  const cPlazo = columnaConRol(columnas, 'plazo', ['texto']);
  const cComprobado = columnaConRol(columnas, 'comprobado', ['fecha']);
  const cInstalacion = columnaConRol(columnas, 'instalacion', ['casilla']);
  const moneda = String(cPrecio?.config?.moneda || 'EUR').toUpperCase();
  const cent = (v: any) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null);

  // `todas` (W1, the sheet's comparator): every product's offers in the same
  // read, with `producto_de` saying whose each one is, so a sibling with no
  // price says WHY with the same words as its own sheet. Same permission:
  // the offers table is the one this sheet's table points at.
  const suyas = o.todas
    ? preparadas.filter(p => (p.apuntados[cProducto.id] || []).length)
    : preparadas.filter(p => (p.apuntados[cProducto.id] || []).some(a => a.id === ficha.id));
  const ofertas: OfertaPublica[] = suyas.map(p => {
    const compra = (compras as Record<string, CompraFila>)[p.id] || null;
    // Lo que dice la fila manda; el producto de detrás es su copia.
    const dist = cDist ? (p.apuntados[cDist.id] || [])[0] : undefined;
    const pctBruto = cComision ? valorDe(p.celdas[cComision.id]) : null;
    const pct = compra?.oferta?.comision_pct ?? (typeof pctBruto === 'number' && pctBruto > 0
      ? Math.round((cComision!.tipo === 'porcentaje' ? pctBruto * 100 : pctBruto) * 100) / 100 : null);
    const stockBruto = cStock ? valorDe(p.celdas[cStock.id]) : null;
    const stock = typeof stockBruto === 'number' ? Math.max(0, Math.round(stockBruto)) : null;
    const dispBruto = cDisponible ? valorDe(p.celdas[cDisponible.id]) : null;
    const disponible = typeof dispBruto === 'boolean' ? dispBruto : null;
    const enlace = compra?.oferta?.enlace ?? (cEnlace ? enlaceSeguro(valorDe(p.celdas[cEnlace.id])) : null);
    const comprobado = cComprobado ? valorDe(p.celdas[cComprobado.id]) : null;
    const inst = cInstalacion ? valorDe(p.celdas[cInstalacion.id]) : null;
    return {
      fila_id: p.id,
      distribuidor_id: dist?.id || null,
      distribuidor: dist?.etiqueta || null,
      precio_centimos: cPrecio ? cent(valorDe(p.celdas[cPrecio.id])) : null,
      envio_centimos: cEnvio ? cent(valorDe(p.celdas[cEnvio.id])) : null,
      moneda,
      stock,
      agotada: stock === 0 || disponible === false,
      fuera_de_espana: false,
      en_stock: stock !== null ? stock > 0 : disponible,
      plazo: cPlazo ? (String(valorDe(p.celdas[cPlazo.id]) || '').trim() || null) : null,
      enlace,
      rel: relEnlaceTienda(pct),
      comision_pct: pct,
      comprobado: comprobado ? String(comprobado).slice(0, 10) : null,
      instalacion: typeof inst === 'boolean' ? inst : null,
      compra: compra && compra.producto_id && !compra.motivo ? compra : null,
      nota_distribuidor: null,
      votos_distribuidor: null,
      tienda: null,
      opiniones_distribuidor: [],
    };
  });
  // The distributor's customer-service note (W4), the same adjusted note
  // that orders the community rankings; null under the voter threshold.
  const notas = await atencionDistribuidores(db, ofertas.map(x => x.distribuidor_id).filter(Boolean) as string[]);
  for (const x of ofertas) {
    const a = x.distribuidor_id ? notas.get(x.distribuidor_id) ?? null : null;
    x.nota_distribuidor = a?.nota ?? null;
    x.votos_distribuidor = a ? { votos: a.votos, umbral: a.umbral } : null;
  }
  const condiciones = await condicionesDeTiendas(db, ofertas.map(x => x.distribuidor_id).filter(Boolean) as string[], await duenoDe(db, tablaId));
  for (const x of ofertas) {
    x.tienda = (x.distribuidor_id && condiciones.get(x.distribuidor_id)) || null;
    x.fuera_de_espana = x.tienda?.envia_a_espana === false;
  }
  const fuera = await opinionesTerceros(db, ofertas.map(x => x.distribuidor_id).filter(Boolean) as string[]);
  for (const x of ofertas) x.opiniones_distribuidor = (x.distribuidor_id && fuera.get(x.distribuidor_id)) || [];
  const producto_de = o.todas ? Object.fromEntries(suyas.map(p => [p.id, String((p.apuntados[cProducto.id] || [])[0]?.id || '')])) : undefined;
  return { ofertas: ordenarOfertas(ofertas), tabla_id: tablaId, fila_id: ficha.id, ...(producto_de ? { producto_de } : {}) };
}

// ── EL HTML PARA LOS BUSCADORES (requisito R1 de SEO) ───────────────────────
// Lo mismo que pinta `Lectura.tsx`, con las mismas frases, para quien lee la
// página sin ejecutar JavaScript (los buscadores de IA). Se arma como un
// anónimo: sólo salen las ofertas de tablas públicas.
const dineroHtml = (c: number, moneda = 'EUR') => new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(c / 100);
const claveOfertas = (b: any, paginaId: string | null) => `ofertas:${b?.datos?.fila_id || paginaId || ''}:${b?.datos?.tabla_id || ''}`;

export function ofertasEnHtml(ofertas: OfertaPublica[], titulo: string): string {
  const cab = `<h2>${esc(titulo)}</h2>`;
  if (!ofertas.length) return `<section>${cab}<p>Todavía no tenemos registrada ninguna tienda que lo venda.</p></section>`;
  const conPrecio = ofertas.filter(o => o.precio_centimos !== null && !o.agotada && !o.fuera_de_espana);
  const moneda = ofertas[0].moneda || 'EUR';
  const desde = conPrecio.length ? Math.min(...conPrecio.map(o => totalOferta(o)!)) : null;
  const resumen = textoResumenOfertas(contarOfertas(ofertas), desde === null ? null : dineroHtml(desde, moneda));
  const items = ofertas.map(o => {
    const partes: string[] = [`<strong>${esc(o.distribuidor || 'Tienda sin nombre')}</strong>`];
    if (o.precio_centimos !== null) {
      const envio = o.envio_centimos === null
        ? (o.compra ? 'sin gastos de envío comprando aquí' : (textoEnvioTienda(o) || 'Envío: lo dice la tienda').replace(/^E/, 'e'))
        : o.envio_centimos === 0 ? 'envío gratis' : `+ ${dineroHtml(o.envio_centimos, o.moneda)} de envío`;
      const total = totalOferta(o);
      partes.push(`${dineroHtml(o.precio_centimos, o.moneda)} (${envio}${total !== null && o.envio_centimos ? `; total ${dineroHtml(total, o.moneda)}` : ''})`);
    } else partes.push(esc(motivoSinPrecio(o).replace(/\.$/, '')));
    if (o.nota_distribuidor !== null) partes.push(`atención al cliente: ${o.nota_distribuidor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5`);
    else if (o.votos_distribuidor) partes.push(`atención al cliente: aún sin nota (${o.votos_distribuidor.votos} de ${o.votos_distribuidor.umbral} votos)`);
    for (const t of o.opiniones_distribuidor || []) partes.push(`la tienda, en otras webs: <a href="${esc(t.url)}" rel="nofollow noopener">${esc(textoOpinion(t))}</a>`);
    // The same purchase-box lines as the sheet, in the same order (`lineasCompra`).
    for (const l of lineasCompra(o)) partes.push(esc(l.texto));
    if (o.instalacion === true) partes.push('incluye instalación');
    const comision = textoComision(o.comision_pct, o.precio_centimos === null ? null : comisionDeLinea(o.precio_centimos, 1, o.comision_pct), o.moneda);
    const enlace = o.enlace ? ` <a href="${esc(o.enlace)}" rel="${esc(o.rel)}">${o.precio_centimos === null ? 'Ver el precio en la tienda' : 'Ver en la tienda'}</a>` : '';
    const cond = textoCondiciones(o.tienda);
    const condiciones = cond && o.tienda?.condiciones_url ? ` <a href="${esc(o.tienda.condiciones_url)}" rel="nofollow noopener">${esc(cond)}</a>` : '';
    return `<li>${partes.join(' · ')}. ${esc(comision)}${enlace}${condiciones}</li>`;
  }).join('');
  return `<section>${cab}<p>${esc(resumen)}</p><ul>${items}</ul>`
    + '<p>Ordenadas por lo que pagas con el envío; a igual precio, por la atención al cliente de la tienda. La comisión no cambia el orden.</p></section>';
}

registrarHtml('ofertas', (b, ctx) => {
  const r = ctx.extra.get(claveOfertas(b, ctx.pagina?.id ?? null));
  if (!r) return '';
  const titulo = typeof b?.datos?.titulo === 'string' && b.datos.titulo.trim() ? b.datos.titulo.trim() : 'Dónde comprarlo';
  return ofertasEnHtml(r, titulo);
}, async (db, bloques, ctx) => {
  const paginaId = ctx.pagina?.id ?? null;
  for (const b of bloques.filter(x => x?.tipo === 'ofertas')) {
    const k = claveOfertas(b, paginaId);
    if (ctx.extra.has(k)) continue;
    // A product sheet already read its own offers for its markup (W1,
    // `bd/plantillaFicha.ts`): the same answer, without a second read.
    const yaLeidas = ctx.pagina?.ofertas_ficha;
    if (yaLeidas && (!b?.datos?.fila_id || b.datos.fila_id === yaLeidas.fila_id)
      && (!b?.datos?.tabla_id || b.datos.tabla_id === yaLeidas.tabla_id)) {
      ctx.extra.set(k, yaLeidas.ofertas);
      continue;
    }
    const r = await ofertasDeProducto(db, { user: undefined } as any, {
      filaId: b?.datos?.fila_id || null, paginaId, tablaId: b?.datos?.tabla_id || null,
    });
    if (!('error' in r)) ctx.extra.set(k, r.ofertas);
  }
});

// ── THE CART WHEN IT CANNOT BE PAID HERE (evaluator round 3, fix 1) ─────────
// While payment through Wikiproducts is not open (no live key), the cart is
// still the multi-shop basket the plan describes: grouped by the shop that
// really sells each line, with that shop's shipping, the commission of each
// line, a total per shop and a link to finish the purchase on the shop's own
// page. Shipping: the offer's own when every line states it (the most
// expensive one, one box per shop); otherwise the shop's published rule
// against this shop's subtotal; otherwise unknown, and said so.
export type LineaTienda = {
  producto_id: string; variante_id: string | null; nombre: string; cantidad: number;
  precio_centimos: number; enlace: string | null; comision_pct: number | null; comision_centimos: number | null;
};
export type CompraEnTienda = {
  distribuidor_id: string; distribuidor: string | null; lineas: LineaTienda[];
  subtotal_centimos: number; envio_centimos: number | null;
  /** Where the shipping figure comes from: the offer, the shop's rule, or nobody. */
  envio_origen: 'oferta' | 'tienda' | null;
  total_centimos: number | null; comision_centimos: number; condiciones_url: string | null;
};

const sinTienda = (nombre: string, tienda: string | null) =>
  tienda && nombre.endsWith(` · ${tienda}`) ? nombre.slice(0, -(` · ${tienda}`).length) : nombre;

export async function compraEnTiendas(db: any, lineas: Array<{ p: any; v: any; precio: number; unidades: number }>): Promise<CompraEnTienda[]> {
  const conTienda = lineas.filter(l => l.p?.distribuidor_id);
  if (!conTienda.length) return [];
  // The shop rows are read with the products' owner: same rule as the sheet.
  const condiciones = new Map<string, CondicionesTienda>();
  for (const dueno of new Set(conTienda.map(l => l.p.created_by).filter(Boolean))) {
    const ids = conTienda.filter(l => l.p.created_by === dueno).map(l => String(l.p.distribuidor_id));
    for (const [k, v] of await condicionesDeTiendas(db, ids, dueno)) condiciones.set(k, v);
  }
  const grupos = new Map<string, typeof conTienda>();
  for (const l of conTienda) grupos.set(l.p.distribuidor_id, [...(grupos.get(l.p.distribuidor_id) || []), l]);
  return [...grupos.entries()].map(([id, ls]) => {
    const subtotal = ls.reduce((n, l) => n + l.precio * l.unidades, 0);
    const t = condiciones.get(id) || null;
    const propios = ls.map(l => l.p.envio_centimos === null || l.p.envio_centimos === undefined ? null : Number(l.p.envio_centimos));
    const { centimos: envio, origen } = envioCompraTienda(propios, t, subtotal);
    const lineasT: LineaTienda[] = ls.map(l => {
      const pct = l.p.comision_pct === null || l.p.comision_pct === undefined ? null : Number(l.p.comision_pct);
      return {
        // The synced product is titled «Producto · Tienda»; the box already names the shop.
        producto_id: l.p.id, variante_id: l.v?.id || null, nombre: sinTienda(String(l.p.name || ''), l.p.distribuidor_nombre), cantidad: l.unidades, precio_centimos: l.precio,
        enlace: enlaceSeguro(l.p.oferta_enlace), comision_pct: pct, comision_centimos: comisionDeLinea(l.precio, l.unidades, pct),
      };
    });
    return {
      distribuidor_id: id, distribuidor: ls[0].p.distribuidor_nombre || null, lineas: lineasT,
      subtotal_centimos: subtotal, envio_centimos: envio, envio_origen: origen,
      total_centimos: envio === null ? null : subtotal + envio,
      comision_centimos: lineasT.reduce((n, l) => n + (l.comision_centimos || 0), 0),
      condiciones_url: t?.condiciones_url || null,
    };
  });
}

export function registrarOfertas(app: Express, db: any) {
  /**
   * `GET /api/ofertas?pagina=<id>|fila=<id>[&tabla=<id>]` — las ofertas de una
   * ficha, ordenadas. Solo lectura: sigue los permisos de las dos tablas.
   */
  app.get('/api/ofertas', async (req: Request, res: Response) => {
    try {
      const r = await ofertasDeProducto(db, req, {
        paginaId: req.query.pagina ? String(req.query.pagina) : null,
        filaId: req.query.fila ? String(req.query.fila) : null,
        tablaId: req.query.tabla ? String(req.query.tabla) : null,
      });
      if ('error' in r) return res.status(r.codigo).json({ error: r.error });
      // Whether the reader owns these offers (or is an admin): with a Stripe
      // TEST key only they get the cart, to try it; visitors get the shop link.
      const yo = req.user;
      const dueno = yo && r.tabla_id ? (yo.roleLevel ?? 0) >= 4 || (await duenoDe(db, r.tabla_id)) === yo.id : false;
      res.json({ ...r, es_dueno: !!dueno });
    } catch (e: any) { console.error(e); res.status(500).json({ error: 'No se han podido leer las ofertas.' }); }
  });
}
