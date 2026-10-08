// ============================================================================
// TABLES · A SHOP INSIDE A DATABASE (2026-10-06)
// ============================================================================
// Eugenio: «que el creador de páginas se pueda utilizar también para crear
// productos… cuando tú creas una base de datos, vas a poder crear una propiedad
// que sea precio, otra que sea variante… y una propiedad puede ser botón de
// compra, con el selector de unidades».
//
// ── THE IDEA: A ROW IS A PRODUCT, AND A PRODUCT IS ALREADY BUILT ────────────
// Everything that happens after «Añadir a la cesta» — the cart, checkout,
// stock reservations, orders, payouts, receipts — already exists and works on
// the `products` table. Rebuilding it for database rows would be a second shop
// with its own bugs. So each row of a table that has a «Botón de compra»
// column is backed by one ordinary product, and this file keeps the copy in
// step with the row.
//
// ── PROPERTIES ARE ROLES, NOT NEW TYPES ─────────────────────────────────────
// «Precio» and «Envío» are `moneda` columns, «Stock» a `numero`, «Variantes» a
// `seleccion_multiple` — each with `config.rol`. They sort, filter, sum and
// chart like any other column of their type, with zero new code there. The
// only new type is `compra`, the button, which stores nothing in the row.
//
// ── WHEN THE COPY IS MADE: ON READ, AND ONLY IF SOMETHING CHANGED ───────────
// A row changes through a dozen doors — a cell, a renamed title, an uploaded
// photo, a renamed option, the AI filling cells. Hooking every door is how one
// gets forgotten. Instead the copy happens when the table is read (which is
// the only moment a buy button can be seen, and so pressed): each row's
// relevant values are hashed, compared with `products.bd_huella`, and only a
// changed row writes. A table read twice in a row writes nothing the second
// time. Cost: one SELECT per read of a shop table, plus the writes of rows
// that actually changed. Recorded in memory/03_DECISIONS.md.
import { sql } from 'drizzle-orm';
import { createHash } from 'crypto';

/** Same cap as `POST /api/publicar/mis-productos` for unverified sellers: a
 *  500-row table must not become 500 products behind the limit's back. */
const MAX_SIN_VERIFICAR = 30;

export type CompraFila = {
  producto_id: string | null;
  nombre: string;
  precio_centimos: number | null;
  moneda: string;
  envio_centimos: number | null;
  stock: number | null;
  variantes: { id: string; nombre: string }[];
  /** Cómo se comporta el botón (2026-10-08): `comprar` va derecho al pago, `carrito` añade a la
   *  cesta, `donar` deja elegir cuánto (sin IVA) y `recompensa` es una donación con algo a cambio. */
  modo: 'comprar' | 'carrito' | 'donar' | 'recompensa';
  /** Qué recibe quien apoya, en `recompensa`. */
  recompensa: string | null;
  /** Why it cannot be bought, in words for the person looking. */
  motivo?: string;
};

const rol = (c: any) => c?.config?.rol;
const valorDe = (celda: any) => (celda && celda.estado === 'ok' ? celda.valor : null);
const aCentimos = (v: any) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null);

/** The column playing a role, if any. First one wins, like the title column. */
export function columnaConRol(columnas: any[], r: string, tipos: string[]) {
  return columnas.find(c => rol(c) === r && tipos.includes(c.tipo)) || null;
}

const nuevoId = (p: string) => p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();

/** Variants by NAME: an option renamed in the column renames the variant;
 *  one unticked in the row is deactivated, never deleted — an order line may
 *  still point at it. */
