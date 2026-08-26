// ============================================================================
// DIRECCIONES PÚBLICAS — el nombre de cada usuario y el de cada página
// ============================================================================
// Hasta hoy una página publicada se compartía como
// `humanity.wiki/paginas/KWMSKG9OVGZZ`: no se puede dictar por teléfono, no
// dice de qué va y no dice de quién es.
//
// Lo que hay aquí es la RESERVA DEL NOMBRE, no la forma de servirlo. Esa
// separación es deliberada y es lo que permite que el subdominio llegue después
// sin romper ningún enlace ya compartido:
//
//     hoy          humanity.wiki/@lighthumanity/astillero-solar
//     con comodín  lighthumanity.humanity.wiki/astillero-solar
//
// Las dos direcciones se resuelven contra las mismas dos columnas. Lo único que
// falta para la segunda es un DNS comodín y un certificado, y ninguna de las dos
// cosas está en este repositorio (ver `drizzle/0054_direcciones_publicas.sql`).
//
// ── LA UNICIDAD ES POR USUARIO, NO GLOBAL ───────────────────────────────────
// Si hubiera una sola bolsa de direcciones, el primero que publicara
// «astillero-solar» se lo quedaría para siempre. Por eso el índice único es
// (usuario, slug): es exactamente para lo que sirve dar un subdominio a cada
// uno.
import type { Express, Request, Response } from 'express';
import { getStripe } from './stripe';
import { rutaLocalDeUpload } from './uploads';
import { puntosDescuentoActivo, puntosPorEuro, pagarConPuntos, devolverPuntos, comisionPuntosBps } from './puntos';
import { avisar } from './avisos';
import { avisarPorWhatsApp, enlaceWa, estadoWhatsApp } from './whatsapp.js';
import { ZONAS, zonaDe, tarifasDe, calcularEnvio, type Zona } from './zonasEnvio.js';
import { AJUSTES, ajuste, guardarAjuste, numeroSincrono, olvidarAjustes } from './ajustes.js';
import { anotarLiquidacion, retenerLiquidacion, cancelarLiquidacion, pagarLiquidaciones, cobroAgregadoActivo } from './liquidaciones.js';
import { normalizarTelefono } from '../utils/telefono.js';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';

/** El alfabeto de un subdominio: minúsculas, números y guiones interiores. */
const FORMATO_HANDLE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;

/**
 * Convierte un texto libre en algo que pueda vivir en una dirección.
 *
 * Quita los acentos en vez de rechazar la palabra: «Astillero Solar — Operación»
 * tiene que poder llegar a «astillero-solar-operacion» sin que nadie tenga que
 * saber qué caracteres se admiten. Fallar aquí y pedirle al usuario que lo
 * arregle sería trasladarle un problema nuestro.
 */
export function aDireccion(texto: string): string {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // «ó» → «o»
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                        // todo lo demás, un guión
    .replace(/^-+|-+$/g, '')                            // sin guiones en los bordes
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');                                // por si el corte dejó uno
}

/** Por qué NO vale un nombre, o `null` si vale. En español: se le enseña. */
export function motivoInvalido(handle: string): string | null {
  if (!handle) return 'Escribe un nombre.';
  if (handle.length < 3) return 'Necesita al menos 3 caracteres.';
  if (handle.length > 30) return 'Como mucho 30 caracteres.';
  if (!FORMATO_HANDLE.test(handle)) {
    return 'Solo minúsculas, números y guiones, y no puede empezar ni acabar en guión.';
  }
  // Un nombre que es solo números se confunde con un identificador y además
  // impide que algún día una ruta pueda distinguirlos.
  if (/^[0-9]+$/.test(handle)) return 'No puede ser solo números.';
  return null;
}

