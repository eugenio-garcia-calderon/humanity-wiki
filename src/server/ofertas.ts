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
import { enlacesDe, enlacesInversos, celdaDeEnlaces, CLASE_DE_TIPO, type Apuntado } from './bd/enlaces.js';
import { ficherosDe, celdaDeFicheros, CLASE_FICHERO, type Fichero } from './bd/ficheros.js';
import { sincronizarTienda, columnaConRol, enlaceSeguro, type CompraFila } from './bd/tienda.js';
import { ordenarOfertas, relEnlaceTienda, totalOferta, comisionDeLinea, textoComision } from '../utils/ofertas.js';
import { registrarHtml, esc } from './htmlBloques.js';
import { notaAtencionDistribuidores } from './bd/comunidad.js';
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

/**
 * Las ofertas de una ficha, en el orden de `ordenarOfertas` (que no lee la
 * comisión). Se dice de qué ficha por `filaId` o por `paginaId` (la página de
 * la fila, que es lo que conoce el bloque). `tablaId` es la tabla de ofertas;
 * sin ella se busca la que apunta a la tabla de la ficha.
 */
export async function ofertasDeProducto(
  db: any, req: Pick<Request, 'user'>,
  o: { filaId?: string | null; paginaId?: string | null; tablaId?: string | null },
): Promise<{ ofertas: OfertaPublica[]; tabla_id: string | null; fila_id: string | null } | { error: string; codigo: number }> {
  const f = o.filaId
    ? await db.execute(sql`SELECT id, tabla_id FROM bd_filas WHERE id = ${o.filaId} AND deleted_at IS NULL`)
    : o.paginaId
      ? await db.execute(sql`SELECT id, tabla_id FROM bd_filas WHERE pagina_id = ${o.paginaId} AND deleted_at IS NULL LIMIT 1`)
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
  const cDist = columnaConRol(columnas, 'distribuidor', ['relacion']);
  const cComision = columnaConRol(columnas, 'comision', ['porcentaje', 'numero']);
  const cEnlace = columnaConRol(columnas, 'enlace', ['url']);
  const cPlazo = columnaConRol(columnas, 'plazo', ['texto']);
  const cComprobado = columnaConRol(columnas, 'comprobado', ['fecha']);
  const cInstalacion = columnaConRol(columnas, 'instalacion', ['casilla']);
  const moneda = String(cPrecio?.config?.moneda || 'EUR').toUpperCase();
  const cent = (v: any) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null);

  const suyas = preparadas.filter(p => (p.apuntados[cProducto.id] || []).some(a => a.id === ficha.id));
  const ofertas: OfertaPublica[] = suyas.map(p => {
    const compra = (compras as Record<string, CompraFila>)[p.id] || null;
    // Lo que dice la fila manda; el producto de detrás es su copia.
    const dist = cDist ? (p.apuntados[cDist.id] || [])[0] : undefined;
    const pctBruto = cComision ? valorDe(p.celdas[cComision.id]) : null;
    const pct = compra?.oferta?.comision_pct ?? (typeof pctBruto === 'number' && pctBruto > 0
      ? Math.round((cComision!.tipo === 'porcentaje' ? pctBruto * 100 : pctBruto) * 100) / 100 : null);
    const stockBruto = cStock ? valorDe(p.celdas[cStock.id]) : null;
    const stock = typeof stockBruto === 'number' ? Math.max(0, Math.round(stockBruto)) : null;
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
      agotada: stock === 0,
      plazo: cPlazo ? (String(valorDe(p.celdas[cPlazo.id]) || '').trim() || null) : null,
      enlace,
      rel: relEnlaceTienda(pct),
      comision_pct: pct,
      comprobado: comprobado ? String(comprobado).slice(0, 10) : null,
      instalacion: typeof inst === 'boolean' ? inst : null,
      compra: compra && compra.producto_id && !compra.motivo ? compra : null,
      nota_distribuidor: null,
    };
  });
  // The distributor's customer-service note (W4), the same adjusted note
  // that orders the community rankings; null under the voter threshold.
  const notas = await notaAtencionDistribuidores(db, ofertas.map(x => x.distribuidor_id).filter(Boolean) as string[]);
  for (const x of ofertas) x.nota_distribuidor = x.distribuidor_id ? notas.get(x.distribuidor_id) ?? null : null;
  return { ofertas: ordenarOfertas(ofertas), tabla_id: tablaId, fila_id: ficha.id };
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
  const conPrecio = ofertas.filter(o => o.precio_centimos !== null && !o.agotada);
  const moneda = ofertas[0].moneda || 'EUR';
  const desde = conPrecio.length ? Math.min(...conPrecio.map(o => totalOferta(o)!)) : null;
  const tiendas = ofertas.length === 1 ? 'una tienda' : `${ofertas.length} tiendas`;
  const resumen = desde !== null ? `Desde ${dineroHtml(desde, moneda)} con envío, en ${tiendas}.` : `${tiendas[0].toUpperCase()}${tiendas.slice(1)}, sin precio disponible ahora.`;
  const items = ofertas.map(o => {
    const partes: string[] = [`<strong>${esc(o.distribuidor || 'Tienda sin nombre')}</strong>`];
    if (o.precio_centimos !== null) {
      const envio = o.envio_centimos === null
        ? (o.compra ? 'sin gastos de envío comprando aquí' : 'envío: lo dice la tienda')
        : o.envio_centimos === 0 ? 'envío gratis' : `+ ${dineroHtml(o.envio_centimos, o.moneda)} de envío`;
      const total = totalOferta(o);
      partes.push(`${dineroHtml(o.precio_centimos, o.moneda)} (${envio}${total !== null && o.envio_centimos ? `; total ${dineroHtml(total, o.moneda)}` : ''})`);
    } else partes.push('precio no publicado');
    if (o.nota_distribuidor !== null) partes.push(`atención al cliente: ${o.nota_distribuidor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5`);
    if (o.plazo) partes.push(`entrega: ${esc(o.plazo)}`);
    if (o.agotada) partes.push('agotado');
    if (o.instalacion === true) partes.push('incluye instalación');
    if (o.comprobado) partes.push(`precio comprobado el ${esc(o.comprobado)}`);
    const comision = textoComision(o.comision_pct, o.precio_centimos === null ? null : comisionDeLinea(o.precio_centimos, 1, o.comision_pct), o.moneda);
    const enlace = o.enlace ? ` <a href="${esc(o.enlace)}" rel="${esc(o.rel)}">Ver en la tienda</a>` : '';
    return `<li>${partes.join(' · ')}. ${esc(comision)}${enlace}</li>`;
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
    const r = await ofertasDeProducto(db, { user: undefined } as any, {
      filaId: b?.datos?.fila_id || null, paginaId, tablaId: b?.datos?.tabla_id || null,
    });
    if (!('error' in r)) ctx.extra.set(k, r.ofertas);
  }
});

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
      res.json(r);
    } catch (e: any) { console.error(e); res.status(500).json({ error: 'No se han podido leer las ofertas.' }); }
  });
}