async function sincronizarVariantes(db: any, productoId: string, nombres: string[]) {
  const r = await db.execute(sql`SELECT id, nombre FROM producto_variantes WHERE producto_id = ${productoId}`);
  const porNombre = new Map((r.rows as any[]).map(v => [String(v.nombre).toLowerCase(), v.id as string]));
  const vivas: string[] = [];
  for (const [i, nombre] of nombres.entries()) {
    const ya = porNombre.get(nombre.toLowerCase());
    if (ya) {
      await db.execute(sql`UPDATE producto_variantes SET nombre = ${nombre}, orden = ${i}, activo = true, updated_at = now() WHERE id = ${ya}`);
      vivas.push(ya);
    } else {
      const id = nuevoId('VAR');
      await db.execute(sql`INSERT INTO producto_variantes (id, producto_id, nombre, orden) VALUES (${id}, ${productoId}, ${nombre}, ${i})`);
      vivas.push(id);
    }
  }
  await db.execute(sql`
    UPDATE producto_variantes SET activo = false, updated_at = now()
    WHERE producto_id = ${productoId} AND activo = true
      AND NOT (id = ANY(string_to_array(${vivas.join(',') || '-'}, ',')))
  `);
}

/**
 * Bring the products behind a table's rows in line with the rows, and return
 * what each row's buy button needs. Rows the reader cannot see (filtered out
 * later) are included: the copy is about the table, not about this view.
 */
