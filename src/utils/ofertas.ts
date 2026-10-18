// ============================================================================
// OFERTAS — las reglas que comparten la ficha, la cesta y el servidor
// (2026-10-18, Wikiproducts W5)
// ============================================================================
// Una oferta es un producto × un distribuidor: su precio, su envío, su plazo y
// lo que ese distribuidor nos paga por enseñarla (la comisión). Esto vive aquí,
// compartido entre cliente y servidor como `bloques.ts`, para que el orden que
// ve quien mira la ficha y el que comprueba la prueba sean el mismo código.
//
// ── LA REGLA QUE NO SE ROMPE: EL ORDEN NUNCA LEE LA COMISIÓN ────────────────
// Código ético de Wikiproducts: «está prohibido mostrar productos por el
// interés propio de Wikiproducts». Las ofertas se ordenan por lo que paga quien
// compra (precio + envío), y a igualdad por la nota de atención al cliente del
// distribuidor. `ordenarOfertas` recibe las ofertas SIN su comisión: el tipo no
// la deja pasar, así que no hay forma de ordenarlas por ella sin cambiar esta
// firma — que es lo que vigila `scripts/probar-ofertas.ts`.

export type OfertaOrdenable = {
  /** Lo que se cobra por la unidad, en céntimos. `null` = la tienda no lo publica. */
  precio_centimos: number | null;
  /** El envío de esta oferta; `null` = no se sabe (va después de las que sí). */
  envio_centimos: number | null;
  /** Nota media de atención al cliente del distribuidor (1–5), si la hay. */
  nota_distribuidor?: number | null;
  distribuidor_nombre?: string | null;
  agotada?: boolean;
};

/** Lo que paga quien compra por una unidad. Sin precio no hay total. */
export const totalOferta = (o: OfertaOrdenable) =>
  o.precio_centimos === null ? null : o.precio_centimos + (o.envio_centimos ?? 0);

/**
 * El orden de la tabla «Dónde comprarlo»: primero las que se pueden comprar,
 * luego la más barata puesta en casa, luego la mejor atención al cliente, y por
 * último el nombre (para que dos iguales salgan siempre en el mismo orden).
 *
 * Acepta cualquier objeto con más campos, pero solo LEE los de
 * `OfertaOrdenable`. La comisión no está entre ellos.
 */
export function ordenarOfertas<T extends OfertaOrdenable>(ofertas: T[]): T[] {
  const clave = (o: OfertaOrdenable): OfertaOrdenable => ({
    precio_centimos: o.precio_centimos, envio_centimos: o.envio_centimos,
    nota_distribuidor: o.nota_distribuidor ?? null, distribuidor_nombre: o.distribuidor_nombre ?? '', agotada: !!o.agotada,
  });
  return ofertas
    .map((o, i) => ({ o, k: clave(o), i }))
    .sort((a, b) => {
      if (a.k.agotada !== b.k.agotada) return a.k.agotada ? 1 : -1;
      const ta = totalOferta(a.k), tb = totalOferta(b.k);
      if (ta === null && tb !== null) return 1;
      if (tb === null && ta !== null) return -1;
      if (ta !== null && tb !== null && ta !== tb) return ta - tb;
      const na = a.k.nota_distribuidor ?? -1, nb = b.k.nota_distribuidor ?? -1;
      if (na !== nb) return nb - na;
      const n = String(a.k.distribuidor_nombre).localeCompare(String(b.k.distribuidor_nombre), 'es', { sensitivity: 'base' });
      return n !== 0 ? n : a.i - b.i;
    })
    .map(x => x.o);
}

/** La comisión de una línea, en céntimos: sobre lo que paga quien compra por
 *  los productos (sin el envío, que no es nuestro). `null` = sin acuerdo. */
export function comisionDeLinea(precioUnitarioCentimos: number, unidades: number, pct: number | null | undefined): number | null {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct)) || Number(pct) <= 0) return null;
  return Math.round((precioUnitarioCentimos * unidades * Number(pct)) / 100);
}