export function registerPublicarRoutes(app: Express, db: any) {
  // ==========================================================================
  // DATOS FISCALES DEL VENDEDOR Y RECIBO (2026-08-23, comercio F4)
  // ==========================================================================
  // Regla (Dashboard, 23-08): nada inventado ni vacío en un documento fiscal.
  // Sin datos fiscales completos, el comprador recibe un RECIBO (no fiscal,
  // sin número). Con ellos, y SOLO cuando Eugenio y su asesor digan cómo se
  // factura en nombre del vendedor, habrá factura numerada: correlativa, con
  // el número sacado en la misma transacción que la crea, y con los datos
  // fiscales copiados dentro. Hoy no se emite nada numerado.
  const IVAS_VALIDOS = [21, 10, 4, 0];
  // Con menos de estas reseñas verificadas no se enseña la valoración del
  // vendedor (acordado con el Dashboard, 23-08: con 16 usuarios, 3; el día
  // que haya 500 opiniones, subirlo es cambiar este número).
  const MIN_RESENAS_VALORACION_VENDEDOR = 3;
  const limpiaTexto = (v: any, max: number) => { const t = String(v ?? '').trim(); return t ? t.slice(0, max) : null; };
  const fiscalCompleto = (f: any) => !!(f && f.nombre_fiscal && f.nif && f.direccion && f.cp && f.ciudad);

  /** GET /api/publicar/mis-datos-fiscales — lo que declaré de mí. */
  app.get('/api/publicar/mis-datos-fiscales', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const f = (await db.execute(sql`SELECT * FROM datos_fiscales WHERE user_id = ${req.user.id}`)).rows[0] as any;
      res.json({ datos: f || null, completos: fiscalCompleto(f), nota: 'Sin estos datos, tus compradores reciben un recibo (no fiscal). Con ellos, cuando la plataforma pueda emitir facturas en tu nombre, una factura numerada.' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  /** PUT /api/publicar/mis-datos-fiscales — guardar. Valida lo básico; no inventa nada. */
  app.put('/api/publicar/mis-datos-fiscales', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const b = req.body || {};
      const iva = b.iva_defecto === undefined || b.iva_defecto === null || b.iva_defecto === '' ? 21 : Number(b.iva_defecto);
      if (!IVAS_VALIDOS.includes(iva)) return res.status(400).json({ error: 'El IVA por defecto tiene que ser 21, 10, 4 o 0.' });
      const nif = limpiaTexto(b.nif, 20)?.toUpperCase().replace(/[\s-]/g, '') || null;
      if (nif && !/^[A-Z0-9]{8,15}$/.test(nif)) return res.status(400).json({ error: 'El NIF no tiene buena pinta: letras y números, sin espacios.' });
      await db.execute(sql`
        INSERT INTO datos_fiscales (user_id, nombre_fiscal, nif, direccion, cp, ciudad, pais, iva_defecto, serie_factura, updated_at)
        VALUES (${req.user.id}, ${limpiaTexto(b.nombre_fiscal, 200)}, ${nif}, ${limpiaTexto(b.direccion, 300)}, ${limpiaTexto(b.cp, 12)}, ${limpiaTexto(b.ciudad, 120)},
                ${(limpiaTexto(b.pais, 2) || 'ES').toUpperCase()}, ${iva}, ${limpiaTexto(b.serie_factura, 20)}, now())
        ON CONFLICT (user_id) DO UPDATE SET nombre_fiscal = EXCLUDED.nombre_fiscal, nif = EXCLUDED.nif, direccion = EXCLUDED.direccion, cp = EXCLUDED.cp,
          ciudad = EXCLUDED.ciudad, pais = EXCLUDED.pais, iva_defecto = EXCLUDED.iva_defecto, serie_factura = EXCLUDED.serie_factura, updated_at = now()
      `);
      const f = (await db.execute(sql`SELECT * FROM datos_fiscales WHERE user_id = ${req.user.id}`)).rows[0] as any;
      res.json({ datos: f, completos: fiscalCompleto(f) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * El RECIBO de un pedido: qué se compró, qué se pagó y con qué. NO es una
   * factura: no lleva número, y lo dice. Si el vendedor tiene datos fiscales
   * completos, se enseñan y se añade un desglose de IVA INFORMATIVO
   * (precios con IVA incluido: base = total / (1 + tipo)). Lo usan comprador
   * (por código + correo o sesión) y vendedor (sus ventas): el mismo papel.
   */
  const construirRecibo = async (pedidoId: string) => {
    const p = (await db.execute(sql`
      SELECT pd.*, u.display_name AS vendedor_nombre, u.handle AS vendedor_handle, u.email AS vendedor_email
      FROM pedidos pd LEFT JOIN users u ON u.id = pd.vendedor_user_id WHERE pd.id = ${pedidoId}
    `)).rows[0] as any;
    if (!p) return null;
    const fiscal = p.vendedor_user_id ? (await db.execute(sql`SELECT * FROM datos_fiscales WHERE user_id = ${p.vendedor_user_id}`)).rows[0] as any : null;
    const ivaDefecto = Number(fiscal?.iva_defecto ?? 21);
    let lineas = (await db.execute(sql`
      SELECT l.producto_nombre, l.unidades, l.precio_unitario_centimos, l.variante_nombre, pr.iva_pct
      FROM pedido_lineas l LEFT JOIN products pr ON pr.id = l.producto_id WHERE l.pedido_id = ${p.id} ORDER BY l.created_at
    `)).rows as any[];
    if (!lineas.length) {
      // Pedidos de antes del carrito: una sola cosa, sin líneas.
      const pr = p.producto_id ? (await db.execute(sql`SELECT iva_pct FROM products WHERE id = ${p.producto_id}`)).rows[0] as any : null;
      const unidades = Number(p.unidades || 1);
      const totalLinea = Number(p.importe_centimos || 0) - Number(p.envio_centimos || 0) + Number(p.descuento_centimos || 0);
      lineas = [{ producto_nombre: p.producto_nombre, unidades, precio_unitario_centimos: Math.round(totalLinea / Math.max(1, unidades)), variante_nombre: null, iva_pct: pr?.iva_pct ?? null }];
    }
    const subtotal = lineas.reduce((n, l) => n + Number(l.precio_unitario_centimos) * Number(l.unidades), 0);
    const descuento = Number(p.descuento_centimos || 0);
    const envio = Number(p.envio_centimos || 0);
    const puntos = Number(p.puntos_usados || 0);
    const totalEuros = Number(p.importe_centimos || 0);
    const completos = fiscalCompleto(fiscal);
    // Desglose informativo por tipo, sobre lo cobrado en euros: el descuento y
    // los puntos se reparten en proporción entre las líneas.
    let desglose: { tipo: number; base_centimos: number; cuota_centimos: number; total_centimos: number }[] | null = null;
    // Solo sobre lo COBRADO EN EUROS: lo pagado con puntos no lleva IVA en
    // euros (una compra entera en puntos no tiene desglose). El envío se
    // considera cobrado en euros hasta donde lleguen los euros; el resto de
    // euros se reparte entre las líneas en proporción.
    if (completos && totalEuros > 0) {
      const porTipo = new Map<number, number>();
      const envioEuros = Math.min(envio, totalEuros);
      const factor = subtotal > 0 ? Math.max(0, totalEuros - envioEuros) / subtotal : 0;
      for (const l of lineas) {
        const tipo = l.iva_pct === null || l.iva_pct === undefined ? ivaDefecto : Number(l.iva_pct);
        porTipo.set(tipo, (porTipo.get(tipo) || 0) + Math.round(Number(l.precio_unitario_centimos) * Number(l.unidades) * factor));
      }
      if (envioEuros > 0) porTipo.set(ivaDefecto, (porTipo.get(ivaDefecto) || 0) + envioEuros);
      desglose = [...porTipo.entries()].sort((a, b) => b[0] - a[0]).map(([tipo, total]) => {
        const base = Math.round(total / (1 + tipo / 100));
        return { tipo, base_centimos: base, cuota_centimos: total - base, total_centimos: total };
      });
    }
    return {
      tipo: 'recibo',
      aviso: 'Recibo de compra. No es una factura: no lleva número y no sustituye a una. Precios con IVA incluido.',
      codigo: p.codigo, fecha: p.created_at, estado: p.estado, moneda: p.moneda || 'EUR',
      comprador: { nombre: p.comprador_nombre || null, email: p.comprador_email || null, direccion: p.direccion_envio || null },
      vendedor: {
        nombre: p.vendedor_nombre || null, tienda: p.vendedor_handle || null,
        fiscal: completos ? { nombre_fiscal: fiscal.nombre_fiscal, nif: fiscal.nif, direccion: fiscal.direccion, cp: fiscal.cp, ciudad: fiscal.ciudad, pais: fiscal.pais } : null,
      },
      lineas: lineas.map(l => ({ nombre: l.producto_nombre, variante: l.variante_nombre || null, unidades: Number(l.unidades), precio_unitario_centimos: Number(l.precio_unitario_centimos), total_centimos: Number(l.precio_unitario_centimos) * Number(l.unidades), iva_pct: completos ? (l.iva_pct === null || l.iva_pct === undefined ? ivaDefecto : Number(l.iva_pct)) : null })),
      subtotal_centimos: subtotal, descuento_centimos: descuento, cupon: p.cupon_codigo || null, envio_centimos: envio,
      puntos_usados: puntos, total_euros_centimos: totalEuros,
      desglose_iva: desglose,
    };
  };
  /** GET /api/publicar/pedido/:codigo/recibo?correo= — el recibo, para quien compró (correo o sesión). */
  app.get('/api/publicar/pedido/:codigo/recibo', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || '').toUpperCase().trim();
      const correo = String(req.query.correo || '').toLowerCase().trim();
      const quien = req.user?.id || null;
      if (!codigo || (!correo && !quien)) return res.status(400).json({ error: 'Hacen falta el código y el correo con el que se compró.' });
      const r = await db.execute(sql`
        SELECT id FROM pedidos WHERE codigo = ${codigo}
          AND ((${correo} <> '' AND lower(comprador_email) = ${correo}) OR (${quien}::text IS NOT NULL AND comprador_user_id = ${quien}))
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'No hay ningún pedido con ese código y ese correo.' });
      res.json(await construirRecibo((r.rows[0] as any).id));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  /** GET /api/publicar/mis-ventas/:id/recibo — el mismo recibo, para quien vendió. */
  app.get('/api/publicar/mis-ventas/:id/recibo', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`SELECT id FROM pedidos WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}`);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese pedido no es tuyo o no existe.' });
      res.json(await construirRecibo((r.rows[0] as any).id));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // CARRITO ABANDONADO Y FAVORITOS (2026-08-23, comercio F3)
  // ==========================================================================
  const dominioPublico = () => process.env.DOMINIO_PUBLICO || 'humanity.wiki';

  /** PUT /api/publicar/cesta { tienda, lineas } — guardar la cesta de quien tiene sesión (vacía = borrarla). */
  app.put('/api/publicar/cesta', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión no se guarda la cesta.' });
      const tienda = String(req.body?.tienda || '').trim().toLowerCase().slice(0, 80);
      if (!tienda) return res.status(400).json({ error: 'Falta la tienda.' });
      const lineas = Array.isArray(req.body?.lineas) ? req.body.lineas.slice(0, 20).map((l: any) => ({
        producto_id: String(l?.producto_id || ''), cantidad: Math.max(1, Math.min(99, Number(l?.cantidad) || 1)),
        nombre: String(l?.nombre || '').slice(0, 200), precio_centimos: Number(l?.precio_centimos) || 0,
        ...(l?.variante_id ? { variante_id: String(l.variante_id), variante_nombre: String(l.variante_nombre || '').slice(0, 120) } : {}),
      })).filter((l: any) => l.producto_id) : [];
      if (!lineas.length) {
        await db.execute(sql`DELETE FROM cestas_guardadas WHERE user_id = ${req.user.id} AND tienda = ${tienda}`);
        return res.json({ guardada: false, vacia: true });
      }
      // Cambiar la cesta reinicia el aviso: si vuelve a tocarla, el reloj de
      // las 24 h empieza de nuevo y el aviso puede repetirse más adelante.
      await db.execute(sql`
        INSERT INTO cestas_guardadas (user_id, tienda, lineas, updated_at, avisada_at)
        VALUES (${req.user.id}, ${tienda}, ${JSON.stringify(lineas)}::jsonb, now(), NULL)
        ON CONFLICT (user_id, tienda) DO UPDATE SET lineas = EXCLUDED.lineas, updated_at = now(), avisada_at = NULL
      `);
      res.json({ guardada: true, lineas: lineas.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/publicar/cesta?tienda= — la cesta guardada, para recuperarla en otro dispositivo. */
  app.get('/api/publicar/cesta', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      const tienda = String(req.query.tienda || '').trim().toLowerCase();
      const r = await db.execute(sql`SELECT lineas, updated_at FROM cestas_guardadas WHERE user_id = ${req.user.id} AND tienda = ${tienda}`);
      const f = r.rows[0] as any;
      res.json({ lineas: f?.lineas || [], updated_at: f?.updated_at || null });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/publicar/favoritos — mis favoritos (ids y ficha breve). */
  app.get('/api/publicar/favoritos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      const r = await db.execute(sql`
        SELECT f.producto_id, f.precio_centimos AS precio_guardado, f.created_at,
               p.name, p.price_cents, p.currency, p.images, p.status, p.archived_at, p.created_by,
               u.handle AS tienda
        FROM favoritos_productos f
        LEFT JOIN products p ON p.id = f.producto_id
        LEFT JOIN users u ON u.id = p.created_by
        WHERE f.user_id = ${req.user.id}
        ORDER BY f.created_at DESC
      `);
      res.json({
        ids: (r.rows as any[]).map(x => x.producto_id),
        favoritos: (r.rows as any[]).map(x => ({
          producto_id: x.producto_id, nombre: x.name, precio_centimos: x.price_cents, precio_guardado: x.precio_guardado,
          moneda: x.currency || 'EUR', imagen: Array.isArray(x.images) ? x.images[0] || null : null,
          disponible: !!x.name && !x.archived_at && x.status !== 'borrador',
          tienda: x.tienda || null, url: x.tienda ? `https://${x.tienda}.${dominioPublico()}/producto/${encodeURIComponent(x.producto_id)}` : null,
          guardado_en: x.created_at,
        })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  /** PUT /api/publicar/favoritos/:id — guardar; DELETE — quitar. */
  app.put('/api/publicar/favoritos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Entra para guardar favoritos.' });
      const p = (await db.execute(sql`SELECT id, price_cents FROM products WHERE id = ${String(req.params.id)} AND archived_at IS NULL`)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no existe.' });
      await db.execute(sql`
        INSERT INTO favoritos_productos (user_id, producto_id, precio_centimos) VALUES (${req.user.id}, ${p.id}, ${p.price_cents ?? null})
        ON CONFLICT (user_id, producto_id) DO NOTHING
      `);
      res.json({ favorito: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete('/api/publicar/favoritos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      await db.execute(sql`DELETE FROM favoritos_productos WHERE user_id = ${req.user.id} AND producto_id = ${String(req.params.id)}`);
      res.json({ favorito: false });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Los dos barridos, cada hora (y a los 3 min de arrancar): cestas olvidadas
  // (24 h sin tocar, una vez por cesta) y bajadas de precio de favoritos (una
  // vez por precio). No escriben nada salvo el aviso.
  const barridoComercio = async () => {
    const olvidadas = await db.execute(sql`
      SELECT c.user_id, c.tienda, c.lineas FROM cestas_guardadas c JOIN users u ON u.id = c.user_id
      WHERE jsonb_array_length(c.lineas) > 0 AND c.avisada_at IS NULL AND c.updated_at < now() - interval '24 hours'
        AND u.archived_at IS NULL
        -- Quien lo apagó (revisión del Dashboard: la mitad de las cestas a
        -- medias son gente que miró y decidió que no) no recibe el aviso.
        AND coalesce(u.ui_settings->>'aviso_cesta', 'on') <> 'off'
      LIMIT 200
    `);
    for (const c of olvidadas.rows as any[]) {
      const n = (c.lineas as any[]).reduce((k, l) => k + (Number(l.cantidad) || 1), 0);
      const primera = (c.lineas as any[])[0]?.nombre || 'algo';
      await avisar(db, {
        paraQuien: c.user_id, dePartede: null, tipo: 'cesta_olvidada', entidadTipo: 'cestas', entidadId: `${c.tienda}:${Date.now()}`,
        datos: { texto: `Dejaste ${n === 1 ? primera : `${n} cosas (${primera}…)`} en la cesta de ${c.tienda}. Sigue ahí. (Este aviso se apaga desde la propia cesta.)`, tienda: c.tienda, destino: `https://${c.tienda}.${dominioPublico()}/?cesta=abrir` },
      });
      await db.execute(sql`UPDATE cestas_guardadas SET avisada_at = now() WHERE user_id = ${c.user_id} AND tienda = ${c.tienda}`);
    }
    const bajadas = await db.execute(sql`
      SELECT f.user_id, f.producto_id, f.precio_centimos AS guardado, p.price_cents AS actual, p.name, u.handle AS tienda
      FROM favoritos_productos f JOIN products p ON p.id = f.producto_id LEFT JOIN users u ON u.id = p.created_by
      WHERE f.precio_centimos IS NOT NULL AND p.price_cents IS NOT NULL AND p.price_cents < f.precio_centimos
        AND p.archived_at IS NULL AND p.status <> 'borrador'
        -- Al propio vendedor no: bajó él el precio.
        AND p.created_by IS DISTINCT FROM f.user_id
      LIMIT 500
    `);
    for (const b of bajadas.rows as any[]) {
      const fmt = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
      await avisar(db, {
        paraQuien: b.user_id, dePartede: null, tipo: 'precio_bajado', entidadTipo: 'favoritos', entidadId: `${b.producto_id}:${b.actual}`,
        datos: { texto: `${b.name} ha bajado de ${fmt(Number(b.guardado))} a ${fmt(Number(b.actual))}.`, producto_id: b.producto_id, destino: b.tienda ? `https://${b.tienda}.${dominioPublico()}/producto/${encodeURIComponent(b.producto_id)}` : '/mercado' },
      });
      await db.execute(sql`UPDATE favoritos_productos SET precio_centimos = ${Number(b.actual)} WHERE user_id = ${b.user_id} AND producto_id = ${b.producto_id}`);
    }
    // «Avísame cuando vuelva» (F5): pendientes cuyo producto (o variante) ya
    // tiene stock disponible (descontando reservas). Stock nulo = no se lleva
    // la cuenta = disponible.
    const pendientes = await db.execute(sql`
      SELECT a.user_id, a.producto_id, a.variante_id, p.name, p.stock AS stock_producto, v.stock AS stock_variante, v.nombre AS variante_nombre, v.activo AS variante_activa, u.handle AS tienda
      FROM avisos_stock a JOIN products p ON p.id = a.producto_id LEFT JOIN producto_variantes v ON v.id = a.variante_id LEFT JOIN users u ON u.id = p.created_by
      WHERE a.avisado_at IS NULL AND p.archived_at IS NULL AND p.status <> 'borrador'
      LIMIT 500
    `);
    let vueltas = 0;
    for (const a of pendientes.rows as any[]) {
      if (a.variante_id && a.variante_activa === false) continue;
      const bruto = a.variante_id ? a.stock_variante : a.stock_producto;
      const disponible = bruto === null || bruto === undefined ? Infinity : Number(bruto) - await reservado(db, a.producto_id, a.variante_id || null);
      if (disponible <= 0) continue;
      const nombre = `${a.name}${a.variante_nombre ? ` — ${a.variante_nombre}` : ''}`;
      await avisar(db, {
        paraQuien: a.user_id, dePartede: null, tipo: 'vuelve_stock', entidadTipo: 'stock', entidadId: `${a.producto_id}:${a.variante_id || ''}:${Date.now()}`,
        datos: { texto: `${nombre} vuelve a estar disponible.`, producto_id: a.producto_id, destino: a.tienda ? `https://${a.tienda}.${dominioPublico()}/producto/${encodeURIComponent(a.producto_id)}` : '/mercado' },
      });
      await db.execute(sql`UPDATE avisos_stock SET avisado_at = now() WHERE user_id = ${a.user_id} AND producto_id = ${a.producto_id} AND coalesce(variante_id, '') = coalesce(${a.variante_id}::text, '')`);
      vueltas++;
    }
    if (olvidadas.rows.length || bajadas.rows.length || vueltas) console.log(`[comercio] barrido: ${olvidadas.rows.length} cestas olvidadas avisadas, ${bajadas.rows.length} bajadas de precio avisadas, ${vueltas} vueltas de stock avisadas.`);
    return { cestas_olvidadas_avisadas: olvidadas.rows.length, bajadas_de_precio_avisadas: bajadas.rows.length, vueltas_de_stock_avisadas: vueltas };
  };
  /** GET/PUT /api/publicar/preferencias — de momento, solo si quieres el aviso de cesta olvidada. */
  app.get('/api/publicar/preferencias', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      const r = (await db.execute(sql`SELECT ui_settings FROM users WHERE id = ${req.user.id}`)).rows[0] as any;
      res.json({ aviso_cesta: (r?.ui_settings?.aviso_cesta ?? 'on') !== 'off' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put('/api/publicar/preferencias', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      if (typeof req.body?.aviso_cesta === 'boolean') {
        await db.execute(sql`UPDATE users SET ui_settings = coalesce(ui_settings, '{}'::jsonb) || ${JSON.stringify({ aviso_cesta: req.body.aviso_cesta ? 'on' : 'off' })}::jsonb WHERE id = ${req.user.id}`);
      }
      const r = (await db.execute(sql`SELECT ui_settings FROM users WHERE id = ${req.user.id}`)).rows[0] as any;
      res.json({ aviso_cesta: (r?.ui_settings?.aviso_cesta ?? 'on') !== 'off' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** PUT /api/publicar/avisame/:productoId { variante_id? } — avísame cuando vuelva; DELETE — ya no. */
  app.put('/api/publicar/avisame/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Entra para que te avisemos.' });
      const p = (await db.execute(sql`SELECT id FROM products WHERE id = ${String(req.params.id)} AND archived_at IS NULL`)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no existe.' });
      const vid = String(req.body?.variante_id || '').trim() || null;
      await db.execute(sql`
        INSERT INTO avisos_stock (user_id, producto_id, variante_id) VALUES (${req.user.id}, ${p.id}, ${vid})
        ON CONFLICT (user_id, producto_id, coalesce(variante_id, '')) DO UPDATE SET avisado_at = NULL, created_at = now()
      `);
      res.json({ avisame: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete('/api/publicar/avisame/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      const vid = String(req.query.variante_id || '').trim() || null;
      await db.execute(sql`DELETE FROM avisos_stock WHERE user_id = ${req.user.id} AND producto_id = ${String(req.params.id)} AND coalesce(variante_id, '') = coalesce(${vid}::text, '')`);
      res.json({ avisame: false });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  /** GET /api/publicar/avisame/:id — ¿tengo pedido aviso para este producto (y variante)? */
  app.get('/api/publicar/avisame/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Sin sesión.' });
      const r = await db.execute(sql`SELECT variante_id, avisado_at FROM avisos_stock WHERE user_id = ${req.user.id} AND producto_id = ${String(req.params.id)}`);
      res.json({ pedidos: (r.rows as any[]).map(x => ({ variante_id: x.variante_id, avisado: !!x.avisado_at })) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // DEVOLUCIONES A PETICIÓN DE QUIEN COMPRÓ (2026-08-24, comercio F7)
  // ==========================================================================
  // Eugenio: «sí, que la pida el comprador». Antes solo el vendedor podía
  // marcar devuelto; quien había comprado tenía que escribirle y confiar.
  // Ahora: la pide con un motivo, el vendedor acepta o rechaza diciendo por
  // qué, y LOS PUNTOS VUELVEN SOLO AL ACEPTAR — nunca al pedirla, que sería
  // devolver por decisión de una sola parte.
  const diasParaDevolver = () => Math.max(1, numeroSincrono('DIAS_PARA_DEVOLVER'));

  /** POST /api/publicar/pedido/:codigo/devolucion { motivo, correo? } — la pide quien compró. */
  app.post('/api/publicar/pedido/:codigo/devolucion', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || '').toUpperCase().trim();
      const correo = String(req.body?.correo || '').toLowerCase().trim();
      const quien = req.user?.id || null;
      const motivo = String(req.body?.motivo || '').trim().slice(0, 1000);
      if (!motivo) return res.status(400).json({ error: 'Cuenta qué ha pasado: el vendedor necesita saberlo para decidir.' });
      if (!codigo || (!correo && !quien)) return res.status(400).json({ error: 'Hacen falta el código y el correo con el que se compró.' });
      const p = (await db.execute(sql`
        SELECT id, codigo, estado, created_at, vendedor_user_id, producto_nombre, comprador_user_id, comprador_email, telefono_contacto
        FROM pedidos WHERE codigo = ${codigo}
          AND ((${correo} <> '' AND lower(comprador_email) = ${correo}) OR (${quien}::text IS NOT NULL AND comprador_user_id = ${quien}))
      `)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'No hay ningún pedido con ese código y ese correo.' });
      if (['devuelto', 'cancelado'].includes(p.estado)) return res.status(409).json({ error: `Ese pedido ya está ${p.estado}.` });
      const dias = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
      if (dias > diasParaDevolver()) return res.status(409).json({ error: `El plazo para pedir la devolución es de ${diasParaDevolver()} días y este pedido es de hace ${Math.floor(dias)}. Escribe al vendedor: puede aceptarla igual.` });
      try {
        await db.execute(sql`
          INSERT INTO devoluciones (id, pedido_id, pedida_por, pedida_email, motivo)
          VALUES (${'DEV' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
                  ${p.id}, ${quien}, ${correo || p.comprador_email || null}, ${motivo})
        `);
      } catch (e: any) {
        const t = `${e?.message || ''} ${e?.cause?.message || ''}`;
        if (/devoluciones_una_viva_idx|duplicate key/i.test(t)) return res.status(409).json({ error: 'Ya has pedido la devolución de este pedido y el vendedor todavía no ha contestado.' });
        throw e;
      }
      // Si el dinero lo cobró la plataforma, lo que se le debe a la tienda
      // queda RETENIDO mientras se decide: pagarle y luego pedírselo de vuelta
      // es la forma segura de no recuperarlo nunca.
      await retenerLiquidacion(db, p.id, `Devolución pedida: ${motivo.slice(0, 120)}`);
      await avisar(db, {
        paraQuien: p.vendedor_user_id, dePartede: quien, tipo: 'devolucion_pedida', entidadTipo: 'pedidos', entidadId: p.id,
        datos: { texto: `Piden devolver el pedido ${p.codigo} (${p.producto_nombre}): «${motivo.slice(0, 120)}»`, codigo: p.codigo, destino: '/comercio?pestana=pedidos' },
      });
      res.json({ pedida: true, codigo: p.codigo, nota: 'El vendedor tiene que aceptarla. Si la acepta y pagaste con puntos, te vuelven en ese momento.' });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** PUT /api/publicar/mis-ventas/:id/devolucion { acepta, respuesta? } — la resuelve quien vendió. */
  app.put('/api/publicar/mis-ventas/:id/devolucion', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const acepta = req.body?.acepta === true;
      const respuesta = String(req.body?.respuesta || '').trim().slice(0, 1000) || null;
      if (!acepta && !respuesta) return res.status(400).json({ error: 'Si la rechazas, di por qué: quien compró tiene derecho a saberlo.' });
      const p = (await db.execute(sql`
        SELECT id, codigo, estado, producto_nombre, comprador_user_id, telefono_contacto FROM pedidos
        WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}
      `)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese pedido no es tuyo o no existe.' });
      const d = (await db.execute(sql`SELECT id FROM devoluciones WHERE pedido_id = ${p.id} AND estado = 'pedida' ORDER BY created_at DESC LIMIT 1`)).rows[0] as any;
      if (!d) return res.status(404).json({ error: 'No hay ninguna devolución pendiente de este pedido.' });

      // ACEPTAR mueve dinero: primero vuelven los puntos, y solo si vuelven
      // enteros se marca. Una devolución a medias es peor que ninguna.
      let puntosDevueltos = 0;
      if (acepta) {
        if (!['devuelto', 'cancelado'].includes(p.estado)) {
          const dev = await devolverPuntos(db, p.id);
          if (!dev.ok) return res.status(409).json({ error: dev.motivo || 'No se han podido devolver los puntos.' });
          puntosDevueltos = dev.puntos || 0;
        }
        await db.execute(sql`UPDATE pedidos SET estado = 'devuelto', updated_at = now() WHERE id = ${p.id}`);
        // Aceptada: la tienda ya no cobra ese pedido.
        await cancelarLiquidacion(db, p.id, 'Devolución aceptada por la tienda.');
      }
      await db.execute(sql`
        UPDATE devoluciones SET estado = ${acepta ? 'aceptada' : 'rechazada'}, respuesta = ${respuesta}, resuelta_por = ${req.user.id}, resuelta_en = now()
        WHERE id = ${d.id}
      `);
      if (!acepta) {
        // Rechazada: se levanta la retención y la tienda vuelve a la cola de cobro.
        await db.execute(sql`
          UPDATE liquidaciones SET estado = 'pendiente', motivo_retencion = NULL, updated_at = now()
          WHERE pedido_id = ${p.id} AND estado = 'retenida'
        `);
      }
      const texto = acepta
        ? `Tu devolución del pedido ${p.codigo} (${p.producto_nombre}) ha sido aceptada${puntosDevueltos > 0 ? `: te vuelven ${puntosDevueltos} puntos` : ''}.${respuesta ? ` «${respuesta.slice(0, 120)}»` : ''}`
        : `Tu devolución del pedido ${p.codigo} (${p.producto_nombre}) ha sido rechazada: «${(respuesta || '').slice(0, 160)}»`;
      await avisar(db, {
        paraQuien: p.comprador_user_id, dePartede: req.user.id, tipo: 'devolucion_resuelta', entidadTipo: 'pedidos', entidadId: p.id,
        datos: { texto, codigo: p.codigo, destino: `/pedido?codigo=${p.codigo}` },
      });
      await avisarPorWhatsApp(db, {
        telefono: p.telefono_contacto, userId: p.comprador_user_id, motivo: 'devolucion', entidadTipo: 'devoluciones', entidadId: d.id,
        texto, parametros: [p.codigo, p.producto_nombre || ''],
      });
      res.json({ resuelta: acepta ? 'aceptada' : 'rechazada', puntos_devueltos: puntosDevueltos });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/publicar/producto/:id/encestado — «alguien lo ha echado a la
   * cesta». Sin sesión y sin cuerpo: es un recuento, no un registro de quién.
   * La cesta lo llama al añadir; si falla, no pasa nada.
   */
  app.post('/api/publicar/producto/:id/encestado', async (req: Request, res: Response) => {
    try {
      await db.execute(sql`
        INSERT INTO producto_metricas (producto_id, dia, encestados) VALUES (${String(req.params.id)}, current_date, 1)
        ON CONFLICT (producto_id, dia) DO UPDATE SET encestados = producto_metricas.encestados + 1
      `);
      res.json({ ok: true });
    } catch { res.json({ ok: false }); }
  });

  /**
   * GET /api/publicar/mis-productos/analitica?dias=30 — ¿se ve?, ¿se enceta?,
   * ¿se compra? Por producto, de mis productos. Las compras salen de los
   * pedidos (la verdad), no de un contador aparte que podría desviarse.
   */
  app.get('/api/publicar/mis-productos/analitica', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const dias = Math.min(365, Math.max(1, Math.floor(Number(req.query.dias) || 30)));
      const r = await db.execute(sql`
        WITH mios AS (SELECT id, name, price_cents, currency, status FROM products WHERE created_by = ${req.user.id} AND archived_at IS NULL),
        m AS (
          SELECT producto_id, sum(visitas)::int AS visitas, sum(encestados)::int AS encestados
          FROM producto_metricas WHERE dia >= current_date - ${dias}::int GROUP BY producto_id
        ),
        v AS (
          SELECT l.producto_id, sum(l.unidades)::int AS unidades, count(DISTINCT l.pedido_id)::int AS pedidos
          FROM pedido_lineas l JOIN pedidos pd ON pd.id = l.pedido_id
          WHERE pd.estado NOT IN ('cancelado', 'devuelto') AND pd.created_at >= now() - make_interval(days => ${dias})
          GROUP BY l.producto_id
        )
        SELECT mios.id, mios.name, mios.price_cents, mios.currency, mios.status,
               coalesce(m.visitas, 0) AS visitas, coalesce(m.encestados, 0) AS encestados,
               coalesce(v.unidades, 0) AS unidades, coalesce(v.pedidos, 0) AS pedidos
        FROM mios LEFT JOIN m ON m.producto_id = mios.id LEFT JOIN v ON v.producto_id = mios.id
        ORDER BY coalesce(v.pedidos, 0) DESC, coalesce(m.visitas, 0) DESC
      `);
      const filas = (r.rows as any[]).map(f => ({
        id: f.id, nombre: f.name, precio_centimos: f.price_cents, moneda: f.currency || 'EUR', status: f.status,
        visitas: Number(f.visitas), encestados: Number(f.encestados), pedidos: Number(f.pedidos), unidades: Number(f.unidades),
        // Los porcentajes solo cuando hay suelo suficiente para que signifiquen
        // algo: con 3 visitas, «33 % compra» es una anécdota con aspecto de dato.
        de_visita_a_cesta: Number(f.visitas) >= 10 ? Math.round((Number(f.encestados) / Number(f.visitas)) * 1000) / 10 : null,
        de_visita_a_compra: Number(f.visitas) >= 10 ? Math.round((Number(f.pedidos) / Number(f.visitas)) * 1000) / 10 : null,
      }));
      res.json({
        dias, productos: filas,
        totales: {
          visitas: filas.reduce((n, f) => n + f.visitas, 0),
          encestados: filas.reduce((n, f) => n + f.encestados, 0),
          pedidos: filas.reduce((n, f) => n + f.pedidos, 0),
        },
        nota: 'Visitas, no personas: quien entra tres veces cuenta tres. Los porcentajes aparecen a partir de 10 visitas; con menos no dicen nada.',
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // TARIFAS DE ENVÍO POR ZONA Y RECOGIDA (2026-08-24, comercio F8)
  // ==========================================================================
  /** GET /api/publicar/mis-productos/:id/envio — las tarifas de un producto mío. */
  app.get('/api/publicar/mis-productos/:id/envio', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const p = (await db.execute(sql`SELECT id, recogida_en_persona, recogida_donde FROM products WHERE id = ${String(req.params.id)} AND created_by = ${req.user.id}`)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no es tuyo o no existe.' });
      res.json({
        zonas: ZONAS,
        tarifas: (await tarifasDe(db, [p.id])).get(p.id) || [],
        recogida_en_persona: !!p.recogida_en_persona,
        recogida_donde: p.recogida_donde || null,
        nota: 'Una zona sin tarifa es una zona a la que no envías: quien viva ahí lo sabrá antes de pagar, no después.',
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  /** PUT /api/publicar/mis-productos/:id/envio { tarifas: [{zona, centimos, gratis_desde_centimos}], recogida_en_persona, recogida_donde } */
  app.put('/api/publicar/mis-productos/:id/envio', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const p = (await db.execute(sql`SELECT id FROM products WHERE id = ${String(req.params.id)} AND created_by = ${req.user.id}`)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no es tuyo o no existe.' });
      const validas = new Set<string>(ZONAS.map(z => z.id));
      const filas = (Array.isArray(req.body?.tarifas) ? req.body.tarifas : [])
        .filter((t: any) => validas.has(String(t?.zona)) && t?.centimos !== null && t?.centimos !== undefined && t?.centimos !== '')
        .map((t: any) => ({
          zona: String(t.zona) as Zona, centimos: Math.max(0, Math.round(Number(t.centimos) || 0)),
          gratis: t.gratis_desde_centimos === null || t.gratis_desde_centimos === undefined || t.gratis_desde_centimos === '' ? null : Math.max(0, Math.round(Number(t.gratis_desde_centimos) || 0)),
        }));
      // La lista manda: una zona que no viene deja de tener tarifa, o sea,
      // deja de estar servida. Es la forma de dejar de enviar a un sitio.
      await db.execute(sql`DELETE FROM producto_envio_zonas WHERE producto_id = ${p.id}`);
      for (const f of filas) {
        await db.execute(sql`
          INSERT INTO producto_envio_zonas (producto_id, zona, centimos, gratis_desde_centimos, updated_at)
          VALUES (${p.id}, ${f.zona}, ${f.centimos}, ${f.gratis}, now())
          ON CONFLICT (producto_id, zona) DO UPDATE SET centimos = EXCLUDED.centimos, gratis_desde_centimos = EXCLUDED.gratis_desde_centimos, updated_at = now()
        `);
      }
      // La tarifa de península se refleja también en la columna vieja: hay
      // pantallas que la leen y no tienen por qué enterarse de las zonas.
      const peninsula = filas.find((f: any) => f.zona === 'peninsula');
      await db.execute(sql`
        UPDATE products SET
          envio_centimos = ${peninsula ? peninsula.centimos : null},
          envio_gratis_desde_centimos = ${peninsula ? peninsula.gratis : null},
          recogida_en_persona = ${req.body?.recogida_en_persona === true},
          recogida_donde = ${String(req.body?.recogida_donde || '').trim().slice(0, 300) || null},
          updated_at = now()
        WHERE id = ${p.id}
      `);
      res.json({ guardado: true, zonas_servidas: filas.length, recogida_en_persona: req.body?.recogida_en_persona === true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // ACUERDOS: QUIÉN FIRMÓ QUÉ Y CUÁNDO (2026-08-24)
  // ==========================================================================
  // El contrato de servicio de cobro es el que permite cobrar un carrito de
  // varias tiendas y liquidar después a cada una. Un contrato que no se puede
  // probar no vale: aquí se guarda la VERSIÓN aceptada, cuándo y desde dónde.
  // Si el contrato cambia, las aceptaciones viejas siguen diciendo lo que se
  // aceptó entonces.
  const VERSION_COBRO = process.env.VERSION_CONTRATO_COBRO || 'v1.0 · 24 de agosto de 2026';

  /** GET /api/publicar/acuerdos — qué he aceptado y qué me falta. */
  app.get('/api/publicar/acuerdos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT acuerdo, version, created_at FROM acuerdos_aceptados WHERE user_id = ${req.user.id} ORDER BY created_at DESC
      `);
      const filas = r.rows as any[];
      const cobro = filas.find(f => f.acuerdo === 'cobro' && f.version === VERSION_COBRO);
      res.json({
        aceptados: filas,
        cobro: {
          version_vigente: VERSION_COBRO,
          aceptado: !!cobro,
          aceptado_en: cobro?.created_at || null,
          // Si firmó una versión anterior, se dice: hay que volver a aceptar.
          version_anterior: !cobro && filas.some(f => f.acuerdo === 'cobro') ? filas.find(f => f.acuerdo === 'cobro')?.version : null,
        },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** POST /api/publicar/acuerdos { acuerdo: 'cobro' } — aceptar la versión vigente. */
  app.post('/api/publicar/acuerdos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const acuerdo = String(req.body?.acuerdo || '').trim();
      if (acuerdo !== 'cobro') return res.status(400).json({ error: 'Ese acuerdo no existe.' });
      try {
        await db.execute(sql`
          INSERT INTO acuerdos_aceptados (id, user_id, acuerdo, version, ip, user_agent)
          VALUES (${'ACU' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
                  ${req.user.id}, ${acuerdo}, ${VERSION_COBRO}, ${String((req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.ip || '').slice(0, 60) || null}, ${String(req.headers['user-agent'] || '').slice(0, 300)})
        `);
      } catch (e: any) {
        const t = `${e?.message || ''} ${e?.cause?.message || ''}`;
        if (/acuerdos_aceptados_una_vez_idx|duplicate key/i.test(t)) return res.json({ aceptado: true, ya_estaba: true, version: VERSION_COBRO });
        throw e;
      }
      console.log(`[acuerdos] ${req.user.id} acepta «${acuerdo}» ${VERSION_COBRO}`);
      res.json({ aceptado: true, version: VERSION_COBRO });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** ¿Puede esta tienda entrar en el cobro agregado? Solo si firmó la versión vigente. */
  const aceptoElCobro = async (userId: string | null | undefined) => {
    if (!userId) return false;
    const r = await db.execute(sql`SELECT 1 FROM acuerdos_aceptados WHERE user_id = ${userId} AND acuerdo = 'cobro' AND version = ${VERSION_COBRO} LIMIT 1`);
    return r.rows.length > 0;
  };

  // ==========================================================================
  // EL PANEL ECONÓMICO (2026-08-24) — «que se cambie en todos los lugares»
  // ==========================================================================
  /** GET /api/publicar/mis-liquidaciones — lo que la plataforma me debe y cuándo me lo paga. */
  app.get('/api/publicar/mis-liquidaciones', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT l.id, l.pedido_id, p.codigo, p.producto_nombre, l.bruto_centimos, l.envio_centimos,
               l.comision_centimos, l.comision_bps, l.neto_centimos, l.moneda, l.estado, l.vence_el,
               l.pagada_en, l.transferencia_ref, l.motivo_retencion
        FROM liquidaciones l JOIN pedidos p ON p.id = l.pedido_id
        WHERE l.vendedor_user_id = ${req.user.id}
        ORDER BY l.created_at DESC LIMIT 100
      `);
      const filas = r.rows as any[];
      const suma = (e: string[]) => filas.filter(f => e.includes(f.estado)).reduce((n, f) => n + Number(f.neto_centimos), 0);
      res.json({
        liquidaciones: filas,
        por_cobrar_centimos: suma(['pendiente', 'lista']),
        retenido_centimos: suma(['retenida']),
        cobrado_centimos: suma(['pagada']),
        nota: 'Esto es solo lo que ha cobrado la plataforma por ti (carritos con varias tiendas). Lo que cobras tú en tu cuenta no aparece aquí.',
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** GET/POST /api/admin/liquidaciones — ver la cola y pasar el barrido (administrador). */
  app.get('/api/admin/liquidaciones', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      const porEstado = await db.execute(sql`
        SELECT estado, count(*)::int AS n, coalesce(sum(neto_centimos), 0)::int AS neto FROM liquidaciones GROUP BY estado
      `);
      const proximas = await db.execute(sql`
        SELECT l.id, l.vendedor_user_id, coalesce(u.display_name, u.name) AS tienda, l.neto_centimos, l.estado, l.vence_el
        FROM liquidaciones l LEFT JOIN users u ON u.id = l.vendedor_user_id
        WHERE l.estado IN ('pendiente', 'lista', 'retenida') ORDER BY l.vence_el LIMIT 30
      `);
      res.json({
        cobro_agregado_activo: cobroAgregadoActivo(),
        por_estado: porEstado.rows, proximas: proximas.rows,
        nota: cobroAgregadoActivo()
          ? 'El cobro agregado está encendido: las liquidaciones vencidas se transfieren solas.'
          : 'El cobro agregado está APAGADO (COBRO_AGREGADO=off): se calcula todo pero no se mueve dinero.',
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post('/api/admin/liquidaciones/pagar', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      res.json(await pagarLiquidaciones(db, () => getStripe()));
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // El barrido de liquidaciones, cada hora: marca vencidas y —solo con el
  // interruptor encendido— transfiere. Apagado, calcula y canta.
  const ticLiquidaciones = () => pagarLiquidaciones(db, () => getStripe()).catch(e => console.error('[liquidaciones] barrido fallido:', e.message));
  setTimeout(ticLiquidaciones, 4 * 60 * 1000);
  setInterval(ticLiquidaciones, 60 * 60 * 1000);

  /** GET /api/admin/economia — todas las cifras, su valor vigente y de dónde sale. */
  app.get('/api/admin/economia', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      const guardados = (await db.execute(sql`SELECT clave, valor, updated_at, actualizado_por FROM ajustes_economicos`)).rows as any[];
      const historial = (await db.execute(sql`
        SELECT h.clave, h.valor_antes, h.valor_nuevo, h.motivo, h.created_at, coalesce(u.display_name, u.name, u.email) AS quien
        FROM ajustes_economicos_historial h LEFT JOIN users u ON u.id = h.actor
        ORDER BY h.created_at DESC LIMIT 40
      `)).rows;
      const cifras = await Promise.all(AJUSTES.map(async a => {
        const fila = guardados.find(g => g.clave === a.clave);
        return {
          ...a,
          valor: await ajuste(db, a.clave),
          // De dónde sale el valor que rige ahora mismo: es la pregunta que
          // se hace cualquiera al ver un número raro.
          origen: fila ? 'panel' : process.env[a.clave] !== undefined ? 'servidor' : 'por defecto',
          cambiado_en: fila?.updated_at || null,
        };
      }));
      res.json({
        grupos: [...new Set(AJUSTES.map(a => a.grupo))],
        cifras, historial,
        nota: 'Lo que cambies aquí rige en toda la plataforma en menos de un minuto. Cada cambio queda con tu nombre, la fecha y el motivo.',
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** PUT /api/admin/economia { clave, valor, motivo? } — cambiar una cifra. */
  app.put('/api/admin/economia', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      const clave = String(req.body?.clave || '');
      const valor = String(req.body?.valor ?? '');
      await guardarAjuste(db, clave, valor, req.user.id, String(req.body?.motivo || '').trim().slice(0, 500) || undefined);
      olvidarAjustes();
      res.json({ guardado: true, clave, valor: await ajuste(db, clave) });
    } catch (e: any) {
      if (e?.publico) return res.status(400).json({ error: e.message });
      console.error(e); res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/admin/whatsapp — cómo está el canal y los últimos avisos (administrador). */
  app.get('/api/admin/whatsapp', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      const ultimos = await db.execute(sql`
        SELECT motivo, telefono, estado, texto, created_at FROM whatsapp_enviados ORDER BY created_at DESC LIMIT 30
      `);
      const cuenta = await db.execute(sql`SELECT estado, count(*)::int AS n FROM whatsapp_enviados GROUP BY estado`);
      res.json({
        ...estadoWhatsApp(),
        nota: 'Con el canal apagado, los avisos se calculan y se anotan como «simulado» pero NO salen de aquí. Para enviar de verdad hacen falta una cuenta de Meta Business verificada, un número dedicado y plantillas aprobadas por Meta.',
        por_estado: cuenta.rows,
        ultimos: ultimos.rows,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** POST /api/admin/comercio/barrido — pasar el barrido ahora (administrador). */
  app.post('/api/admin/comercio/barrido', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      res.json(await barridoComercio());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  const ticComercio = () => barridoComercio().catch(e => console.error('[comercio] barrido fallido:', e.message));
  setTimeout(ticComercio, 3 * 60 * 1000);
  setInterval(ticComercio, 60 * 60 * 1000);


  const exigeSesion = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    return true;
  };

  /** ¿Está cogido o reservado? Se pregunta a las dos tablas. */
  async function estaLibre(handle: string, exceptoUsuario: string | null): Promise<string | null> {
    const r = await db.execute(sql`SELECT motivo FROM handles_reservados WHERE handle = ${handle}`);
    if (r.rows[0]) return 'Ese nombre está reservado por la plataforma.';
    const u = await db.execute(sql`SELECT id FROM users WHERE handle = ${handle}`);
    const dueno = u.rows[0] as any;
    if (dueno && dueno.id !== exceptoUsuario) return 'Ese nombre ya está cogido.';
    return null;
  }

  // ── EL NOMBRE DEL USUARIO ─────────────────────────────────────────────────

  /**
   * Comprobar un nombre ANTES de guardarlo, para poder decirlo mientras se
   * escribe. Sin esto, la única forma de saber si está libre es intentar
   * guardarlo y que falle, que es la peor forma de enterarse.
   */
  app.get('/api/publicar/handle-libre', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const handle = aDireccion(String(req.query.handle || ''));
      const malo = motivoInvalido(handle);
      if (malo) return res.json({ libre: false, handle, motivo: malo });
      const cogido = await estaLibre(handle, req.user!.id);
      res.json({ libre: !cogido, handle, motivo: cogido });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Elegir o cambiar el nombre.
   *
   * SE PUEDE CAMBIAR, y el aviso de que los enlaces antiguos dejan de funcionar
   * se da en la interfaz. Prohibirlo sería más fácil para nosotros y peor para
   * quien se equivoca al escribirlo el primer día; y el nombre viejo NO se
   * libera aquí, se queda reservado a su antiguo dueño, para que nadie pueda
   * cogerlo al minuto siguiente y heredar los enlaces que ya circulan. Ése es
   * el fallo que convierte un cambio de nombre en una suplantación.
   */
  app.put('/api/publicar/handle', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const handle = aDireccion(String((req.body || {}).handle || ''));
      const malo = motivoInvalido(handle);
      if (malo) return res.status(400).json({ error: malo });
      const cogido = await estaLibre(handle, req.user!.id);
      if (cogido) return res.status(409).json({ error: cogido });

      const previo = await db.execute(sql`SELECT handle FROM users WHERE id = ${req.user!.id}`);
      const antiguo = (previo.rows[0] as any)?.handle as string | null;

      await db.execute(sql`UPDATE users SET handle = ${handle}, updated_at = now() WHERE id = ${req.user!.id}`);

      // El nombre que se abandona queda reservado. Cuesta una fila y evita que
      // los enlaces ya compartidos acaben apuntando a otra persona.
      if (antiguo && antiguo !== handle) {
        await db.execute(sql`
          INSERT INTO handles_reservados (handle, motivo)
          VALUES (${antiguo}, ${'abandonado por ' + req.user!.id})
          ON CONFLICT (handle) DO NOTHING
        `);
      }
      res.json({ handle, anterior: antiguo });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LA DIRECCIÓN DE UNA PÁGINA ────────────────────────────────────────────

  /**
   * Publicar una página en una dirección, o cambiarla.
   *
   * Si no se manda ninguna, se propone a partir del título — y se le añade un
   * sufijo solo SI hace falta, mirando primero si está libre. Numerar siempre
   * («astillero-solar-1» de entrada) ensucia la dirección de todo el mundo para
   * resolver un choque que casi nunca ocurre.
   */
  app.put('/api/publicar/paginas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const d = req.body || {};

      const p = await db.execute(sql`
        SELECT id, title, creator_user_id, publico, slug FROM knowledge_windows
        WHERE id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      const pagina = p.rows[0] as any;
      if (!pagina) return res.status(404).json({ error: 'Esa página no existe.' });
      if (pagina.creator_user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Solo quien creó la página puede publicarla.' });
      }

      const u = await db.execute(sql`SELECT handle FROM users WHERE id = ${req.user!.id}`);
      const handle = (u.rows[0] as any)?.handle as string | null;
      // No se puede publicar en una dirección sin tener nombre: la dirección
      // ENTERA es «<nombre>/<pagina>», así que falta la mitad. Se dice cuál.
      if (!handle) {
        return res.status(409).json({ error: 'Antes de publicar, elige tu nombre de espacio.', falta: 'handle' });
      }

      let slug = aDireccion(d.slug || pagina.slug || pagina.title || 'pagina');
      if (!slug) slug = 'pagina';

      // Libre DENTRO de este usuario. La misma dirección en otro espacio no
      // estorba, que es justamente el motivo de que haya espacios.
      const choca = async (s: string) => {
        const r = await db.execute(sql`
          SELECT id FROM knowledge_windows
          WHERE creator_user_id = ${req.user!.id} AND slug = ${s} AND id <> ${pagina.id}
            AND archived_at IS NULL AND deleted_at IS NULL
        `);
        return !!r.rows[0];
      };
      if (await choca(slug)) {
        let n = 2;
        while (await choca(`${slug}-${n}`) && n < 100) n++;
        slug = `${slug}-${n}`;
      }

      const publico = d.publico === undefined ? true : !!d.publico;
      const indexable = d.indexable === undefined ? undefined : !!d.indexable;

      await db.execute(sql`
        UPDATE knowledge_windows SET
          slug      = ${slug},
          publico   = ${publico},
          indexable = COALESCE(${indexable === undefined ? null : indexable}::boolean, indexable),
          updated_at = now()
        WHERE id = ${pagina.id}
      `);

      /*
       * ══ AL PUBLICAR, LA PÁGINA SE INDEXA EN SUS RAMAS (2026-08-25, fase 6
       * de «todo son páginas») ═══════════════════════════════════════════════
       * Eugenio: «cada página se indexa dentro del conocimiento de la
       * humanidad al publicarse; mientras esté privada no se indexa a ninguna
       * rama, y al dar a publicar se acepta que se indexa».
       *
       * `ramas` son ids de `subtemas`, elegidos en el diálogo (propuestos por
       * las palabras y editables — acordado con prog2, que tiene el árbol).
       * VARIAS ramas es lo correcto, no un caso raro: Eugenio decidió que esto
       * es un grafo, «como un micelio».
       *
       * Se borra y se reescribe la lista entera en vez de calcular diferencias:
       * la clave primaria de tres campos hace el insert idempotente, y así lo
       * que queda en la tabla es EXACTAMENTE lo que se eligió, ni una fila de
       * una publicación anterior.
       */
      if (Array.isArray(d.ramas)) {
        await db.execute(sql`
          DELETE FROM subtema_contenido WHERE tipo = 'pagina' AND entity_id = ${pagina.id}
        `);
        for (const rama of d.ramas.slice(0, 20)) {
          if (typeof rama !== 'string' || !rama) continue;
          await db.execute(sql`
            INSERT INTO subtema_contenido (subtema_id, tipo, entity_id, puesto_por)
            SELECT ${rama}, 'pagina', ${pagina.id}, ${req.user!.id}
            WHERE EXISTS (SELECT 1 FROM subtemas WHERE id = ${rama})
            ON CONFLICT DO NOTHING
          `);
        }
      }

      res.json({
        slug, handle, publico,
        // Se devuelven LAS DOS formas. La de ruta funciona hoy; la de subdominio
        // funcionará en cuanto exista el DNS comodín, y se manda ya para que la
        // interfaz no tenga que aprender la regla por su cuenta el día que
        // cambie.
        url: `/@${handle}/${slug}`,
        url_subdominio: `https://${handle}.humanity.wiki/${slug}`,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Dejar de publicar. La página no se toca: solo deja de ser alcanzable. */
  app.delete('/api/publicar/paginas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const p = await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${req.params.id}`);
      const pagina = p.rows[0] as any;
      if (!pagina) return res.status(404).json({ error: 'Esa página no existe.' });
      if (pagina.creator_user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Solo quien creó la página puede dejar de publicarla.' });
      }
      // El `slug` NO se borra: si vuelve a publicarse, recupera su misma
      // dirección y los enlaces que ya circulaban vuelven a funcionar.
      await db.execute(sql`UPDATE knowledge_windows SET publico = false, updated_at = now() WHERE id = ${req.params.id}`);
      // ══ DESPUBLICAR ES DESINDEXAR (fase 6) ══ Se BORRA la fila, no se
      // marca: una fila marcada la seguiría sumando la cuenta del árbol y el
      // subtema diría «3 páginas» con dos visibles (aviso de prog2, que ya
      // pisó esa piedra). El slug sí se queda, para que republicar recupere
      // la misma dirección.
      await db.execute(sql`
        DELETE FROM subtema_contenido WHERE tipo = 'pagina' AND entity_id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── RESOLVER UNA DIRECCIÓN ────────────────────────────────────────────────

  /**
   * De `<nombre>/<pagina>` a la página. Sirve para las dos formas de dirección:
   * la ruta la llama con el nombre del camino, y el día que exista el comodín la
   * llamará con el nombre sacado del `Host`. Por eso la resolución vive aquí y
   * no en el enrutador: cambiar de forma no debe cambiar de lógica.
   *
   * NO EXIGE SESIÓN — es la cara pública. Y solo devuelve lo público: una
   * página despublicada responde 404 igual que una que no existe, porque decir
   * «existe pero no puedes verla» ya filtra que existe.
   */
  /**
   * LA PORTADA DE UN ESPACIO — `/api/publicar/espacio/:handle`
   *
   * Quién es esta persona y qué tiene publicado. Es lo que se enseña al entrar
   * en `nombre.humanity.wiki` a secas, sin pedir página.
   *
   * Sin sesión, y a propósito: quien llega viene de fuera. Por eso devuelve
   * SOLO lo que su autor decidió publicar —`publico = true`— y nada más. Un
   * borrador, una página archivada o una que dejó de compartirse no salen de
   * aquí ni para su dueño: si hiciera falta verlas, se entra a la plataforma.
   *
   * Devuelve `null` en `espacio` si el nombre no existe, en vez de una lista
   * vacía. «Esta persona no existe» y «esta persona no ha publicado nada» son
   * dos respuestas distintas y la portada las enseña distinto.
   */
  app.get('/api/publicar/espacio/:handle', async (req: Request, res: Response) => {
    try {
      const handle = String(req.params.handle || '').toLowerCase();
      const u = (await db.execute(sql`
        SELECT id, handle, display_name, name, avatar_url, bio
        FROM users WHERE handle = ${handle}
      `)).rows[0] as any;
      if (!u) return res.status(404).json({ error: 'Ese espacio no existe.' });

      const paginas = (await db.execute(sql`
        SELECT id, title, slug, kind, updated_at, config
        FROM knowledge_windows
        WHERE creator_user_id = ${u.id}
          AND publico = true AND slug IS NOT NULL
          AND archived_at IS NULL AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 60
      `)).rows as any[];

      res.json({
        espacio: {
          handle: u.handle,
          nombre: u.display_name || u.name,
          avatar: u.avatar_url,
          bio: u.bio || null,
        },
        paginas: paginas.map(p => ({
          titulo: p.title,
          slug: p.slug,
          tipo: p.kind,
          actualizado: p.updated_at,
          // Un adelanto de una línea, para que la lista no sea sólo títulos.
          // Se saca del primer bloque con texto; si no hay, va `null` y la
          // tarjeta enseña sólo el título, que es honesto.
          adelanto: primerTexto(p.config),
        })),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * UN PRODUCTO PARA UNA PÁGINA PÚBLICA — `/api/publicar/producto/:id`
   *
   * Existe `GET /api/products`, pero devuelve el catálogo ENTERO. Una página
   * con tres productos no puede descargar todo el mercado tres veces.
   *
   * Sin sesión: es lo que ve quien llega por un enlace. Y devuelve sólo lo
   * que se enseña en un escaparate — nombre, precio, foto, disponibilidad,
   * garantía, devoluciones. Nada de quién lo creó ni a qué proyecto pertenece:
   * eso es del taller, no del escaparate.
   *
   * `stock` merece una nota. La columna admite nulo, y nulo NO es cero: «no
   * lleva la cuenta» y «se ha agotado» son dos cosas distintas y la tarjeta
   * las dice distinto. Aplastar una en la otra pondría «agotado» en todo lo
   * que nadie inventaría.
   */
  app.get('/api/publicar/producto/:id', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT id, name, description, price_cents, currency, images, kind, created_by, recogida_en_persona, recogida_donde,
               modality, billing_period, stock, warranty, return_policy, category,
               envio_centimos, envio_gratis_desde_centimos, envio_plazo, acepta_puntos,
               (SELECT round(avg(score) / 2.0, 1)::float FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS media_estrellas,
               (SELECT count(*)::int FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS n_resenas
        FROM products
        WHERE id = ${String(req.params.id)} AND archived_at IS NULL
          -- Un BORRADOR solo lo ve quien lo está escribiendo (2026-08-23):
          -- para el resto no existe, que es lo que «borrador» promete.
          AND (status <> 'borrador' OR created_by = ${req.user?.id || ''})
      `);
      const p = r.rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no existe.' });

      const imagenes = Array.isArray(p.images) ? p.images.filter((x: any) => typeof x === 'string') : [];
      // ¿SE VE ESTO? (F9, 2026-08-24): una visita más, hoy. No se guarda quién:
      // el recuento contesta la pregunta y el rastro no hace falta. Y no se
      // espera: que la ficha no dependa de una métrica.
      db.execute(sql`
        INSERT INTO producto_metricas (producto_id, dia, visitas) VALUES (${p.id}, current_date, 1)
        ON CONFLICT (producto_id, dia) DO UPDATE SET visitas = producto_metricas.visitas + 1
      `).catch(() => {});
      const variantes = (await variantesDe(db, [p.id])).get(p.id) || [];
      // RELACIONADOS (F5): otras cosas de la misma tienda, la misma categoría
      // primero. Solo de la misma tienda: la ficha vive en su subdominio.
      const relacionados = p.created_by ? (await db.execute(sql`
        SELECT id, name, price_cents, currency, images, category
        FROM products WHERE created_by = ${p.created_by} AND id <> ${p.id} AND archived_at IS NULL AND status IN ('activo', 'tienda')
        ORDER BY (category = ${p.category || ''}) DESC, created_at DESC LIMIT 6
      `)).rows as any[] : [];
      // VALORACIÓN DEL VENDEDOR (F5, acordado con el Dashboard): NADIE valora a
      // la persona; es el agregado de las reseñas de sus PRODUCTOS con compra
      // verificada, y con menos de 3 no se enseña nada (una sola «1,0» no es
      // una nota, es un enfado con aspecto de estadística).
      const valVendedor = p.created_by ? (await db.execute(sql`
        SELECT round(avg(r.score) / 2.0, 1)::float AS media, count(*)::int AS n
        FROM ratings r JOIN products pr ON pr.id = r.entity_id AND r.entity_type = 'products'
        WHERE pr.created_by = ${p.created_by} AND r.user_id <> pr.created_by
          AND EXISTS (
            SELECT 1 FROM pedidos pd LEFT JOIN pedido_lineas pl ON pl.pedido_id = pd.id LEFT JOIN users cu ON cu.id = r.user_id
            WHERE pd.estado NOT IN ('cancelado', 'devuelto') AND (pd.producto_id = pr.id OR pl.producto_id = pr.id)
              AND (pd.comprador_user_id = r.user_id OR (cu.email IS NOT NULL AND lower(pd.comprador_email) = lower(cu.email)))
          )
      `)).rows[0] as any : null;
      const nVal = Number(valVendedor?.n || 0);
      res.json({
        id: p.id,
        nombre: p.name,
        descripcion: p.description || null,
        precio_centimos: p.price_cents ?? null,
        moneda: p.currency || 'EUR',
        imagen: imagenes[0] || null,
        imagenes,
        tipo: p.kind || null,
        modalidad: p.modality || null,
        periodo: p.billing_period || null,
        // Una suscripción no cabe en una cesta: el cobro la rechaza si va con
        // cualquier otra cosa, porque un pago único y una cuota mensual no
        // tienen un «total» que signifique nada. Se dice AQUÍ para que la
        // tarjeta no pinte un botón que iba a fallar.
        se_puede_encestar: (p.modality || 'unico') !== 'suscripcion',
        // El stock que se enseña es el que se puede COMPRAR: lo que hay
        // menos lo que otra persona está pagando ahora mismo. Enseñar el
        // bruto pondría «queda 1» a alguien que va a recibir un «se ha
        // agotado» treinta segundos después.
        stock: variantes.length
          ? (variantes.every((v: any) => v.stock === null) ? null : variantes.reduce((n: number, v: any) => n + (v.stock ?? 0), 0))
          : p.stock === null || p.stock === undefined
            ? null
            : Math.max(0, Number(p.stock) - await reservado(db, p.id)),
        garantia: p.warranty || null,
        devoluciones: p.return_policy || null,
        categoria: p.category || null,
        // Las opiniones, resumidas: media en estrellas (1-5) y cuántas. `null`
        // = nadie ha opinado, que no es lo mismo que cero estrellas.
        valoracion: { media: p.media_estrellas ?? null, n: Number(p.n_resenas || 0) },
        // Quién vende, para «preguntar al vendedor» (un mensaje directo).
        vendedor: p.created_by ? { id: p.created_by, valoracion: nVal >= MIN_RESENAS_VALORACION_VENDEDOR ? { media: Number(valVendedor.media), n: nVal } : null } : null,
        relacionados: relacionados.map((x: any) => ({ id: x.id, nombre: x.name, precio_centimos: x.price_cents ?? null, moneda: x.currency || 'EUR', imagen: Array.isArray(x.images) ? x.images[0] || null : null })),
        // Si el vendedor acepta cobrar en puntos (y el interruptor está
        // encendido, que lo decide el servidor en /api/publicar/puntos-en-caja).
        acepta_puntos: !!p.acepta_puntos,
        // VARIANTES (2026-08-23): talla, color… con precio y stock propios. Si
        // hay, la ficha pide elegir una antes de comprar; el precio de
        // portada es «desde» el más bajo y el stock es la suma de las que
        // llevan cuenta (nulo si ninguna la lleva).
        variantes,
        precio_desde_centimos: variantes.length ? Math.min(...variantes.map((v: any) => v.precio_centimos ?? p.price_cents ?? 0)) : null,
        // El envío se cuenta ANTES de comprar, no en la última pantalla. Un
        // coste que aparece al final es la primera causa de carrito
        // abandonado, y en una tienda de una persona es peor: parece un truco.
        // Adónde llega y por cuánto (F8, 2026-08-24): las zonas con tarifa.
        // Una zona que no está en la lista es una zona a la que no se envía.
        envio_zonas: ((await tarifasDe(db, [p.id])).get(p.id) || []).map(t => ({
          zona: t.zona, nombre: ZONAS.find(z => z.id === t.zona)?.nombre || t.zona,
          centimos: t.centimos, gratis_desde_centimos: t.gratis_desde_centimos,
        })),
        recogida: p.recogida_en_persona ? { donde: p.recogida_donde || null } : null,
        envio: {
          // `null` = no lo ha configurado, y entonces no se ofrece envío.
          // `0` = gratis dicho a propósito. No son lo mismo.
          centimos: p.envio_centimos === null || p.envio_centimos === undefined ? null : Number(p.envio_centimos),
          gratis_desde_centimos: p.envio_gratis_desde_centimos === null || p.envio_gratis_desde_centimos === undefined
            ? null : Number(p.envio_gratis_desde_centimos),
          plazo: p.envio_plazo || null,
          // Un archivo no se envía por mensajero. Se dice aquí para que la
          // tarjeta no tenga que adivinarlo del tipo.
          hace_falta: (p.kind || '') === 'fisico',
        },
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * CÓMO VAN MIS VENTAS — `GET /api/publicar/mis-ventas/resumen` (2026-08-22,
   * fase 10 del plan de comercio, la parte que no necesita nada nuevo: leer
   * los pedidos que ya existen y contarlos bien).
   *
   * Este mes (pedidos, euros cobrados, puntos cobrados, sin enviar), la serie
   * de los últimos 6 meses y lo más vendido. Los euros son `importe_centimos`
   * del pedido (lo que pagó el comprador por tarjeta, envío incluido) y los
   * puntos `puntos_usados`: dos columnas, dos números, nunca sumados entre sí.
   * Pedidos devueltos y cancelados no cuentan como venta.
   */
  app.get('/api/publicar/mis-ventas/resumen', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const uid = req.user.id;
      const [mes, serie, top, sinEnviar] = await Promise.all([
        db.execute(sql`
          SELECT count(*)::int AS pedidos,
                 coalesce(sum(importe_centimos), 0)::int AS euros_centimos,
                 coalesce(sum(puntos_usados), 0)::float AS puntos
          FROM pedidos
          WHERE vendedor_user_id = ${uid} AND estado NOT IN ('cancelado', 'devuelto')
            AND created_at >= date_trunc('month', now())
        `),
        db.execute(sql`
          SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
                 count(*)::int AS pedidos,
                 coalesce(sum(importe_centimos), 0)::int AS euros_centimos,
                 coalesce(sum(puntos_usados), 0)::float AS puntos
          FROM pedidos
          WHERE vendedor_user_id = ${uid} AND estado NOT IN ('cancelado', 'devuelto')
            AND created_at >= date_trunc('month', now()) - interval '5 months'
          GROUP BY 1 ORDER BY 1
        `),
        db.execute(sql`
          SELECT x.producto_id, max(x.nombre) AS nombre, sum(x.unidades)::int AS unidades
          FROM (
            SELECT pl.producto_id, pl.producto_nombre AS nombre, pl.unidades
            FROM pedido_lineas pl JOIN pedidos pd ON pd.id = pl.pedido_id
            WHERE pd.vendedor_user_id = ${uid} AND pd.estado NOT IN ('cancelado', 'devuelto')
            UNION ALL
            -- Pedidos de antes del carrito: una sola cosa, sin líneas.
            SELECT pd.producto_id, pd.producto_nombre, coalesce(pd.unidades, 1)
            FROM pedidos pd
            WHERE pd.vendedor_user_id = ${uid} AND pd.estado NOT IN ('cancelado', 'devuelto')
              AND NOT EXISTS (SELECT 1 FROM pedido_lineas pl WHERE pl.pedido_id = pd.id)
          ) x
          WHERE x.producto_id IS NOT NULL
          GROUP BY x.producto_id ORDER BY unidades DESC LIMIT 5
        `),
        db.execute(sql`SELECT count(*)::int AS n FROM pedidos WHERE vendedor_user_id = ${uid} AND estado = 'pagado'`),
      ]);
      // Cestas a medias (2026-08-23): cuántas personas con sesión dejaron algo
      // en la cesta de esta tienda en los últimos 30 días sin comprarlo.
      const handleRow = (await db.execute(sql`SELECT handle FROM users WHERE id = ${uid}`)).rows[0] as any;
      const cestas = handleRow?.handle ? (await db.execute(sql`
        SELECT count(*)::int AS n FROM cestas_guardadas WHERE tienda = ${handleRow.handle} AND jsonb_array_length(lineas) > 0 AND updated_at > now() - interval '30 days'
      `)).rows[0] as any : null;
      const cestasAMedias = Number(cestas?.n || 0);
      res.json({
        cestas_a_medias: cestasAMedias,
        mes: mes.rows[0],
        serie: serie.rows,
        mas_vendido: top.rows,
        sin_enviar: Number((sinEnviar.rows[0] as any)?.n ?? 0),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // CUPONES DEL VENDEDOR (2026-08-22, fase 7 del plan de comercio)
  // ==========================================================================
  /** Mis cupones. */
  app.get('/api/publicar/mis-cupones', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, codigo, tipo, valor, minimo_centimos, caduca_at, usos_max, usos, activo, created_at
        FROM cupones WHERE vendedor_user_id = ${req.user.id} ORDER BY created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Crear un cupón: { codigo, tipo 'porcentaje'|'fijo', valor, minimo_centimos?, caduca?, usos_max? } */
  app.post('/api/publicar/mis-cupones', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const b = req.body || {};
      const codigo = String(b.codigo || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9\-_]{3,24}$/.test(codigo)) return res.status(400).json({ error: 'El código: de 3 a 24 letras o números, sin espacios.' });
      const tipo = b.tipo === 'fijo' ? 'fijo' : 'porcentaje';
      const valor = Math.round(Number(b.valor));
      if (!Number.isFinite(valor) || valor <= 0 || (tipo === 'porcentaje' && valor > 100)) {
        return res.status(400).json({ error: tipo === 'porcentaje' ? 'El porcentaje va de 1 a 100.' : 'El importe tiene que ser mayor que cero.' });
      }
      const minimo = Math.max(0, Math.round(Number(b.minimo_centimos) || 0));
      const caduca = b.caduca ? new Date(String(b.caduca)) : null;
      if (caduca && Number.isNaN(caduca.getTime())) return res.status(400).json({ error: 'La fecha de caducidad no se entiende.' });
      const usosMax = b.usos_max === null || b.usos_max === undefined || b.usos_max === '' ? null : Math.max(1, Math.round(Number(b.usos_max) || 1));
      const id = 'CUP' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
      try {
        await db.execute(sql`
          INSERT INTO cupones (id, vendedor_user_id, codigo, tipo, valor, minimo_centimos, caduca_at, usos_max)
          VALUES (${id}, ${req.user.id}, ${codigo}, ${tipo}, ${valor}, ${minimo}, ${caduca ? caduca.toISOString() : null}, ${usosMax})
        `);
      } catch (e: any) {
        // pg dice 23505 en el error o en su `cause` según quién lo envuelva;
        // se mira en los dos y también en el texto, que es lo que no cambia.
        const texto = `${e?.message || ''} ${e?.cause?.message || ''}`;
        if (String(e?.code) === '23505' || String(e?.cause?.code) === '23505' || /duplicate key|unique/i.test(texto)) {
          return res.status(409).json({ error: 'Ya tienes un cupón con ese código.' });
        }
        throw e;
      }
      res.json({ id, codigo, tipo, valor, minimo_centimos: minimo, caduca_at: caduca, usos_max: usosMax, usos: 0, activo: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Activar / desactivar un cupón mío. Nunca se borra: los pedidos lo citan. */
  app.put('/api/publicar/mis-cupones/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        UPDATE cupones SET activo = ${!!req.body?.activo}, updated_at = now()
        WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}
        RETURNING id, activo
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese cupón no es tuyo o no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿CUÁNTO ES ESTA CESTA, CON ENVÍO? — `POST /api/publicar/cotizar` { lineas, cupon? }
   * La cesta lo necesita para saber si los puntos pueden cubrirlo TODO (y
   * entonces no hay Stripe, y hace falta dirección si hay algo físico). Misma
   * aritmética que el cobro — de hecho es la misma, sin cobrar. Sin sesión.
   */
  app.post('/api/publicar/cotizar', async (req: Request, res: Response) => {
    try {
      const crudas: any[] = Array.isArray(req.body?.lineas) ? req.body.lineas : [];
      const ids = crudas.map(l => String(l?.producto_id || '')).filter(Boolean);
      if (!ids.length) return res.status(400).json({ error: 'No hay nada que cotizar.' });
      const productos = (await db.execute(sql`
        SELECT id, name, price_cents, kind, created_by, acepta_puntos, envio_centimos, envio_gratis_desde_centimos, recogida_en_persona
        FROM products WHERE id = ANY(string_to_array(${ids.join(',')}, ',')) AND archived_at IS NULL AND status <> 'borrador'
      `)).rows as any[];
      // Con variante, el precio es el de la variante (2026-08-23).
      const mapaV = await variantesDe(db, [...new Set(ids)]);
      const lineas = crudas.map(l => {
        const p = productos.find(x => x.id === String(l.producto_id));
        const v = p ? (mapaV.get(p.id) || []).find((x: any) => x.id === String(l.variante_id || '')) : null;
        return { p, v, precio: v && v.precio_centimos !== null ? v.precio_centimos : p?.price_cents, unidades: Math.max(1, Math.min(99, Number(l.cantidad) || 1)) };
      }).filter(l => l.p && l.precio);
      if (!lineas.length) return res.status(404).json({ error: 'Esos productos no están a la venta.' });
      const subtotal = lineas.reduce((n, l) => n + l.precio * l.unidades, 0);
      const fisicas = lineas.filter(l => (l.p.kind || '') === 'fisico');
      // ZONAS DE ENVÍO (F8, 2026-08-24): el porte depende de a dónde va. Si la
      // cesta aún no sabe el destino, se cotiza la península — y se dice que
      // es «desde», para que nadie descubra el porte de verdad al final.
      const zona: Zona = req.body?.pais || req.body?.cp ? zonaDe(req.body.pais, req.body.cp) : 'peninsula';
      const tarifas = await tarifasDe(db, fisicas.map(l => l.p.id));
      const calc = calcularEnvio(fisicas as any, subtotal, zona, tarifas);
      const recogidaPosible = fisicas.length > 0 && fisicas.every(l => !!l.p.recogida_en_persona);
      const envio = calc.centimos;
      const aceptan = lineas.filter(l => !!l.p.acepta_puntos).reduce((n, l) => n + l.precio * l.unidades, 0);

      // LA CESTA DE VARIAS TIENDAS (F11, 2026-08-24). Un cobro sigue siendo de
      // UNA tienda —cada vendedor cobra en su cuenta, y esa regla es la que
      // protege el dinero— pero la cesta ya no obliga a elegir: se agrupa por
      // tienda y se dice qué toca pagar en cada una. Si todo se paga con
      // puntos, la cesta las liquida una detrás de otra sin que nadie note la
      // diferencia; si hace falta tarjeta, se paga una tienda cada vez y se
      // dice cuántas quedan.
      const porVendedor = new Map<string, any[]>();
      for (const l of lineas) {
        const vid = l.p.created_by || '';
        porVendedor.set(vid, [...(porVendedor.get(vid) || []), l]);
      }
      const nombresTienda = porVendedor.size > 1
        ? (await db.execute(sql`
            SELECT id, handle, coalesce(display_name, name, email) AS nombre FROM users
            WHERE id = ANY(string_to_array(${[...porVendedor.keys()].filter(Boolean).join(',') || '-'}, ','))
          `)).rows as any[]
        : [];
      const tiendas = await Promise.all([...porVendedor.entries()].map(async ([vid, ls]) => {
        const sub = ls.reduce((n: number, l: any) => n + l.precio * l.unidades, 0);
        const fis = ls.filter((l: any) => (l.p.kind || '') === 'fisico');
        const c = calcularEnvio(fis as any, sub, zona, tarifas);
        const u = nombresTienda.find(x => x.id === vid);
        return {
          // Para el cobro de un carrito de varias tiendas (cuando se encienda):
          // solo entran las tiendas que han firmado el contrato de cobro.
          acepta_cobro_agregado: await aceptoElCobro(vid),
          vendedor_id: vid || null,
          tienda: u?.handle || null,
          nombre: u?.nombre || null,
          lineas: ls.map((l: any) => ({ producto_id: l.p.id, variante_id: l.v?.id || null, cantidad: l.unidades })),
          subtotal_centimos: sub,
          envio_centimos: c.centimos,
          se_envia: c.se_envia,
          no_llega: c.no_llega,
          todo_acepta_puntos: ls.every((l: any) => !!l.p.acepta_puntos),
          recogida_posible: fis.length > 0 && fis.every((l: any) => !!l.p.recogida_en_persona),
        };
      }));

      res.json({
        subtotal_centimos: subtotal,
        envio_centimos: envio,
        // Cuántas tiendas hay en la cesta y qué toca en cada una.
        tiendas,
        varias_tiendas: tiendas.length > 1,
        zona: calc.zona,
        zona_nombre: ZONAS.find(z => z.id === calc.zona)?.nombre || null,
        // `false` = alguna cosa de la cesta no llega a esa zona; `no_llega`
        // dice cuál, para poder nombrarla.
        se_envia: calc.se_envia,
        no_llega: calc.no_llega,
        envio_estimado: !(req.body?.pais || req.body?.cp),
        recogida_posible: recogidaPosible,
        es_fisico: fisicas.length > 0,
        acepta_puntos_centimos: aceptan,
        todo_acepta_puntos: aceptan >= subtotal,
        puntos_por_euro: puntosPorEuro(),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿VALE ESTE CÓDIGO PARA ESTA CESTA? — `POST /api/publicar/cupon/comprobar`
   * { codigo, lineas: [{ producto_id, cantidad }] } → { valido, descuento_centimos, motivo }
   * Lo mismo que comprueba el cobro, pero sin cobrar: para que la cesta diga
   * el descuento ANTES de pulsar pagar. Sin sesión: quien compra sin cuenta
   * también tiene cupones.
   */
  app.post('/api/publicar/cupon/comprobar', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.body?.codigo || '').trim().toUpperCase();
      const lineas: any[] = Array.isArray(req.body?.lineas) ? req.body.lineas : [];
      if (!codigo || !lineas.length) return res.json({ valido: false, descuento_centimos: 0, motivo: 'Escribe un código.' });
      const ids = lineas.map(l => String(l?.producto_id || '')).filter(Boolean);
      const productos = (await db.execute(sql`
        SELECT id, price_cents, created_by FROM products
        WHERE id = ANY(string_to_array(${ids.join(',')}, ',')) AND archived_at IS NULL AND status <> 'borrador'
      `)).rows as any[];
      const vendedores = new Set(productos.map(p => p.created_by));
      if (vendedores.size !== 1) return res.json({ valido: false, descuento_centimos: 0, motivo: 'El cupón es de una sola tienda.' });
      const vendedorId = productos[0].created_by;
      const subtotal = lineas.reduce((n, l) => {
        const p = productos.find(x => x.id === String(l.producto_id));
        return n + (p?.price_cents || 0) * Math.max(1, Math.min(99, Number(l.cantidad) || 1));
      }, 0);
      const c = (await db.execute(sql`
        SELECT codigo, tipo, valor, minimo_centimos, caduca_at, usos_max, usos, activo
        FROM cupones WHERE vendedor_user_id = ${vendedorId} AND codigo = ${codigo}
      `)).rows[0] as any;
      const motivo = !c ? 'Ese código no existe en esta tienda.'
        : !c.activo ? 'Ese código ya no está activo.'
        : c.caduca_at && new Date(c.caduca_at).getTime() < Date.now() ? 'Ese código ha caducado.'
        : c.usos_max !== null && Number(c.usos) >= Number(c.usos_max) ? 'Ese código ya se ha usado todas las veces posibles.'
        : subtotal < Number(c.minimo_centimos || 0) ? `Pide una compra mínima de ${(Number(c.minimo_centimos) / 100).toFixed(2)} €.`
        : null;
      if (motivo) return res.json({ valido: false, descuento_centimos: 0, motivo });
      const descuento = c.tipo === 'porcentaje'
        ? Math.min(subtotal, Math.round((subtotal * Math.min(100, Number(c.valor))) / 100))
        : Math.min(subtotal, Number(c.valor));
      res.json({ valido: true, descuento_centimos: descuento, codigo: c.codigo, motivo: null });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿SE PUEDE PAGAR CON PUNTOS AQUÍ, Y CON CUÁNTOS? — `GET /api/publicar/puntos-en-caja`
   * Lo pregunta la cesta antes de pintar el control. `activo` lo decide el
   * servidor (interruptor PUNTOS_DESCUENTO); `saldo` solo con sesión.
   */
  app.get('/api/publicar/puntos-en-caja', async (req: Request, res: Response) => {
    try {
      const activo = puntosDescuentoActivo();
      let saldo: number | null = null;
      if (activo && req.user) {
        saldo = Number(((await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.user.id}`)).rows[0] as any)?.puntos ?? 0);
      }
      res.json({
        activo, con_sesion: !!req.user, saldo, puntos_por_euro: puntosPorEuro(),
        // Las comisiones vigentes (2026-08-24): las pantallas dejan de tener
        // cifras escritas a mano que un día dicen una cosa y el cobro hace otra.
        comision_euros_pct: Math.round(comisionBps() / 100 * 100) / 100,
        comision_puntos_pct: Math.round(comisionPuntosBps() / 100 * 100) / 100,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // RESEÑAS DE PRODUCTO (2026-08-22, fase 3 del plan de comercio, Programador 7)
  // ==========================================================================
  // Sin tabla nueva: la estrella vive en `ratings` (entity_type 'products',
  // score 0-10 = estrellas × 2) y el texto en `comments` (entity_type
  // 'products'). Una persona, una reseña: la estrella se sobreescribe y el
  // texto anterior se archiva cuando llega el nuevo.
  //
  // «COMPRA VERIFICADA» ES LO QUE PESA. Cualquiera con sesión puede opinar,
  // pero solo la reseña de quien tiene un pedido pagado de ese producto lleva
  // la marca — y solo esas cuentan en el reparto del bote. La pregunta de
  // seguridad de siempre: ¿quién puede subir este número desde fuera? Con la
  // marca, solo quien pagó. El vendedor no puede reseñarse a sí mismo.
  const compraVerificada = async (productoId: string, userId: string, email: string | null) => {
    const r = await db.execute(sql`
      SELECT 1 FROM pedidos pd
      LEFT JOIN pedido_lineas pl ON pl.pedido_id = pd.id
      WHERE pd.estado NOT IN ('cancelado', 'devuelto')
        AND (pd.producto_id = ${productoId} OR pl.producto_id = ${productoId})
        AND (pd.comprador_user_id = ${userId} OR (${email}::text IS NOT NULL AND lower(pd.comprador_email) = lower(${email})))
      LIMIT 1
    `);
    return r.rows.length > 0;
  };

  /** GET /api/publicar/producto/:id/resenas — públicas; `mia` si hay sesión. */
  app.get('/api/publicar/producto/:id/resenas', async (req: Request, res: Response) => {
    try {
      const pid = String(req.params.id);
      const lista = await db.execute(sql`
        SELECT r.user_id, r.score, r.created_at, r.updated_at,
               coalesce(u.display_name, u.name, 'Alguien') AS autor,
               u.avatar_url AS avatar,
               (SELECT c.body FROM comments c
                 WHERE c.entity_type = 'products' AND c.entity_id = r.entity_id
                   AND c.author_user_id = r.user_id AND c.archived_at IS NULL
                 ORDER BY c.created_at DESC LIMIT 1) AS texto,
               EXISTS (
                 SELECT 1 FROM pedidos pd LEFT JOIN pedido_lineas pl ON pl.pedido_id = pd.id
                 WHERE pd.estado NOT IN ('cancelado', 'devuelto')
                   AND (pd.producto_id = r.entity_id OR pl.producto_id = r.entity_id)
                   AND (pd.comprador_user_id = r.user_id OR lower(pd.comprador_email) = lower(u.email))
               ) AS compra_verificada
        FROM ratings r LEFT JOIN users u ON u.id = r.user_id
        WHERE r.entity_type = 'products' AND r.entity_id = ${pid}
        ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC
        LIMIT 100
      `);
      const filas = (lista.rows as any[]).map(f => ({
        autor: f.autor, avatar: f.avatar || null,
        estrellas: Math.round(Number(f.score) / 2),
        texto: f.texto || null,
        compra_verificada: !!f.compra_verificada,
        fecha: f.updated_at || f.created_at,
        mia: !!req.user && f.user_id === req.user.id,
      }));
      const n = filas.length;
      const media = n ? Math.round((filas.reduce((s, f) => s + f.estrellas, 0) / n) * 10) / 10 : null;
      res.json({ media, n, verificadas: filas.filter(f => f.compra_verificada).length, resenas: filas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** POST /api/publicar/producto/:id/resena  { estrellas 1-5, texto? } */
  app.post('/api/publicar/producto/:id/resena', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Entra para dejar tu opinión.' });
      const pid = String(req.params.id);
      const estrellas = Math.round(Number(req.body?.estrellas));
      const texto = String(req.body?.texto || '').trim().slice(0, 2000);
      if (!Number.isFinite(estrellas) || estrellas < 1 || estrellas > 5) {
        return res.status(400).json({ error: 'Elige de 1 a 5 estrellas.' });
      }
      const p = (await db.execute(sql`SELECT id, created_by FROM products WHERE id = ${pid} AND archived_at IS NULL`)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no existe.' });
      if (p.created_by === req.user.id) return res.status(403).json({ error: 'No puedes reseñar lo que vendes tú.' });

      await db.execute(sql`
        INSERT INTO ratings (user_id, entity_type, entity_id, score)
        VALUES (${req.user.id}, 'products', ${pid}, ${estrellas * 2})
        ON CONFLICT (user_id, entity_type, entity_id)
        DO UPDATE SET score = EXCLUDED.score, updated_at = now()
      `);
      // El texto anterior se archiva (nunca se borra) y entra el nuevo.
      await db.execute(sql`
        UPDATE comments SET archived_at = now()
        WHERE entity_type = 'products' AND entity_id = ${pid} AND author_user_id = ${req.user.id} AND archived_at IS NULL
      `);
      if (texto) {
        await db.execute(sql`
          INSERT INTO comments (id, entity_type, entity_id, publication_id, author_user_id, body, created_by, updated_by)
          VALUES (${'CMT' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase()},
                  'products', ${pid}, NULL, ${req.user.id}, ${texto}, ${req.user.id}, ${req.user.id})
        `);
      }
      const verificada = await compraVerificada(pid, req.user.id, req.user.email || null);
      res.json({ success: true, estrellas, compra_verificada: verificada });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * COMPRAR SIN CUENTA — `POST /api/publicar/comprar`
   *
   * Fase 3 del plan de tiendas, y la que decide si esto es una tienda o un
   * escaparate. Hasta hoy, comprar exigía sesión: quien llegaba a la tienda de
   * alguien por un enlace tenía que registrarse en una plataforma de la que no
   * había oído hablar ANTES de poder pagar doce euros de miel. Eso no es una
   * fricción, es una puerta cerrada — y quien la encuentra no se registra, se
   * va.
   *
   * ── POR QUÉ NO REUTILIZA `/api/stripe/checkout/product` ────────────────────
   * Aquella ruta exige sesión y guarda `buyer_id` en los metadatos, porque
   * nació para el mercado de dentro. Aquí no hay comprador con cuenta. Es la
   * misma pasarela y la misma comisión, pero la identidad del comprador es un
   * correo, no una fila de `users`.
   *
   * ── QUÉ SE COMPRUEBA ANTES DE COBRAR ──────────────────────────────────────
   * Que el producto exista, que tenga precio y que quede stock. Cobrar primero
   * y descubrir después que no había es la peor forma de conocer a un cliente.
   * El descuento de stock NO se hace aquí: se hace cuando Stripe confirma el
   * pago, porque una sesión abierta y abandonada no debe reservar nada.
   *
   * ── A DÓNDE VUELVE ────────────────────────────────────────────────────────
   * A la tienda de donde salió, no al dominio principal. Quien compra en
   * `nombre.humanity.wiki` termina ahí; mandarlo a `humanity.wiki/mercado`
   * sería sacarlo de la tienda justo al pagar.
   */
  /**
   * COMPRAR SIN CUENTA, UNA COSA O VARIAS — `POST /api/publicar/comprar`
   *
   * Fase 3 (comprar sin cuenta) y fase 7 (carrito). Acepta las dos formas:
   *   { producto_id, cantidad }              una sola cosa
   *   { lineas: [{ producto_id, cantidad }] } un carrito
   *
   * ── POR QUÉ NO REUTILIZA `/api/stripe/checkout/product` ────────────────────
   * Aquella ruta exige sesión y guarda `buyer_id`, porque nació para el
   * mercado de dentro. Aquí no hay comprador con cuenta: su identidad es un
   * correo, no una fila de `users`.
   *
   * ── TODO DEL MISMO VENDEDOR ───────────────────────────────────────────────
   * Un pago va a UNA cuenta de Stripe. Mezclar dos vendedores en un cobro
   * obligaría a repartir el dinero entre dos destinos, y si uno de los dos no
   * ha terminado su alta, el otro cobraría por él. Se rechaza y se dice por
   * qué, en vez de cobrar y repartir mal.
   *
   * ── EL ENVÍO SE COBRA UNA VEZ ─────────────────────────────────────────────
   * Tres tarros del mismo sitio van en la misma caja. Se cobra el envío más
   * caro de lo que se lleva, no la suma: sumarlos cobraría tres portes por un
   * paquete.
   */
  app.post('/api/publicar/comprar', async (req: Request, res: Response) => {
    try {
      // ── EL INTERRUPTOR DEL COBRO ────────────────────────────────────────
      // Todo lo de vender salió en dos despliegues: primero lo que sólo
      // ENSEÑA (la ficha de producto, la portada, la maquetación) y después lo
      // que COBRA. Mientras el segundo no esté encendido, esta ruta no existe
      // para nadie — y el botón tampoco se pinta, porque `GET
      // /api/publicar/cobro` se lo dice al navegador.
      //
      // Es la norma de Eugenio del 2026-08-22: un despliegue, un cambio. Con
      // dinero de por medio, un despliegue que enseña y cobra a la vez deja
      // sin saber cuál de los dos rompió algo.
      if (!COBRO_ENCENDIDO) {
        return res.status(503).json({ error: 'La compra todavía no está abierta en esta tienda.' });
      }
      const cuerpo = req.body || {};
      // Las dos formas acaban siendo la misma lista.
      const crudas: any[] = Array.isArray(cuerpo.lineas) && cuerpo.lineas.length
        ? cuerpo.lineas
        : [{ producto_id: cuerpo.producto_id, cantidad: cuerpo.cantidad }];

      if (crudas.length > MAX_LINEAS) {
        return res.status(400).json({ error: `No se pueden comprar más de ${MAX_LINEAS} cosas distintas de una vez.` });
      }

      // Un mismo producto repetido en el carrito se suma en una sola línea: si
      // no, se reservaría dos veces y el stock se comprobaría contra sí mismo.
      // La clave de una línea es producto + variante (2026-08-23): dos
      // tallas del mismo producto son dos líneas.
      const pedidas = new Map<string, { id: string; vid: string | null; n: number }>();
      for (const l of crudas) {
        const id = String(l?.producto_id || '').trim();
        if (!id) continue;
        const vid = String(l?.variante_id || '').trim() || null;
        const n = Math.max(1, Math.min(99, Number(l?.cantidad) || 1));
        const k = `${id}|${vid || ''}`;
        pedidas.set(k, { id, vid, n: Math.min(99, (pedidas.get(k)?.n || 0) + n) });
      }
      if (pedidas.size === 0) return res.status(400).json({ error: 'No has elegido nada.' });

      const idsProductos = [...new Set([...pedidas.values()].map(x => x.id))];
      const productos = (await db.execute(sql`
        SELECT id, name, description, price_cents, currency, stock, created_by, modality,
               billing_period, kind, envio_centimos, envio_gratis_desde_centimos, envio_plazo, acepta_puntos,
               recogida_en_persona, recogida_donde
        FROM products
        WHERE id = ANY(string_to_array(${idsProductos.join(',')}, ','))
          AND archived_at IS NULL AND status <> 'borrador'
      `)).rows as any[];
      const mapaVariantes = await variantesDe(db, idsProductos);

      // Se comprueba TODO antes de cobrar NADA. Cobrar la mitad de un carrito
      // y descubrir en la segunda línea que no había es peor que no cobrar.
      // Cada línea lleva `precio` y `nombre` efectivos (los de la variante si
      // la hay): es lo que se cobra, se reserva y se escribe en el pedido.
      const lineas: any[] = [];
      for (const { id, vid, n: unidades } of pedidas.values()) {
        const p = productos.find(x => x.id === id);
        if (!p) return res.status(404).json({ error: 'Una de las cosas que llevas ya no está a la venta.', producto_id: id });
        const variantes = mapaVariantes.get(id) || [];
        const v = vid ? variantes.find((x: any) => x.id === vid) : null;
        if (variantes.length && !v) {
          return res.status(400).json({ error: `Elige una opción de «${p.name}» (${variantes.slice(0, 3).map((x: any) => x.nombre).join(', ')}${variantes.length > 3 ? '…' : ''}).`, producto_id: id, falta_variante: true });
        }
        const precio = v && v.precio_centimos !== null ? v.precio_centimos : p.price_cents;
        if (!precio) {
          return res.status(400).json({ error: `«${p.name}» no tiene precio: hay que preguntar antes de comprarlo.`, producto_id: id });
        }
        const nombre = v ? `${p.name} — ${v.nombre}` : p.name;
        const llevaCuenta = v ? v.stock !== null : (p.stock !== null && p.stock !== undefined);
        // `variantesDe` ya descuenta lo reservado de cada variante.
        const disponible = !llevaCuenta ? null : v ? Number(v.stock) : Number(p.stock) - await reservado(db, p.id);
        if (disponible !== null && disponible < unidades) {
          return res.status(409).json({
            error: disponible <= 0
              ? `«${nombre}» se ha agotado.`
              : `De «${nombre}» solo ${disponible === 1 ? 'queda 1' : `quedan ${disponible}`}.`,
            producto_id: id, variante_id: vid, stock: Math.max(0, disponible),
          });
        }
        lineas.push({ p, v, precio, nombre, unidades, llevaCuenta });
      }

      // UN COBRO, UNA TIENDA — y esa regla se queda (F11, 2026-08-24). No es
      // una limitación de la cesta: es que cada vendedor cobra en SU cuenta de
      // Stripe, y un solo pago no puede repartirse entre varias cuentas sin
      // que la plataforma pase a ser la vendedora de todo (decisión de
      // Eugenio y su asesor, como la factura). Lo que cambia es que ahora la
      // cesta SÍ admite varias tiendas: llama aquí una vez por tienda. Y si
      // alguien llama con dos, se le dice cuántas hay y cuáles.
      // VARIAS TIENDAS EN UN SOLO PAGO (2026-08-24, «gestor de cobro»). Se
      // permite solo si: el interruptor está encendido, TODAS las tiendas han
      // firmado el contrato de servicio de cobro, y se paga en euros (con
      // puntos ya funcionaba tienda por tienda). Si falta cualquiera de las
      // tres, se dice cuál — nunca se cobra «a ver si cuela».
      const vendedores = new Set(lineas.map(l => l.p.created_by || ''));
      let cobroAgregado = false;
      if (vendedores.size > 1) {
        if (!cobroAgregadoActivo()) {
          return res.status(400).json({
            error: `Llevas cosas de ${vendedores.size} tiendas. Cada tienda cobra por separado: se paga una y luego la siguiente.`,
            varias_tiendas: true, tiendas: vendedores.size,
          });
        }
        const sinFirmar: string[] = [];
        for (const vid of vendedores) if (!(await aceptoElCobro(vid))) sinFirmar.push(vid);
        if (sinFirmar.length) {
          const nombres = (await db.execute(sql`
            SELECT coalesce(display_name, name, email) AS nombre FROM users WHERE id = ANY(string_to_array(${sinFirmar.join(',')}, ','))
          `)).rows as any[];
          return res.status(400).json({
            error: nombres.length === 1
              ? `${nombres[0].nombre} todavía no cobra a través de la plataforma. Paga esa tienda por separado.`
              : `${nombres.map(n => n.nombre).join(', ')} todavía no cobran a través de la plataforma. Págalas por separado.`,
            varias_tiendas: true, tiendas: vendedores.size, sin_contrato: nombres.map(n => n.nombre),
          });
        }
        cobroAgregado = true;
      }

      // Una suscripción no se mezcla con nada: se cobra sola y con su
      // periodicidad. Un pago único y una cuota mensual en la misma sesión no
      // tienen un «total» que signifique algo.
      const suscripciones = lineas.filter(l => l.p.modality === 'suscripcion');
      if (suscripciones.length && lineas.length > 1) {
        return res.status(400).json({ error: 'Una suscripción se paga por separado.' });
      }
      const suscripcion = suscripciones.length === 1;

      const moneda = (lineas[0].p.currency || 'EUR').toLowerCase();
      if (lineas.some(l => (l.p.currency || 'EUR').toLowerCase() !== moneda)) {
        return res.status(400).json({ error: 'No se pueden pagar juntas cosas en monedas distintas.' });
      }

      const subtotal = lineas.reduce((n, l) => n + l.precio * l.unidades, 0);
      const destino = destinoSeguro(cuerpo.volver_a);
      const esFisico = lineas.some(l => (l.p.kind || '') === 'fisico');

      // EL PORTE (F8, 2026-08-24): depende de la ZONA del destino. Mismas
      // reglas de siempre —el porte más caro, no la suma, porque va todo en
      // una caja; y gratis si alguna línea tiene umbral y el subtotal lo
      // pasa— pero con una tarifa por zona. Si algo no llega a esa zona, no
      // se cobra: se dice cuál antes de tocar el dinero.
      const fisicas = lineas.filter(l => (l.p.kind || '') === 'fisico');
      // RECOGIDA EN PERSONA: si se pide y todo lo físico la admite, no hay
      // porte ni dirección que pedir.
      const quiereRecogida = cuerpo.entrega === 'recogida';
      const recogidaPosible = fisicas.length > 0 && fisicas.every(l => !!l.p.recogida_en_persona);
      if (quiereRecogida && !recogidaPosible) {
        return res.status(400).json({ error: 'Alguna de las cosas que llevas no se puede recoger en persona.' });
      }
      const zonaDestino: Zona = quiereRecogida ? 'peninsula' : zonaDe(cuerpo.direccion?.pais || cuerpo.direccion?.country, cuerpo.direccion?.cp || cuerpo.direccion?.postal_code);
      const tarifasEnvio = await tarifasDe(db, fisicas.map(l => l.p.id));
      const calculo = quiereRecogida
        ? { centimos: 0, se_envia: true, no_llega: null, zona: zonaDestino, gratis_por_umbral: false }
        : calcularEnvio(fisicas as any, subtotal, zonaDestino, tarifasEnvio);
      if (!calculo.se_envia) {
        return res.status(409).json({
          error: `«${calculo.no_llega}» no se envía a ese destino. Escribe a quien lo vende: puede que pueda hacer una excepción.`,
          no_se_envia: true, zona: zonaDestino,
        });
      }
      const gratisPorUmbral = calculo.gratis_por_umbral;
      const envioCobrado = !esFisico ? null : calculo.centimos;

      const vendedorId = lineas[0].p.created_by;
      const vendedor = vendedorId
        ? (await db.execute(sql`SELECT stripe_account_id, charges_enabled FROM stripe_accounts WHERE user_id = ${vendedorId}`)).rows[0] as any
        : null;
      // Con cobro agregado, el dinero NO va a la cuenta de la tienda: entra
      // entero en la de la plataforma y se le devuelve después por
      // liquidación. Es la diferencia entre «cada uno cobra lo suyo» y
      // «cobro yo y luego reparto», que es lo que pidió Eugenio.
      const reparte = !!vendedor?.charges_enabled && !cobroAgregado;
      const comision = Math.round((subtotal * comisionBps()) / 10000);

      // ══ CUPÓN DEL VENDEDOR (2026-08-22, fase 7 del plan) ═══════════════
      // Un código del vendedor de TODA la cesta (ya se ha exigido un solo
      // vendedor). Se valida aquí mismo — activo, no caducado, con usos, con
      // el mínimo — y se rebaja del subtotal antes que los puntos. Si no vale,
      // no se cobra a ciegas con otro precio: se dice y se para.
      let cuponCent = 0;
      let cuponRow: any = null;
      const codigoCupon = String(cuerpo.cupon || '').trim().toUpperCase();
      if (codigoCupon) {
        if (suscripcion) return res.status(400).json({ error: 'Una suscripción no admite cupón.' });
        cuponRow = (await db.execute(sql`
          SELECT id, codigo, tipo, valor, minimo_centimos, caduca_at, usos_max, usos, activo
          FROM cupones WHERE vendedor_user_id = ${vendedorId} AND codigo = ${codigoCupon}
        `)).rows[0] as any;
        const motivo = !cuponRow ? 'Ese código no existe en esta tienda.'
          : !cuponRow.activo ? 'Ese código ya no está activo.'
          : cuponRow.caduca_at && new Date(cuponRow.caduca_at).getTime() < Date.now() ? 'Ese código ha caducado.'
          : cuponRow.usos_max !== null && Number(cuponRow.usos) >= Number(cuponRow.usos_max) ? 'Ese código ya se ha usado todas las veces posibles.'
          : subtotal < Number(cuponRow.minimo_centimos || 0) ? `Ese código pide una compra mínima de ${(Number(cuponRow.minimo_centimos) / 100).toFixed(2)} €.`
          : null;
        if (motivo) return res.status(400).json({ error: motivo, cupon: false });
        cuponCent = cuponRow.tipo === 'porcentaje'
          ? Math.min(subtotal, Math.round((subtotal * Math.min(100, Number(cuponRow.valor))) / 100))
          : Math.min(subtotal, Number(cuponRow.valor));
      }

      // ══ PUNTOS EN EL CARRITO (2026-08-22, interruptor PUNTOS_DESCUENTO) ══
      // El comprador con sesión puede pagar con puntos la parte de la cesta
      // cuyos productos ACEPTAN puntos (lo marca cada vendedor), hasta el
      // 100 % de esa parte. El envío siempre va en euros. El vendedor cobra
      // esos puntos por el libro (pagarConPuntos). Si el total en euros se
      // queda en cero, no se abre Stripe: el pedido nace aquí mismo.
      let puntosUsados = 0;
      let descuentoCentimos = 0;
      const pidePuntos = Number(cuerpo.usar_puntos) || 0;
      if (pidePuntos > 0) {
        if (!puntosDescuentoActivo()) {
          return res.status(403).json({ error: 'Pagar con puntos todavía no está activado en esta tienda.' });
        }
        if (!req.user) return res.status(401).json({ error: 'Entra en tu cuenta para pagar con puntos.' });
        if (suscripcion) return res.status(400).json({ error: 'Una suscripción no se paga con puntos.' });
        if (cobroAgregado) return res.status(400).json({ error: 'Los puntos se pagan tienda por tienda: quita una de las dos de la cesta o paga con tarjeta.' });
        if (req.user.id === vendedorId) return res.status(400).json({ error: 'No puedes comprarte a ti con puntos.' });
        const aceptan = lineas.filter(l => !!l.p.acepta_puntos).reduce((n, l) => n + l.precio * l.unidades, 0);
        if (aceptan <= 0) return res.status(400).json({ error: 'Nada de lo que llevas acepta puntos.' });
        const saldo = Number(((await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.user.id}`)).rows[0] as any)?.puntos ?? 0);
        const tasa = puntosPorEuro();
        // Los puntos cubren como mucho lo que acepta puntos y queda por
        // pagar después del cupón: un descuento no se paga dos veces.
        const parteProductos = Math.min(aceptan, subtotal - cuponCent);
        // Y EL ENVÍO TAMBIÉN (2026-08-23, Eugenio: «incluye también el envío
        // con el tema de puntos para no tener que ir a Stripe»): si los
        // puntos alcanzan para TODO — productos y porte — no hay pasarela y
        // el envío se cobra en puntos al vendedor. Si solo alcanzan para una
        // parte, el porte sigue en euros con Stripe (un cupón de Stripe no
        // rebaja el envío), así que ahí el tope es solo la parte de productos.
        const envioCent = envioCobrado || 0;
        const todoEnPuntos = Math.floor(((parteProductos + envioCent) / 100) * tasa * 100) / 100;
        const quiere = Math.round(pidePuntos * 100) / 100;
        const cubreTodo = aceptan >= subtotal && quiere >= todoEnPuntos && saldo >= todoEnPuntos;
        const topePuntos = cubreTodo
          ? todoEnPuntos
          : Math.floor(Math.min(saldo, (parteProductos / 100) * tasa) * 100) / 100;
        puntosUsados = Math.min(quiere, topePuntos);
        if (puntosUsados <= 0) return res.status(400).json({ error: 'No tienes puntos suficientes para usar aquí.' });
        descuentoCentimos = Math.min(parteProductos + (cubreTodo ? envioCent : 0), Math.round((puntosUsados / tasa) * 100));
      }
      const totalEuros = subtotal - cuponCent - descuentoCentimos + (envioCobrado || 0);
      // La comisión va sobre lo que de verdad se cobra en euros por los
      // productos (sin envío), no sobre el precio de etiqueta.
      const comisionReal = Math.round((Math.max(0, subtotal - cuponCent - descuentoCentimos) * comisionBps()) / 10000);

      if (puntosUsados > 0 && totalEuros <= 0) {
        // TODO EN PUNTOS: sin pasarela. El pedido se crea aquí, y el cobro
        // en puntos se hace en la misma llamada; si el libro dice que no
        // (saldo cambió), no hay pedido.
        const pedidoId = 'PED' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
        const codigo = Math.random().toString(36).replace(/[^a-hj-np-z2-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '7');
        const resumen = lineas.length === 1 ? lineas[0].nombre : `${lineas[0].nombre} y ${lineas.length - 1} ${lineas.length === 2 ? 'cosa más' : 'cosas más'}`;
        const todoDigital = lineas.every(l => (l.p.kind || '') === 'digital');
        // Algo físico pagado entero con puntos: Stripe no pide la dirección
        // porque Stripe no interviene, así que la pedimos nosotros. Sin ella
        // no hay pedido: un paquete sin destino es un problema del vendedor.
        let direccion: any = null;
        if (esFisico && !quiereRecogida) {
          const d = cuerpo.direccion || {};
          const nombre = String(d.nombre || '').trim();
          const line1 = String(d.linea1 || d.line1 || '').trim();
          const cp = String(d.cp || d.postal_code || '').trim();
          const ciudad = String(d.ciudad || d.city || '').trim();
          const pais = String(d.pais || d.country || 'ES').trim().toUpperCase().slice(0, 2);
          if (!nombre || !line1 || !cp || !ciudad) {
            return res.status(400).json({ error: 'Para enviártelo hacen falta nombre, dirección, código postal y ciudad.', falta_direccion: true });
          }
          direccion = { name: nombre, line1, line2: String(d.linea2 || d.line2 || '').trim() || null, postal_code: cp, city: ciudad, country: pais };
        }
        // El teléfono para avisar por WhatsApp (F6, 2026-08-24): el que se
        // escriba en la compra, y si no, el del perfil de quien compra. Se
        // COPIA en el pedido: si cambia de número mañana, este pedido sigue
        // diciendo a qué número se avisó.
        const telefonoPerfil = (await db.execute(sql`SELECT telefono FROM users WHERE id = ${req.user!.id}`)).rows[0] as any;
        const telefonoPedido = normalizarTelefono(cuerpo.telefono) || telefonoPerfil?.telefono || null;
        await db.execute(sql`
          INSERT INTO pedidos (id, codigo, producto_id, producto_nombre, unidades, importe_centimos, envio_centimos, moneda,
                               comprador_user_id, comprador_email, comprador_nombre, direccion_envio, vendedor_user_id, estado, telefono_contacto, entrega_tipo)
          VALUES (${pedidoId}, ${codigo}, ${lineas.length === 1 ? lineas[0].p.id : null}, ${resumen},
                  ${lineas.length === 1 ? lineas[0].unidades : null}, 0, ${envioCobrado || 0}, ${moneda.toUpperCase()},
                  ${req.user!.id}, ${req.user!.email || null}, ${direccion?.name || req.user!.displayName || null},
                  ${direccion ? JSON.stringify(direccion) : null}::jsonb,
                  ${vendedorId}, ${todoDigital ? 'entregado' : 'pagado'}, ${telefonoPedido},
                  ${todoDigital ? 'digital' : quiereRecogida ? 'recogida' : 'envio'})
        `);
        const ok = await pagarConPuntos(db, req.user!.id, vendedorId, puntosUsados, pedidoId);
        if (!ok) {
          await db.execute(sql`DELETE FROM pedidos WHERE id = ${pedidoId} AND puntos_usados = 0`);
          return res.status(409).json({ error: 'Tu saldo de puntos ha cambiado y ya no alcanza. Vuelve a intentarlo.' });
        }
        if (cuponRow) {
          await db.execute(sql`UPDATE cupones SET usos = usos + 1, updated_at = now() WHERE id = ${cuponRow.id}`);
          await db.execute(sql`UPDATE pedidos SET cupon_codigo = ${cuponRow.codigo}, descuento_centimos = ${cuponCent} WHERE id = ${pedidoId}`);
        }
        for (const l of lineas) {
          await db.execute(sql`
            INSERT INTO pedido_lineas (id, pedido_id, producto_id, producto_nombre, unidades, precio_unitario_centimos, variante_id, variante_nombre)
            VALUES (${'PLN' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
                    ${pedidoId}, ${l.p.id}, ${l.nombre}, ${l.unidades}, ${l.precio}, ${l.v?.id || null}, ${l.v?.nombre || null})
          `);
          if (l.llevaCuenta) {
            if (l.v) await db.execute(sql`UPDATE producto_variantes SET stock = GREATEST(0, stock - ${l.unidades}), updated_at = now() WHERE id = ${l.v.id} AND stock IS NOT NULL`);
            else await db.execute(sql`UPDATE products SET stock = GREATEST(0, stock - ${l.unidades}) WHERE id = ${l.p.id} AND stock IS NOT NULL`);
          }
        }
        // EL VENDEDOR SE ENTERA (2026-08-23): hasta hoy vendía y no lo sabía
        // salvo que entrara en Comercio. Un aviso por la campana, con el
        // código, que lleva a su panel de pedidos.
        await avisar(db, {
          paraQuien: vendedorId, dePartede: req.user!.id, tipo: 'pedido_nuevo', entidadTipo: 'pedidos', entidadId: pedidoId,
          datos: { texto: `${resumen} · pedido ${codigo} · pagado con ${puntosUsados.toLocaleString('es-ES')} puntos`, codigo, destino: '/comercio?pestana=pedidos' },
        });
        // WhatsApp (F6): al comprador su código, al vendedor que ha vendido.
        // Apagado hasta que Eugenio tenga cuenta y plantillas: entonces solo
        // se anota lo que se habría enviado.
        const vendedorTel = vendedorId ? (await db.execute(sql`SELECT telefono FROM users WHERE id = ${vendedorId}`)).rows[0] as any : null;
        await avisarPorWhatsApp(db, {
          telefono: telefonoPedido, userId: req.user!.id, motivo: 'compra_hecha', entidadTipo: 'pedidos', entidadId: pedidoId,
          texto: `Compra hecha en ${dominioPublico()}: ${resumen}. Tu código de pedido es ${codigo}. Puedes seguirlo en ${dominioPublico()}/pedido?codigo=${codigo}`,
          parametros: [resumen, codigo],
        });
        await avisarPorWhatsApp(db, {
          telefono: vendedorTel?.telefono, userId: vendedorId, motivo: 'venta_nueva', entidadTipo: 'pedidos', entidadId: pedidoId,
          texto: `Has vendido: ${resumen} (pedido ${codigo}), pagado con ${puntosUsados} puntos. Míralo en ${dominioPublico()}/comercio`,
          parametros: [resumen, codigo],
        });
        return res.json({
          pagado_con_puntos: true, codigo, puntos_usados: puntosUsados,
          subtotal_centimos: subtotal, descuento_centimos: descuentoCentimos, envio_centimos: envioCobrado,
          url: `${destino}${destino.includes('?') ? '&' : '?'}compra=hecha&pedido=${codigo}`,
        });
      }

      // PARTE EN PUNTOS + RESTO EN EUROS: un cupón de Stripe por el importe
      // exacto del descuento, y los puntos viajan en los metadatos para que el
      // webhook los cobre al confirmar el pago (nunca antes: una sesión
      // abandonada no mueve puntos).
      const stripe = getStripe();
      // Un solo cupón de Stripe con la suma de las dos rebajas (la del
      // vendedor y la de los puntos), con el nombre que se verá en el recibo.
      const rebajaTotal = descuentoCentimos + cuponCent;
      const cupon = rebajaTotal > 0
        ? await stripe.coupons.create({
            amount_off: rebajaTotal, currency: moneda, duration: 'once',
            name: [cuponRow ? `Cupón ${cuponRow.codigo}` : '', puntosUsados > 0 ? `${puntosUsados} puntos` : ''].filter(Boolean).join(' + '),
          })
        : null;
      const sesion = await stripe.checkout.sessions.create({
        mode: suscripcion ? 'subscription' : 'payment',
        // EL TELÉFONO, PARA AVISAR POR WHATSAPP (F6, 2026-08-24). Se pide en
        // el pago porque quien compra sin cuenta no tiene dónde dejarlo, y sin
        // él su código de pedido solo vive en una pestaña que puede cerrar.
        // Es opcional para Stripe: quien no quiera, sigue comprando igual.
        phone_number_collection: { enabled: true },
        ...(cupon ? { discounts: [{ coupon: cupon.id }] } : {}),
        ui_mode: 'hosted',
        line_items: lineas.map(l => ({
          price_data: {
            currency: moneda,
            product_data: { name: l.nombre, description: l.p.description || undefined },
            unit_amount: l.precio,
            ...(suscripcion ? { recurring: { interval: l.p.billing_period === 'anual' ? 'year' as const : 'month' as const } } : {}),
          },
          quantity: l.unidades,
        })),
        ...(suscripcion ? {} : { customer_creation: 'always' as const }),
        ...(esFisico ? {
          shipping_address_collection: { allowed_countries: [...PAISES_DE_ENVIO] },
          ...(envioCobrado !== null ? {
            shipping_options: [{
              shipping_rate_data: {
                type: 'fixed_amount' as const,
                fixed_amount: { amount: envioCobrado, currency: moneda },
                display_name: envioCobrado === 0 ? 'Envío gratis' : 'Envío',
              },
            }],
          } : {}),
        } : {}),
        ...(reparte && !suscripcion ? {
          payment_intent_data: {
            application_fee_amount: comisionReal,
            transfer_data: { destination: vendedor.stripe_account_id },
          },
        } : {}),
        metadata: {
          kind: 'compra_publica',
          vendedor_id: vendedorId || '',
          puntos: puntosUsados > 0 ? String(puntosUsados) : '',
          buyer_id: puntosUsados > 0 && req.user ? req.user.id : '',
          cupon_id: cuponRow ? String(cuponRow.id) : '',
          cupon_codigo: cuponRow ? String(cuponRow.codigo) : '',
          cupon_centimos: cuponCent > 0 ? String(cuponCent) : '',
          envio_centimos: envioCobrado === null ? '' : String(envioCobrado),
          // Qué llevaba el carrito, para que el aviso de Stripe pueda crear el
          // pedido sin volver a preguntarle al navegador — que para entonces
          // ya no está.
          lineas: JSON.stringify(lineas.map(l => [l.p.id, l.unidades, l.precio, l.v?.id || ''])),
          // El cobro agregado (2026-08-24): el webhook creará un pedido y una
          // liquidación por tienda en vez de uno solo.
          cobro_agregado: cobroAgregado ? '1' : '',
          // Se conservan para los pedidos de una sola cosa, que es lo que ya
          // existía y sigue funcionando igual.
          product_id: lineas.length === 1 ? lineas[0].p.id : '',
          quantity: lineas.length === 1 ? String(lineas[0].unidades) : '',
        },
        success_url: `${destino}?compra=hecha&sesion={CHECKOUT_SESSION_ID}`,
        cancel_url: `${destino}?compra=cancelada`,
        expires_at: Math.floor(Date.now() / 1000) + MINUTOS_DE_RESERVA * 60,
      });

      // Las reservas se anotan DESPUÉS de que Stripe acepte: si la sesión
      // falla, no queda stock retenido por una compra que nunca existió.
      for (const l of lineas) {
        if (!l.llevaCuenta) continue;
        await db.execute(sql`
          INSERT INTO reservas_stock (id, producto_id, unidades, stripe_session_id, estado, expira_at, variante_id)
          VALUES (${'RSV' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
                  ${l.p.id}, ${l.unidades}, ${sesion.id}, 'abierta',
                  now() + (${MINUTOS_DE_RESERVA} || ' minutes')::interval, ${l.v?.id || null})
          ON CONFLICT (stripe_session_id, producto_id, coalesce(variante_id, '')) DO NOTHING
        `);
      }

      res.json({
        url: sesion.url, reparte, comision_centimos: comision,
        subtotal_centimos: subtotal,
        envio_centimos: envioCobrado,
        pide_direccion: esFisico,
        lineas: lineas.length,
        puntos_usados: puntosUsados, descuento_centimos: descuentoCentimos,
        cupon: cuponRow ? cuponRow.codigo : null, cupon_centimos: cuponCent,
      });
    } catch (e: any) {
      console.error('comprar publico:', e);
      res.status(500).json({ error: 'No se ha podido abrir el pago. Inténtalo dentro de un momento.' });
    }
  });

  /**
   * VENDER LO TUYO SIN PERMISO ESPECIAL — fase 8 del plan de tiendas
   *
   * Crear un producto exigía nivel 2, y el motivo era bueno: `POST
   * /api/products` mete cosas en el MERCADO COMÚN, colgadas de territorios,
   * retos y soluciones. Eso es conocimiento compartido y se protege.
   *
   * Pero vender tu propia miel en tu propia tienda no es eso. Nadie tiene que
   * verificarte para poner un tarro a la venta en tu casa, igual que nadie te
   * verifica para escribir una página.
   *
   * ── LO QUE SE ABRE Y LO QUE SIGUE CERRADO ─────────────────────────────────
   * Lo que se crea aquí nace con `status = 'tienda'`: sale en TU tienda y
   * **no** en el mercado común, porque `GET /api/products` sólo mira los
   * `activo`. Así la puerta del mercado sigue exactamente donde estaba —no la
   * he tocado— y aun así puedes vender desde el primer día.
   *
   * Colgar un producto de un territorio o de un reto sigue siendo nivel 2.
   * Eso sí es escribir en lo de todos.
   *
   * ── EL LÍMITE ─────────────────────────────────────────────────────────────
   * Diez productos mientras no estés verificado. No es desconfianza: es que un
   * límite se puede subir cuando alguien lo necesita, y una puerta cerrada
   * sólo se puede abrir del todo. Diez tarros son una tienda; mil son otra
   * cosa y merecen una conversación.
   */
  app.post('/api/publicar/mis-productos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const nivel = req.user.roleLevel ?? 0;

      const {
        nombre, descripcion, precio_centimos, moneda, tipo, categoria,
        stock, envio_centimos, envio_gratis_desde_centimos, envio_plazo,
        garantia, devoluciones, imagenes, periodo, archivo_digital, acepta_puntos, borrador, variantes, iva_pct,
      } = req.body || {};
      // IVA del producto (F4): 21/10/4/0 o nulo = el tipo por defecto del vendedor.
      const iva = iva_pct === null || iva_pct === undefined || iva_pct === '' ? null : Number(iva_pct);
      if (iva !== null && ![21, 10, 4, 0].includes(iva)) return res.status(400).json({ error: 'El IVA tiene que ser 21, 10, 4 o 0.' });
      // El archivo de una descarga: solo de nuestra zona privada (ver PUT).
      const archivo = typeof archivo_digital === 'string' && archivo_digital.startsWith('/uploads/privado/') ? archivo_digital : null;

      const nom = String(nombre || '').trim();
      if (!nom) return res.status(400).json({ error: 'Ponle un nombre.' });
      if (nom.length > 200) return res.status(400).json({ error: 'El nombre es demasiado largo.' });

      // El precio puede faltar —«precio a consultar» es una respuesta válida—
      // pero si viene tiene que ser un número entero de céntimos y positivo.
      // Un precio negativo sería pagarle a quien compra.
      let precio: number | null = null;
      if (precio_centimos !== null && precio_centimos !== undefined && precio_centimos !== '') {
        precio = Math.round(Number(precio_centimos));
        if (!Number.isFinite(precio) || precio < 0) {
          return res.status(400).json({ error: 'El precio no es un número válido.' });
        }
      }

      if (nivel < 2) {
        const n = (await db.execute(sql`
          SELECT COUNT(*) AS n FROM products
          WHERE created_by = ${req.user.id} AND archived_at IS NULL
        `)).rows[0] as any;
        if (Number(n.n) >= MAX_PRODUCTOS_SIN_VERIFICAR) {
          return res.status(409).json({
            error: `De momento puedes tener ${MAX_PRODUCTOS_SIN_VERIFICAR} productos. Para tener más, verifica tu cuenta.`,
            limite: MAX_PRODUCTOS_SIN_VERIFICAR,
          });
        }
      }

      // ── QUÉ CLASE DE COSA SE VENDE ────────────────────────────────────
      // Cuatro, y no dos. Un servicio no se envía ni se descarga —una hora de
      // asesoría, un taller, una visita— y una suscripción se cobra otra vez
      // cada mes, que en Stripe es un modo de pago distinto, no un detalle.
      //
      // Sin esto no se podía dar de alta ni un servicio ni una SaaS, que son
      // dos de las tres formas de vender que tiene la gente. Sólo se podía
      // vender lo que cabe en una caja.
      const TIPOS = new Set(['fisico', 'digital', 'servicio']);
      const esSuscripcion = tipo === 'suscripcion';
      const clase = esSuscripcion ? 'digital' : (TIPOS.has(String(tipo)) ? String(tipo) : 'fisico');
      // Mensual salvo que se diga otra cosa. `anual` y `trimestral` son lo que
      // entiende el cobro; cualquier otra cosa se trata como mensual en vez de
      // rechazar el alta por una palabra.
      const PERIODOS = new Set(['mensual', 'trimestral', 'anual']);
      const cadaCuanto = esSuscripcion
        ? (PERIODOS.has(String(periodo)) ? String(periodo) : 'mensual')
        : null;

      const id = 'PRD' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
      // `tienda` para quien no está verificado; `activo` para quien sí, que es
      // lo que ya podía hacer por la otra puerta.
      // BORRADOR (2026-08-23, plan de comercio): un producto a medias no se ve
      // ni se puede comprar hasta que su dueño lo publique. Hasta hoy todo
      // nacía publicado, y un precio provisional era un precio a la venta.
      const estado = borrador === true ? 'borrador' : (nivel >= 2 ? 'activo' : 'tienda');
      const fotos = Array.isArray(imagenes) ? imagenes.filter((x: any) => typeof x === 'string').slice(0, 8) : [];

      await db.execute(sql`
        INSERT INTO products (id, name, description, category, price_cents, currency, kind,
                              modality, billing_period,
                              stock, warranty, return_policy, images, status, created_by, updated_by,
                              envio_centimos, envio_gratis_desde_centimos, envio_plazo, archivo_digital, acepta_puntos, iva_pct)
        VALUES (${id}, ${nom}, ${String(descripcion || '').trim() || null},
                ${String(categoria || 'OTROS').toUpperCase()}, ${precio},
                ${String(moneda || 'EUR').toUpperCase()},
                ${clase},
                ${esSuscripcion ? 'suscripcion' : 'unico'}, ${cadaCuanto},
                ${stock === null || stock === undefined || stock === '' ? null : Math.max(0, Math.round(Number(stock) || 0))},
                ${String(garantia || '').trim() || null}, ${String(devoluciones || '').trim() || null},
                ${JSON.stringify(fotos)}::jsonb, ${estado}, ${req.user.id}, ${req.user.id},
                ${envio_centimos === null || envio_centimos === undefined || envio_centimos === '' ? null : Math.max(0, Math.round(Number(envio_centimos) || 0))},
                ${envio_gratis_desde_centimos === null || envio_gratis_desde_centimos === undefined || envio_gratis_desde_centimos === '' ? null : Math.max(0, Math.round(Number(envio_gratis_desde_centimos) || 0))},
                ${String(envio_plazo || '').trim() || null},
                ${clase === 'digital' ? archivo : null}, ${acepta_puntos === true}, ${iva})
      `);
      // Las variantes, si las trae (2026-08-23).
      if (Array.isArray(variantes) && variantes.length) await guardarVariantes(db, id, variantes);

      res.json({
        id, estado, tipo: clase, suscripcion: esSuscripcion, periodo: cadaCuanto,
        // Se dice en la respuesta, no se deja que lo descubra al no verlo en
        // el mercado: quien vende tiene derecho a saber dónde sale su cosa.
        en_el_mercado_comun: estado === 'activo',
        aviso: estado === 'tienda'
          ? 'Está a la venta en tu tienda. Para que salga también en el mercado común, verifica tu cuenta.'
          : null,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿ESTÁ ABIERTA LA COMPRA? — `GET /api/publicar/cobro`
   *
   * Lo pregunta la ficha de producto antes de pintar el botón. Sin esto, el
   * botón saldría igual y fallaría al pulsarlo, que es exactamente lo que se
   * evitó en la fase 2: un botón que se puede pulsar es una promesa.
   */
  app.get('/api/publicar/cobro', (_req: Request, res: Response) => {
    // `pruebas` NO es un detalle técnico: es lo que hay que decirle a quien va
    // a pagar. Con una clave de pruebas, Stripe rechaza cualquier tarjeta de
    // verdad — así que quien lo intente se llevará un error sin entender por
    // qué, y peor: alguien puede creer que ha comprado algo. Se avisa antes,
    // en el botón, no después.
    res.json({
      abierto: COBRO_ENCENDIDO,
      pruebas: (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test'),
    });
  });

  /** Lo que tengo a la venta. Con sesión: son mis cosas. */
  app.get('/api/publicar/mis-productos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, name, price_cents, currency, kind, stock, status, images,
               envio_centimos, envio_gratis_desde_centimos, envio_plazo, created_at,
               (archivo_digital IS NOT NULL) AS con_archivo, acepta_puntos,
               (SELECT round(avg(score) / 2.0, 1)::float FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS media_estrellas,
               (SELECT count(*)::int FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS n_resenas,
               (archivo_digital IS NOT NULL) AS con_archivo
        FROM products
        WHERE created_by = ${req.user.id} AND archived_at IS NULL
        ORDER BY created_at DESC
      `);
      // Variantes de cada producto (2026-08-23), para el editor del panel.
      const mapaVariantes = await variantesDe(db, (r.rows as any[]).map((x: any) => x.id));
      for (const x of r.rows as any[]) x.variantes = mapaVariantes.get(x.id) || [];
      res.json({
        productos: r.rows,
        limite: (req.user.roleLevel ?? 0) >= 2 ? null : MAX_PRODUCTOS_SIN_VERIFICAR,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * CAMBIAR O RETIRAR LO MÍO.
   *
   * El `WHERE created_by` no es un adorno: sin él, cualquiera con sesión
   * podría cambiarle el precio a otro. Y retirar es `archived_at`, nunca
   * borrar: hay pedidos que apuntan a este producto y tienen que seguir
   * diciendo qué se vendió (regla 2 de la casa).
   */
  app.put('/api/publicar/mis-productos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const b = req.body || {};
      const num = (v: any) => v === null || v === undefined || v === '' ? null : Math.max(0, Math.round(Number(v) || 0));

      const r = await db.execute(sql`
        UPDATE products SET
          name = COALESCE(${b.nombre ? String(b.nombre).trim() : null}, name),
          description = COALESCE(${b.descripcion !== undefined ? String(b.descripcion).trim() : null}, description),
          price_cents = COALESCE(${num(b.precio_centimos)}, price_cents),
          stock = CASE WHEN ${b.stock !== undefined} THEN ${num(b.stock)} ELSE stock END,
          envio_centimos = CASE WHEN ${b.envio_centimos !== undefined} THEN ${num(b.envio_centimos)} ELSE envio_centimos END,
          envio_gratis_desde_centimos = CASE WHEN ${b.envio_gratis_desde_centimos !== undefined} THEN ${num(b.envio_gratis_desde_centimos)} ELSE envio_gratis_desde_centimos END,
          envio_plazo = COALESCE(${b.envio_plazo !== undefined ? String(b.envio_plazo).trim() || null : null}, envio_plazo),
          archived_at = CASE WHEN ${b.retirar === true} THEN now() ELSE archived_at END,
          -- El archivo de un producto digital: solo URLs de NUESTRA zona
          -- privada. Una URL externa aquí sería «entregar» un enlace que no
          -- controlamos, y una pública de /uploads sería regalar el archivo.
          archivo_digital = CASE
            WHEN ${typeof b.archivo_digital === 'string' && b.archivo_digital.startsWith('/uploads/privado/')} THEN ${typeof b.archivo_digital === 'string' ? b.archivo_digital : null}
            ELSE archivo_digital END,
          acepta_puntos = CASE WHEN ${b.acepta_puntos !== undefined} THEN ${!!b.acepta_puntos} ELSE acepta_puntos END,
          iva_pct = CASE WHEN ${b.iva_pct !== undefined} THEN ${b.iva_pct === null || b.iva_pct === '' ? null : Number(b.iva_pct)} ELSE iva_pct END,
          -- Publicar un borrador o volver a borrador. Al publicar, el estado
          -- es el que le toca por nivel: mercado común (activo) o solo su
          -- tienda (tienda) — la misma regla que al crearlo.
          status = CASE
            WHEN ${b.borrador === true} THEN 'borrador'
            WHEN ${b.publicar === true} THEN ${(req.user.roleLevel ?? 0) >= 2 ? 'activo' : 'tienda'}
            ELSE status END,
          updated_by = ${req.user.id},
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND created_by = ${req.user.id}
        RETURNING id, name, price_cents, stock, status, archived_at, (archivo_digital IS NOT NULL) AS con_archivo
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese producto no es tuyo o no existe.' });
      // Las variantes, si vienen (2026-08-23): la lista entera manda — lo que
      // no está, se desactiva.
      if (Array.isArray(b.variantes)) await guardarVariantes(db, String(req.params.id), b.variantes);
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ══ LOS PEDIDOS, DE VUELTA (2026-08-22, Programador 7) ═══════════════════
  // Las tres rutas de la fase 6 —«¿dónde está lo mío?», «¿qué tengo que
  // enviar?» y «marcar como enviado»— DESAPARECIERON en el commit del carrito
  // (747b82c): la pantalla /pedido y la pestaña Pedidos de /comercio las
  // siguieron llamando y producción contestaba 404 a las dos. Se reponen aquí
  // tal como eran, con dos añadidos: las LÍNEAS del pedido (desde el carrito un
  // pedido tiene varias) y la DESCARGA de lo digital, que es lo que faltaba
  // para que «se cobra y se entrega» sea verdad.

  /**
   * ¿DÓNDE ESTÁ LO MÍO? — `GET /api/publicar/pedido/:codigo?correo=`
   *
   * Quien compró sin cuenta no tiene un «mis pedidos»: el código es su llave,
   * y el correo la segunda llave — con 8 caracteres, sin correo alguien podría
   * probar códigos hasta leer la dirección de un desconocido. La respuesta es
   * 404 tanto si el código no existe como si el correo no cuadra: decir «el
   * código existe pero el correo no» ya confirmaría el código.
   *
   * Devuelve las líneas, y en cada línea digital con archivo, la URL de
   * descarga (que vuelve a pedir el correo: la llave viaja con el enlace).
   */
  /**
   * ¿YA EXISTE MI PEDIDO? — `GET /api/publicar/pedido-por-sesion/:sesion`
   * Al volver de Stripe la página solo sabe el id de la sesión de pago; el
   * pedido lo crea el webhook un instante después. La confirmación pregunta
   * aquí hasta que aparece. Solo devuelve el código: con él y el correo (o la
   * sesión de quien compró) se consulta el resto.
   */
  app.get('/api/publicar/pedido-por-sesion/:sesion', async (req: Request, res: Response) => {
    try {
      const sid = String(req.params.sesion || '').trim();
      if (!sid.startsWith('cs_')) return res.status(400).json({ error: 'Esa sesión de pago no se entiende.' });
      const r = await db.execute(sql`SELECT codigo FROM pedidos WHERE stripe_session_id = ${sid}`);
      if (!r.rows[0]) return res.status(404).json({ pendiente: true, error: 'Todavía estamos confirmando el pago.' });
      res.json({ codigo: (r.rows[0] as any).codigo });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/publicar/pedido/:codigo', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || '').toUpperCase().trim();
      const correo = String(req.query.correo || '').toLowerCase().trim();
      // Dos llaves: el correo, o la sesión de quien compró con cuenta.
      const quien = req.user?.id || null;
      if (!codigo || (!correo && !quien)) {
        return res.status(400).json({ error: 'Hacen falta el código y el correo con el que se compró.' });
      }
      const r = await db.execute(sql`
        SELECT id, codigo, producto_nombre, unidades, importe_centimos, envio_centimos,
               moneda, estado, seguimiento, created_at, updated_at, direccion_envio,
               puntos_usados, cupon_codigo, descuento_centimos, comprador_email, vendedor_user_id, telefono_contacto,
               entrega_estimada, comprador_user_id
        FROM pedidos
        WHERE codigo = ${codigo}
          AND ((${correo} <> '' AND lower(comprador_email) = ${correo}) OR (${quien}::text IS NOT NULL AND comprador_user_id = ${quien}))
      `);
      const p = r.rows[0] as any;
      if (!p) return res.status(404).json({ error: 'No hay ningún pedido con ese código y ese correo.' });

      const lineas = (await db.execute(sql`
        SELECT l.id, l.producto_nombre, l.unidades, l.precio_unitario_centimos,
               coalesce(pr.kind, 'fisico') AS kind,
               (pr.archivo_digital IS NOT NULL) AS con_archivo
        FROM pedido_lineas l LEFT JOIN products pr ON pr.id = l.producto_id
        WHERE l.pedido_id = ${p.id}
        ORDER BY l.created_at
      `)).rows as any[];
      const vivo = !['cancelado', 'devuelto'].includes(p.estado);

      res.json({
        codigo: p.codigo,
        producto: p.producto_nombre,
        unidades: Number(p.unidades),
        importe_centimos: Number(p.importe_centimos),
        envio_centimos: Number(p.envio_centimos),
        moneda: p.moneda,
        estado: p.estado,
        seguimiento: p.seguimiento || null,
        ciudad: p.direccion_envio?.city || null,
        hecho_el: p.created_at,
        entrega_estimada: p.entrega_estimada || null,
        // La última devolución de este pedido (F7): qué pidió, en qué estado
        // está y qué contestó el vendedor.
        devolucion: (await db.execute(sql`
          SELECT motivo, estado, respuesta, created_at, resuelta_en FROM devoluciones WHERE pedido_id = ${p.id} ORDER BY created_at DESC LIMIT 1
        `)).rows[0] || null,
        // ¿Se puede pedir la devolución? Se dice aquí para que la pantalla no
        // tenga que adivinar la regla ni repetirla.
        se_puede_devolver: !['devuelto', 'cancelado'].includes(p.estado)
          && (Date.now() - new Date(p.created_at).getTime()) / 86400000 <= numeroSincrono('DIAS_PARA_DEVOLVER'),
        // Escribirle al vendedor por WhatsApp (F6): lo abre quien pulsa, con
        // el texto escrito. Solo si el vendedor dio su número.
        whatsapp_vendedor: await (async () => {
          if (!p.vendedor_user_id) return null;
          const v = (await db.execute(sql`SELECT telefono, coalesce(display_name, name) AS nombre FROM users WHERE id = ${p.vendedor_user_id}`)).rows[0] as any;
          return enlaceWa(v?.telefono, `Hola${v?.nombre ? ` ${v.nombre}` : ''}, te escribo por el pedido ${p.codigo} (${p.producto_nombre}).`);
        })(),
        cambiado_el: p.updated_at,
        // Lo que se pagó con puntos y con cupón, para que la confirmación y
        // «¿dónde está lo mío?» lo digan sin consultar el libro.
        puntos_usados: Number(p.puntos_usados || 0),
        cupon: p.cupon_codigo || null,
        descuento_centimos: Number(p.descuento_centimos || 0),
        // Un pedido sin nada físico no se envía: la pantalla no debe pintar
        // «enviado» como un paso pendiente que nunca llegará.
        solo_digital: lineas.length > 0 && lineas.every(l => l.kind === 'digital'),
        lineas: lineas.map(l => ({
          id: l.id,
          producto: l.producto_nombre,
          unidades: Number(l.unidades),
          precio_unitario_centimos: Number(l.precio_unitario_centimos),
          digital: l.kind === 'digital',
          // `null` con tres significados distinguibles desde la pantalla:
          // no es digital (nada que descargar), es digital pero el vendedor
          // no subió el archivo (se dice), o el pedido no está vivo.
          descarga: l.kind === 'digital' && l.con_archivo && vivo
            ? `/api/publicar/pedido/${encodeURIComponent(p.codigo)}/descarga/${encodeURIComponent(l.id)}${correo ? `?correo=${encodeURIComponent(correo)}` : ''}`
            : null,
          sin_archivo: l.kind === 'digital' && !l.con_archivo,
        })),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * LA DESCARGA — `GET /api/publicar/pedido/:codigo/descarga/:lineaId?correo=`
   *
   * La única puerta por la que sale un archivo de la zona privada. Comprueba
   * las dos llaves (código + correo), que la línea sea de ESE pedido, que el
   * producto sea digital y tenga archivo, y que el pedido no esté cancelado ni
   * devuelto. Se sirve siempre como descarga (Content-Disposition), con el
   * nombre del producto y no el UUID del disco.
   */
  app.get('/api/publicar/pedido/:codigo/descarga/:lineaId', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || '').toUpperCase().trim();
      const correo = String(req.query.correo || '').toLowerCase().trim();
      // Dos llaves válidas: el correo del pedido, o la SESIÓN de quien lo
      // compró con cuenta (2026-08-22: la confirmación de compra enseña las
      // descargas sin pedir el correo a quien acaba de pagar con su sesión).
      const quien = req.user?.id || null;
      if (!codigo || (!correo && !quien)) return res.status(400).json({ error: 'Hacen falta el código y el correo.' });
      const r = await db.execute(sql`
        SELECT pr.archivo_digital, l.producto_nombre, p.estado
        FROM pedidos p
        JOIN pedido_lineas l ON l.pedido_id = p.id AND l.id = ${String(req.params.lineaId)}
        JOIN products pr ON pr.id = l.producto_id
        WHERE p.codigo = ${codigo}
          AND ((${correo} <> '' AND lower(p.comprador_email) = ${correo}) OR (${quien}::text IS NOT NULL AND p.comprador_user_id = ${quien}))
          AND coalesce(pr.kind, 'fisico') = 'digital'
      `);
      const fila = r.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'No hay ninguna descarga con ese código y ese correo.' });
      if (['cancelado', 'devuelto'].includes(fila.estado)) {
        return res.status(410).json({ error: 'Este pedido se canceló o se devolvió; la descarga ya no está disponible.' });
      }
      if (!fila.archivo_digital) {
        return res.status(409).json({ error: 'Quien vende todavía no ha subido el archivo de este producto. Escríbele: tu pedido está pagado.' });
      }
      const ruta = rutaLocalDeUpload(fila.archivo_digital);
      if (!ruta || !existsSync(ruta)) {
        console.error(`[comercio] archivo digital ausente en disco para ${codigo}/${req.params.lineaId}: ${fila.archivo_digital}`);
        return res.status(404).json({ error: 'El archivo no está donde debería. Avisa a quien vende: tu pedido está pagado.' });
      }
      const ext = path.extname(ruta);
      const nombre = String(fila.producto_nombre || 'descarga').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 80) || 'descarga';
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nombre + ext)}`);
      res.setHeader('Cache-Control', 'private, no-store');
      createReadStream(ruta).pipe(res);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿QUÉ TENGO QUE ENVIAR? — `GET /api/publicar/mis-ventas`
   * Con sesión: los pedidos de quien vende, y solo los suyos. Aquí sí va la
   * dirección entera, que es lo que hay que escribir en la caja.
   */
  app.get('/api/publicar/mis-ventas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, codigo, producto_nombre, unidades, importe_centimos, envio_centimos,
               moneda, comprador_email, comprador_nombre, direccion_envio, telefono_contacto, entrega_estimada,
               (SELECT row_to_json(x) FROM (SELECT id, motivo, estado, created_at FROM devoluciones WHERE pedido_id = pedidos.id ORDER BY created_at DESC LIMIT 1) x) AS devolucion,
               estado, seguimiento, created_at
        FROM pedidos
        WHERE vendedor_user_id = ${req.user.id}
        ORDER BY created_at DESC
        LIMIT 200
      `);
      // El enlace para escribirle a quien compró (F6): se calcula aquí, no en
      // la pantalla, para no repartir teléfonos por el cliente sin motivo.
      for (const p of r.rows as any[]) {
        p.whatsapp_comprador = enlaceWa(p.telefono_contacto, `Hola${p.comprador_nombre ? ` ${String(p.comprador_nombre).split(' ')[0]}` : ''}, te escribo por tu pedido ${p.codigo} (${p.producto_nombre}).`);
        delete p.telefono_contacto;
      }
      res.json({ pedidos: r.rows });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * MARCAR UN PEDIDO — `PUT /api/publicar/mis-ventas/:id` { estado?, seguimiento?, nota? }
   * Solo quien lo vendió. El `WHERE vendedor_user_id` no es un adorno: sin él,
   * cualquiera con sesión podría marcar como entregado el pedido de otro.
   */
  app.put('/api/publicar/mis-ventas/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const { estado, seguimiento, nota, entrega_estimada } = req.body || {};
      // «preparando» (F7, 2026-08-24): el hueco entre pagado y enviado. Sin él,
      // un pedido que alguien está empaquetando parece un pedido olvidado.
      const VALIDOS = ['pagado', 'preparando', 'enviado', 'entregado', 'devuelto', 'cancelado'];
      if (estado && !VALIDOS.includes(estado)) return res.status(400).json({ error: 'Ese estado no existe.' });
      // DEVOLVER O CANCELAR UNA COMPRA PAGADA CON PUNTOS (2026-08-23): antes de
      // cambiar el estado, los puntos vuelven al comprador con apuntes
      // contrarios (vendedor y plataforma devuelven lo suyo). Si el vendedor
      // ya no tiene saldo, no se marca devuelto: una devolución a medias es
      // peor que ninguna, y el mensaje dice por qué.
      let puntosDevueltos = 0;
      if (estado === 'devuelto' || estado === 'cancelado') {
        const mio = (await db.execute(sql`
          SELECT id, estado FROM pedidos WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}
        `)).rows[0] as any;
        if (!mio) return res.status(404).json({ error: 'Ese pedido no es tuyo o no existe.' });
        if (!['devuelto', 'cancelado'].includes(mio.estado)) {
          const dev = await devolverPuntos(db, mio.id);
          if (!dev.ok) return res.status(409).json({ error: dev.motivo || 'No se han podido devolver los puntos.' });
          puntosDevueltos = dev.puntos || 0;
        }
      }
      const r = await db.execute(sql`
        UPDATE pedidos SET
          estado = COALESCE(${estado || null}, estado),
          seguimiento = COALESCE(${seguimiento ?? null}, seguimiento),
          nota_vendedor = COALESCE(${nota ?? null}, nota_vendedor),
          entrega_estimada = CASE WHEN ${entrega_estimada !== undefined} THEN ${entrega_estimada || null}::date ELSE entrega_estimada END,
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}
        RETURNING id, codigo, estado, seguimiento, comprador_user_id, producto_nombre
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese pedido no es tuyo o no existe.' });
      const fila = r.rows[0] as any;
      // EL COMPRADOR SE ENTERA (2026-08-23): si el estado ha cambiado y el
      // pedido tiene cuenta detrás, un aviso con lo que ha pasado y el
      // número de seguimiento si lo hay. Quien compró sin cuenta sigue
      // teniendo su código y la página del pedido.
      if (estado && fila.comprador_user_id) {
        const TEXTO: Record<string, string> = {
          pagado: 'está pagado', preparando: 'se está preparando', enviado: 'ha salido', entregado: 'consta como entregado',
          devuelto: 'se ha devuelto', cancelado: 'se ha cancelado',
        };
        await avisar(db, {
          paraQuien: fila.comprador_user_id, dePartede: req.user.id, tipo: 'pedido_estado', entidadTipo: 'pedidos', entidadId: fila.id,
          datos: {
            texto: `Tu pedido ${fila.codigo} (${fila.producto_nombre}) ${TEXTO[estado] || estado}${fila.seguimiento && estado === 'enviado' ? ` · seguimiento ${fila.seguimiento}` : ''}${puntosDevueltos > 0 ? ` · ${puntosDevueltos.toLocaleString('es-ES')} puntos devueltos` : ''}.`,
            codigo: fila.codigo, estado, destino: `/pedido?codigo=${fila.codigo}`,
          },
        });
      }
      // Y por WhatsApp, si dejó número (F6): salir, llegar y devolver son las
      // tres cosas que alguien quiere saber sin tener que entrar a mirar.
      if (estado && ['enviado', 'entregado', 'devuelto'].includes(estado)) {
        const p2 = (await db.execute(sql`SELECT telefono_contacto, comprador_user_id, producto_nombre FROM pedidos WHERE id = ${fila.id}`)).rows[0] as any;
        const motivo = estado === 'enviado' ? 'pedido_enviado' : estado === 'entregado' ? 'pedido_entregado' : 'devolucion';
        const texto = estado === 'enviado'
          ? `Tu pedido ${fila.codigo} (${p2?.producto_nombre}) ha salido${fila.seguimiento ? `. Seguimiento: ${fila.seguimiento}` : ''}.`
          : estado === 'entregado'
            ? `Tu pedido ${fila.codigo} (${p2?.producto_nombre}) consta como entregado.`
            : `Tu pedido ${fila.codigo} (${p2?.producto_nombre}) se ha devuelto${puntosDevueltos > 0 ? `. Te han vuelto ${puntosDevueltos} puntos` : ''}.`;
        await avisarPorWhatsApp(db, {
          telefono: p2?.telefono_contacto, userId: p2?.comprador_user_id, motivo: motivo as any,
          entidadTipo: 'pedidos', entidadId: fila.id, texto,
          parametros: [fila.codigo, p2?.producto_nombre || '', fila.seguimiento || ''],
        });
      }
      res.json({ codigo: fila.codigo, estado: fila.estado, seguimiento: fila.seguimiento, puntos_devueltos: puntosDevueltos });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * CÓMO ESTÁ COMPARTIDA ESTA PÁGINA — `GET /api/publicar/estado/:id`
   *
   * Lo que la pantalla de compartir necesita saber al ABRIRSE: si está
   * publicada, con qué dirección, y si se dijo que sí o que no a los
   * buscadores.
   *
   * Sin esto la pantalla suponía. Y suponía que sí: quien había elegido «no
   * aparecer en Google» reabría el diálogo y veía «Sí» marcado, con lo que un
   * clic descuidado en cualquier otra cosa podía volver a indexarla. Una
   * pantalla que no lee el estado real acaba escribiéndolo mal.
   */
  app.get('/api/publicar/estado/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT w.publico, w.indexable, w.slug, u.handle
        FROM knowledge_windows w
        JOIN users u ON u.id = w.creator_user_id
        WHERE w.id = ${String(req.params.id)} AND w.creator_user_id = ${req.user.id}
      `);
      const w = r.rows[0] as any;
      if (!w) return res.status(404).json({ error: 'Esa página no es tuya o no existe.' });
      res.json({
        publico: !!w.publico,
        // `null` cuando nunca se ha publicado: «no se ha decidido» no es lo
        // mismo que «se dijo que no», y la pantalla los enseña distinto.
        indexable: w.publico ? !!w.indexable : null,
        slug: w.slug, handle: w.handle,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/publicar/resolver/:handle/:slug', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.config, w.indexable, w.created_at, w.updated_at,
               u.handle, u.display_name, u.name, u.avatar_url
        FROM knowledge_windows w
        JOIN users u ON u.id = w.creator_user_id
        WHERE u.handle = ${String(req.params.handle).toLowerCase()}
          AND w.slug = ${String(req.params.slug).toLowerCase()}
          AND w.publico = true
          AND w.archived_at IS NULL AND w.deleted_at IS NULL
      `);
      const w = r.rows[0] as any;
      if (!w) return res.status(404).json({ error: 'Esa página no existe o no está publicada.' });
      res.json({
        id: w.id, titulo: w.title, tipo: w.kind, config: w.config,
        indexable: w.indexable,
        autor: { handle: w.handle, nombre: w.display_name || w.name, avatar: w.avatar_url },
        created_at: w.created_at, updated_at: w.updated_at,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}

/** El primer texto que tenga la página, para el adelanto. `null` si no hay. */
function primerTexto(config: any): string | null {
  const bloques = config?.bloques || config?.blocks;
  if (!Array.isArray(bloques)) return null;
  for (const b of bloques) {
    const t = typeof b?.texto === 'string' ? b.texto.trim() : '';
    if (t) return t.length > 160 ? t.slice(0, 160) + '…' : t;
  }
  return null;
}

/** La misma comisión que cobra el mercado de dentro. Una sola cifra. */
/**
 * La comisión, del panel de Administración (0117). Era una constante leída al
 * arrancar: cambiarla exigía desplegar, y nadie podía ver qué comisión regía
 * en una fecha. Ahora es una función porque el valor puede cambiar mientras
 * el servidor corre.
 */
const comisionBps = () => Math.max(0, Math.min(10000, numeroSincrono('COMISION_BPS')));

/**
 * A dónde puede volver el comprador después de pagar.
 *
 * Sólo direcciones de este sitio. Si se aceptara la que venga en la petición,
 * cualquiera podría montar un enlace de compra que devuelve a su propia página
 * —con el aspecto de haber pasado por humanity.wiki— y usarlo para engañar.
 */
function destinoSeguro(propuesta: unknown): string {
  const base = process.env.APP_URL || 'https://humanity.wiki';
  if (typeof propuesta !== 'string' || !propuesta) return base;
  try {
    const u = new URL(propuesta);
    const anfitrion = u.hostname.toLowerCase();
    const valido = anfitrion === 'humanity.wiki' || anfitrion.endsWith('.humanity.wiki');
    if (!valido || u.protocol !== 'https:') return base;
    return u.origin + u.pathname;
  } catch { return base; }
}

/**
 * A dónde se puede enviar hoy.
 *
 * España y la Unión Europea. No es una limitación técnica: es que un envío
 * fuera de la UE lleva aduana, declaración e impuestos en destino, y ofrecerlo
 * sin resolver eso sería vender un envío que el vendedor no puede cumplir.
 * Cuando alguien lo necesite, se amplía aquí y se resuelve la aduana entonces.
 */
const PAISES_DE_ENVIO = [
  'ES', 'PT', 'FR', 'IT', 'DE', 'NL', 'BE', 'LU', 'IE', 'AT', 'DK', 'SE',
  'FI', 'PL', 'CZ', 'SK', 'SI', 'HR', 'HU', 'RO', 'BG', 'GR', 'EE', 'LV',
  'LT', 'MT', 'CY',
] as const;

/** Media hora para pagar: lo que dura la reserva y lo que dura la sesión. */
const MINUTOS_DE_RESERVA = 30;

/** Cuántas cosas distintas caben en un pago. Un carrito de cincuenta líneas
 *  es casi siempre un error o alguien probando, no una compra. */
const MAX_LINEAS = 20;

/**
 * Cuántos productos puede tener a la venta quien todavía no está verificado.
 *
 * Empezó en 10 con el argumento de que «un límite se sube cuando alguien lo
 * necesita». Alguien lo necesitó **el mismo día**: montar una tienda de
 * prueba realista —seis mieles, tres servicios y tres planes de suscripción—
 * lo agotó antes de terminar. Una SaaS con tres planes y dos servicios ya va
 * por cinco sin haber vendido nada.
 *
 * 30 es una tienda pequeña de verdad y sigue acotando el abuso: quien intente
 * llenar esto de basura con treinta piezas se ve igual de lejos y se retira
 * igual de rápido. El número no protege de nada que 10 no protegiera; sólo
 * estorbaba a quien iba en serio.
 */
const MAX_PRODUCTOS_SIN_VERIFICAR = 30;

/**
 * ¿Se puede pagar ya?
 *
 * Apagado por defecto **a propósito**: así el despliegue que lleva las fichas
 * de producto y la maquetación no lleva de tapadillo el cobro. Se enciende
 * poniendo `TIENDAS_COBRO=1` en el `.env.production` del servidor, que es un
 * cambio de una línea y su propio despliegue.
 */
const COBRO_ENCENDIDO = process.env.TIENDAS_COBRO === '1';

/**
 * Cuántas unidades de este producto está pagando alguien AHORA MISMO.
 *
 * Sólo cuentan las reservas abiertas y sin caducar. Las caducadas no se
 * borran —dicen que hubo un intento, y eso es información— pero dejan de
 * retener en cuanto pasa su hora, sin que nadie tenga que limpiarlas: la
 * condición está en la propia consulta.
 */
async function reservado(db: any, productoId: string, varianteId?: string | null): Promise<number> {
  // Con variante: solo lo reservado de ESA variante. Sin ella: todo lo del
  // producto (el stock de un producto sin variantes vive en products.stock).
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(unidades), 0) AS n
    FROM reservas_stock
    WHERE producto_id = ${productoId} AND estado = 'abierta' AND expira_at > now()
      AND (${varianteId ?? null}::text IS NULL OR variante_id = ${varianteId ?? null}::text)
  `);
  return Number(r.rows[0]?.n || 0);
}

/** Las variantes activas de uno o varios productos, con el stock que se puede comprar. */
async function variantesDe(db: any, productoIds: string[]): Promise<Map<string, any[]>> {
  const m = new Map<string, any[]>();
  if (!productoIds.length) return m;
  const r = await db.execute(sql`
    SELECT id, producto_id, nombre, sku, precio_centimos, stock
    FROM producto_variantes
    WHERE activo = true AND producto_id = ANY(string_to_array(${productoIds.join(',')}, ','))
    ORDER BY orden, created_at
  `);
  for (const v of r.rows as any[]) {
    const disponible = v.stock === null || v.stock === undefined ? null : Math.max(0, Number(v.stock) - await reservado(db, v.producto_id, v.id));
    const lista = m.get(v.producto_id) || [];
    lista.push({ id: v.id, nombre: v.nombre, sku: v.sku || null, precio_centimos: v.precio_centimos === null || v.precio_centimos === undefined ? null : Number(v.precio_centimos), stock: disponible });
    m.set(v.producto_id, lista);
  }
  return m;
}

/**
 * Guardar las variantes de un producto tal como llegan del formulario: las
 * que traen id se actualizan, las nuevas se insertan, y las que ya no vienen
 * se DESACTIVAN (nunca se borran: alguna línea de pedido puede nombrarlas).
 */
async function guardarVariantes(db: any, productoId: string, crudas: any) {
  if (!Array.isArray(crudas)) return;
  const limpias = crudas.slice(0, 60).map((v: any, i: number) => ({
    id: typeof v?.id === 'string' && v.id.startsWith('VAR') ? v.id : null,
    nombre: String(v?.nombre || '').trim().slice(0, 120),
    sku: String(v?.sku || '').trim().slice(0, 60) || null,
    precio: v?.precio_centimos === null || v?.precio_centimos === undefined || v?.precio_centimos === '' ? null : Math.max(0, Math.round(Number(v.precio_centimos) || 0)),
    stock: v?.stock === null || v?.stock === undefined || v?.stock === '' ? null : Math.max(0, Math.round(Number(v.stock) || 0)),
    orden: i,
  })).filter((v: any) => v.nombre);
  const vivas: string[] = [];
  for (const v of limpias) {
    if (v.id) {
      const r = await db.execute(sql`
        UPDATE producto_variantes SET nombre = ${v.nombre}, sku = ${v.sku}, precio_centimos = ${v.precio}, stock = ${v.stock}, orden = ${v.orden}, activo = true, updated_at = now()
        WHERE id = ${v.id} AND producto_id = ${productoId} RETURNING id
      `);
      if (r.rows[0]) { vivas.push(v.id); continue; }
    }
    const id = 'VAR' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
    await db.execute(sql`
      INSERT INTO producto_variantes (id, producto_id, nombre, sku, precio_centimos, stock, orden)
      VALUES (${id}, ${productoId}, ${v.nombre}, ${v.sku}, ${v.precio}, ${v.stock}, ${v.orden})
    `);
    vivas.push(id);
  }
  await db.execute(sql`
    UPDATE producto_variantes SET activo = false, updated_at = now()
    WHERE producto_id = ${productoId} AND activo = true
      AND NOT (id = ANY(string_to_array(${vivas.join(',') || '-'}, ',')))
  `);
}