export async function sincronizarTienda(db: any, args: {
  tablaId: string; duenoId: string; columnas: any[]; colTitulo: string | null;
  filas: Array<{ id: string; celdas: Record<string, any>; archivos: Record<string, any[]> }>;
}): Promise<Record<string, CompraFila>> {
  const { tablaId, duenoId, columnas, colTitulo, filas } = args;
  const salida: Record<string, CompraFila> = {};

  // No button any more (column deleted): the products stop being for sale.
  // They are archived, not deleted — orders may name them.
  if (!columnas.some(c => c.tipo === 'compra')) {
    await db.execute(sql`UPDATE products SET archived_at = now(), updated_at = now() WHERE bd_tabla_id = ${tablaId} AND archived_at IS NULL`);
    return salida;
  }

  const cPrecio = columnaConRol(columnas, 'precio', ['moneda', 'numero']);
  const cEnvio = columnaConRol(columnas, 'envio', ['moneda', 'numero']);
  const cStock = columnaConRol(columnas, 'stock', ['numero']);
  const cVar = columnaConRol(columnas, 'variantes', ['seleccion_multiple', 'seleccion']);
  const cImg = columnas.find(c => c.tipo === 'imagen') || null;
  // LAS CUATRO FORMAS DEL BOTÓN (2026-10-08). Sin `modo` (los de antes) es la cesta.
  const MODOS = ['comprar', 'carrito', 'donar', 'recompensa'] as const;
  const cBoton = columnas.find(c => c.tipo === 'compra');
  const modo: CompraFila['modo'] = MODOS.includes(cBoton?.config?.modo) ? cBoton.config.modo : 'carrito';
  const esDonacion = modo === 'donar' || modo === 'recompensa';
  const cRecompensa = columnaConRol(columnas, 'recompensa', ['texto']);
  // Qué es el producto de detrás: lo que se envía es físico; una donación no se envía ni se descarga
  // (y la recompensa sólo se envía si la base de datos tiene propiedad «Envío»).
  const kind = modo === 'donar' ? 'servicio' : modo === 'recompensa' ? (cEnvio ? 'fisico' : 'servicio') : 'fisico';
  const moneda = String(cPrecio?.config?.moneda || 'EUR').toUpperCase();

  const ex = new Map<string, any>();
  if (filas.length) {
    const r = await db.execute(sql`
      SELECT id, bd_fila_id, bd_huella, status, archived_at, envio_centimos FROM products
      WHERE bd_fila_id = ANY(string_to_array(${filas.map(f => f.id).join(',')}, ','))
    `);
    for (const p of r.rows as any[]) ex.set(p.bd_fila_id, p);
  }

  // The seller's standing decides where a new product shows, exactly as in
  // the product form: verified → the common market too; otherwise their shop.
  const u = (await db.execute(sql`SELECT role_level FROM users WHERE id = ${duenoId}`)).rows[0] as any;
  const nivel = Number(u?.role_level ?? 1);
  const estadoVendible = nivel >= 2 ? 'activo' : 'tienda';
  let libres = Infinity;
  if (nivel < 2) {
    const n = (await db.execute(sql`SELECT COUNT(*) AS n FROM products WHERE created_by = ${duenoId} AND archived_at IS NULL`)).rows[0] as any;
    libres = Math.max(0, MAX_SIN_VERIFICAR - Number(n?.n || 0));
  }

  const opcionLabel = new Map<string, string>((cVar?.opciones || []).map((o: any) => [o.id, String(o.label)]));

  for (const fila of filas) {
    const nombre = String(valorDe(colTitulo ? fila.celdas[colTitulo] : null) || '').trim().slice(0, 200) || 'Sin nombre';
    const precioPuesto = cPrecio ? aCentimos(valorDe(fila.celdas[cPrecio.id])) : null;
    // Una donación sin importe sugerido sale con 5 €: es el que se ofrece de entrada, se puede cambiar.
    const precio = precioPuesto ?? (modo === 'donar' ? 500 : null);
    const textoRecompensa = modo === 'recompensa' && cRecompensa ? (String(valorDe(fila.celdas[cRecompensa.id]) || '').trim().slice(0, 500) || null) : null;
    const envio = cEnvio ? aCentimos(valorDe(fila.celdas[cEnvio.id])) : null;
    const stockBruto = cStock ? valorDe(fila.celdas[cStock.id]) : null;
    const stock = !esDonacion && typeof stockBruto === 'number' && Number.isFinite(stockBruto) ? Math.max(0, Math.round(stockBruto)) : (modo === 'recompensa' && typeof stockBruto === 'number' && Number.isFinite(stockBruto) ? Math.max(0, Math.round(stockBruto)) : null);
    const imagenes = cImg ? (fila.archivos?.[cImg.id] || []).map((a: any) => a.url).filter(Boolean).slice(0, 8) : [];
    const marcadas = cVar ? valorDe(fila.celdas[cVar.id]) : null;
    const variantes = (Array.isArray(marcadas) ? marcadas : marcadas ? [marcadas] : [])
      .map((id: string) => opcionLabel.get(id)).filter(Boolean) as string[];

    const base: CompraFila = { producto_id: null, nombre, precio_centimos: precio, moneda, envio_centimos: envio, stock, variantes: [], modo, recompensa: textoRecompensa };
    const huella = createHash('sha1').update(JSON.stringify([nombre, precio, moneda, envio, stock, imagenes, variantes, modo, textoRecompensa])).digest('hex');
    const actual = ex.get(fila.id);

    if (!actual) {
      if (libres <= 0) {
        salida[fila.id] = { ...base, motivo: `De momento puedes tener ${MAX_SIN_VERIFICAR} productos. Para vender más, verifica tu cuenta.` };
        continue;
      }
      const id = nuevoId('PRD');
      const r = await db.execute(sql`
        INSERT INTO products (id, name, category, price_cents, currency, kind, modality, stock, images, status,
                              created_by, updated_by, envio_centimos, acepta_puntos, bd_fila_id, bd_tabla_id, bd_huella,
                              bd_modo, description, iva_pct)
        VALUES (${id}, ${nombre}, 'OTROS', ${precio}, ${moneda}, ${kind}, 'unico', ${stock}, ${JSON.stringify(imagenes)}::jsonb,
                ${precio === null ? 'borrador' : estadoVendible}, ${duenoId}, ${duenoId}, ${envio}, false,
                ${fila.id}, ${tablaId}, ${huella}, ${modo}, ${textoRecompensa}, ${esDonacion ? 0 : null})
        ON CONFLICT (bd_fila_id) WHERE bd_fila_id IS NOT NULL DO NOTHING
        RETURNING id
      `);
      // Two readers at once: the other one won the insert. Use theirs.
      const pid = (r.rows[0] as any)?.id
        ?? ((await db.execute(sql`SELECT id FROM products WHERE bd_fila_id = ${fila.id}`)).rows[0] as any)?.id;
      if ((r.rows[0] as any)?.id) { libres--; await sincronizarVariantes(db, pid, variantes); }
      salida[fila.id] = { ...base, producto_id: pid };
    } else {
      if (actual.bd_huella !== huella || actual.archived_at) {
        // A row with no price is a draft: there is nothing to charge. One that
        // gets a price comes out of draft; any other status the seller chose
        // in Comercio (paused, for instance) is respected.
        await db.execute(sql`
          UPDATE products SET name = ${nombre}, price_cents = ${precio}, currency = ${moneda}, stock = ${stock},
                 images = ${JSON.stringify(imagenes)}::jsonb, envio_centimos = ${envio}, bd_huella = ${huella},
                 bd_tabla_id = ${tablaId}, archived_at = NULL, updated_by = ${duenoId}, updated_at = now(),
                 kind = ${kind}, bd_modo = ${modo}, description = ${textoRecompensa},
                 -- Una donación no lleva IVA. Si deja de serlo, vuelve al IVA que tuviera por defecto el vendedor.
                 iva_pct = CASE WHEN ${esDonacion} THEN 0 WHEN bd_modo IN ('donar', 'recompensa') THEN NULL ELSE iva_pct END,
                 status = CASE WHEN ${precio}::int IS NULL THEN 'borrador'
                               WHEN status = 'borrador' THEN ${estadoVendible} ELSE status END
          WHERE id = ${actual.id}
        `);
        await sincronizarVariantes(db, actual.id, variantes);
        // El precio de envío cambió: las zonas que seguían con el precio de
        // antes lo siguen; una que el vendedor ajustó a mano se queda como está.
        const antes = actual.envio_centimos === null || actual.envio_centimos === undefined ? 0 : Number(actual.envio_centimos);
        const ahora = envio ?? 0;
        if (antes !== ahora) {
          await db.execute(sql`UPDATE producto_envio_zonas SET centimos = ${ahora}, updated_at = now() WHERE producto_id = ${actual.id} AND centimos = ${antes}`);
        }
      }
      salida[fila.id] = { ...base, producto_id: actual.id };
    }
  }

  // Rows that are gone (trash, archive) stop selling.
  await db.execute(sql`
    UPDATE products SET archived_at = now(), updated_at = now()
    WHERE bd_tabla_id = ${tablaId} AND archived_at IS NULL
      AND NOT (bd_fila_id = ANY(string_to_array(${filas.map(f => f.id).join(',') || '-'}, ',')))
  `);

  // Variant ids for the buttons, in one query.
  const pids = Object.values(salida).map(s => s.producto_id).filter(Boolean) as string[];

  // LAS ZONAS DE ENVÍO (2026-10-08). El carrito no cobra el envío de un
  // producto físico si no tiene tarifa para la zona del destino: sin ninguna,
  // el cliente leía «no se envía a ese destino» en TODOS los pedidos, que era
  // lo que le pasaba a un producto salido de una base de datos (esta ruta
  // creaba el producto pero nunca sus tarifas). Aquí se garantiza que cada
  // producto tiene las cuatro zonas: con el precio de la columna «Envío» o
  // gratis si no hay (o no se rellenó), igual en todas. Solo se INSERTA lo que
  // falta: lo que el vendedor ajustó a mano en Comercio no se pisa. Una sola
  // consulta para toda la tabla, también para los productos de antes de este
  // arreglo.
  if (pids.length) {
    await db.execute(sql`
      INSERT INTO producto_envio_zonas (producto_id, zona, centimos, updated_at)
      SELECT p.id, z.zona, COALESCE(p.envio_centimos, 0), now()
      FROM products p CROSS JOIN (VALUES ('peninsula'), ('no_peninsular'), ('europa'), ('resto')) AS z(zona)
      WHERE p.id = ANY(string_to_array(${pids.join(',')}, ','))
      ON CONFLICT (producto_id, zona) DO NOTHING
    `);
  }
  if (pids.length) {
    const r = await db.execute(sql`
      SELECT id, producto_id, nombre FROM producto_variantes
      WHERE activo = true AND producto_id = ANY(string_to_array(${pids.join(',')}, ','))
      ORDER BY orden, created_at
    `);
    const porProducto = new Map<string, { id: string; nombre: string }[]>();
    for (const v of r.rows as any[]) (porProducto.get(v.producto_id) || porProducto.set(v.producto_id, []).get(v.producto_id)!).push({ id: v.id, nombre: v.nombre });
    for (const s of Object.values(salida)) if (s.producto_id) s.variantes = porProducto.get(s.producto_id) || [];
  }
  return salida;
}