const dinero = (c: number, moneda = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(c / 100);

/** La frase que acompaña a cada línea. La misma en la ficha, la cesta y el
 *  recibo: una promesa dicha de tres maneras acaba diciendo tres cosas. */
export function textoComision(pct: number | null | undefined, centimos: number | null | undefined, moneda = 'EUR'): string {
  if (pct === null || pct === undefined || Number(pct) <= 0) return 'Sin comisión: Wikiproducts no cobra nada por esta oferta.';
  const pctTxt = Number(pct).toLocaleString('es-ES', { maximumFractionDigits: 2 });
  return centimos !== null && centimos !== undefined
    ? `Comisión: ${pctTxt} % (${dinero(centimos, moneda)}). La paga la tienda; tú pagas el mismo precio que en ella.`
    : `Comisión: ${pctTxt} %. La paga la tienda; tú pagas el mismo precio que en ella.`;
}

/** El `rel` de un enlace de compra a la tienda. Google pide `sponsored` cuando
 *  el enlace nos reporta dinero (requisito R17 de SEO); sin acuerdo, el enlace
 *  sigue sin pasar autoridad a una tienda que no hemos elegido nosotros. */
export const relEnlaceTienda = (pct: number | null | undefined) =>
  pct !== null && pct !== undefined && Number(pct) > 0 ? 'sponsored noopener' : 'nofollow noopener';

const fechaLarga = (iso: string) => { const d = new Date(`${iso.slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); };

/** «2 sin precio confirmado», for the summary line. */
export const textoSinPrecio = (n: number) => `${n === 1 ? 'una' : n} sin precio confirmado`;

/**
 * WHY A SHOP HAS NO PRICE (2026-10-18, evaluator round 1). A bare «Precio no
 * publicado» read as a broken card. The honest reason is almost always the
 * same: whoever loaded the data could not read the price on the shop's page
 * (sold out, or the page would not load) on the day it was checked. So say
 * that, with the date, and send people to the shop to see it themselves.
 * The same sentence goes into the HTML for search engines (`server/ofertas.ts`) and the sheet (`Lectura.tsx`).
 */
export function motivoSinPrecio(o: { agotada: boolean; comprobado: string | null; enlace: string | null }): string {
  if (o.agotada) return 'Agotado en esta tienda cuando lo miramos.';
  const cuando = o.comprobado ? ` el ${fechaLarga(o.comprobado)}` : '';
  return o.enlace
    ? `No pudimos confirmar el precio en su web${cuando}: puede estar agotado o haber cambiado. Míralo directamente en la tienda.`
    : `No pudimos confirmar el precio en esta tienda${cuando}.`;
}


// ── THE SHOP'S CONDITIONS (2026-10-18, evaluator round 2, fix 3) ────────────
// An Amazon-style purchase box: delivery, shipping, returns, warranty, stock
// and when the price was checked. Delivery, returns and warranty belong to the
// SHOP, not to the product, so they are typed properties of the distributor
// row («Distribuidores», found by `rol`); the offer row can override delivery
// and shipping with its own `plazo`/`envio`. Every line below can also say «we
// don't know», distinguishable from a value — never «Entrega: desconocido».

export type CondicionesTienda = {
  /** `false` = the shop does not deliver to Spain (its other conditions are for its own country). */
  envia_a_espana: boolean | null;
  entrega_min_dias: number | null;
  entrega_max_dias: number | null;
  /** Standard shipping when the order is below the free threshold; 0 = always free. */
  envio_centimos: number | null;
  /** Order amount from which shipping is free; 0 = always free. */
  envio_gratis_desde_centimos: number | null;
  devolucion_dias: number | null;
  devolucion_gratis: boolean | null;
  /** «La tienda», «La marca» or «La tienda o la marca». */
  garantia: string | null;
  /** The shop's own policy page, and the day it was read. */
  condiciones_url: string | null;
  condiciones_fecha: string | null;
};

type ConCondiciones = {
  precio_centimos: number | null; envio_centimos: number | null; moneda: string;
  stock: number | null; agotada: boolean; plazo: string | null; comprobado: string | null;
  compra?: unknown; tienda?: CondicionesTienda | null;
};

const dineroCorto = (c: number, moneda = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda, minimumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);

/** A loaded «desconocido» / «no publicado» is the absence of a value, not one. */
const plazoReal = (p: string | null) => (p && !/^(desconocido|no publicado|no indicado|n\/?d|-)$/i.test(p.trim()) ? p.trim() : null);

export function textoEntrega(o: ConCondiciones): string | null {
  const p = plazoReal(o.plazo);
  if (p) return `Entrega: ${p}`;
  const t = o.tienda;
  const a = t?.entrega_min_dias ?? t?.entrega_max_dias ?? null, b = t?.entrega_max_dias ?? a;
  if (a === null || b === null) return null;
  // Shops publish working days, calendar days or just «días»; the unit each one
  // used travels in the value's provenance note, so the box says only «días».
  return a === b ? `Entrega en ${a} ${a === 1 ? 'día' : 'días'}` : `Entrega en ${a}–${b} días`;
}

/** Shipping when the offer itself does not say it, from the shop's rule and this price. */
export function textoEnvioTienda(o: ConCondiciones): string | null {
  const t = o.tienda;
  if (!t || o.envio_centimos !== null) return null;
  const desde = t.envio_gratis_desde_centimos, coste = t.envio_centimos;
  if (desde === 0 || coste === 0) return 'Envío gratis';
  if (desde !== null && o.precio_centimos !== null && o.precio_centimos >= desde) return `Envío gratis (pedidos desde ${dineroCorto(desde, o.moneda)})`;
  if (coste !== null) return `Envío ${dineroCorto(coste, o.moneda)}${desde !== null ? `, gratis desde ${dineroCorto(desde, o.moneda)}` : ''}`;
  if (desde !== null) return `Envío gratis desde ${dineroCorto(desde, o.moneda)}`;
  return null;
}

export function textoDevolucion(t: CondicionesTienda | null | undefined): string | null {
  if (!t || t.devolucion_dias === null) return null;
  const d = `${t.devolucion_dias} días`;
  return t.devolucion_gratis === true ? `Devolución gratuita en ${d}`
    : t.devolucion_gratis === false ? `Devolución en ${d} (la vuelta la pagas tú)` : `Devolución en ${d}`;
}

export function textoGarantia(t: CondicionesTienda | null | undefined): string | null {
  if (!t?.garantia) return null;
  return `Garantía: la gestiona ${t.garantia.charAt(0).toLowerCase()}${t.garantia.slice(1)}`;
}

export function textoStock(o: ConCondiciones): string {
  if (o.agotada) return 'Agotado';
  if (o.stock === null) return 'Disponibilidad sin confirmar';
  return o.stock <= 5 ? `Quedan ${o.stock}` : 'En stock';
}

/**
 * The purchase box, line by line, in a fixed order. Shipping is not here: it
 * sits next to the price (`textoEnvioTienda` when the offer does not say it). A line the shop does not
 * publish says so, so a reader can tell «unknown» from «forgotten».
 */
export function lineasCompra(o: ConCondiciones): Array<{ clave: string; texto: string; sabido: boolean }> {
  const t = o.tienda || null;
  const l = [
    ...(t?.envia_a_espana === false ? [{ clave: 'pais', texto: 'No envía a España: estas condiciones son las de su país', falta: '' }] : []),
    { clave: 'entrega', texto: textoEntrega(o), falta: 'Plazo de entrega: la tienda no lo publica' },
    { clave: 'devolucion', texto: textoDevolucion(t), falta: 'Devoluciones: la tienda no lo publica' },
    { clave: 'garantia', texto: textoGarantia(t), falta: 'Garantía: no sabemos quién la gestiona' },
    { clave: 'stock', texto: textoStock(o), falta: '' },
    ...(o.precio_centimos !== null && o.comprobado ? [{ clave: 'comprobado', texto: `Precio comprobado el ${fechaLarga(o.comprobado)}`, falta: '' }] : []),
  ];
  return l.map(x => ({ clave: x.clave, texto: x.texto || x.falta, sabido: !!x.texto }));
}

export const textoCondiciones = (t: CondicionesTienda | null | undefined) =>
  t?.condiciones_url ? `Condiciones de la tienda${t.condiciones_fecha ? ` (consultadas el ${fechaLarga(t.condiciones_fecha)})` : ''}` : null;
