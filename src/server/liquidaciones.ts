// ============================================================================
// LIQUIDACIONES: DEVOLVERLE A CADA TIENDA LO QUE ES SUYO (2026-08-24, prog7)
// ============================================================================
// Eugenio: «un gestor de cobro donde la plataforma cobra en cuenta un dinero y
// luego le entrega al vendedor ese dinero… una operación de servicio de cobro
// a las tiendas». Esto es la segunda mitad: el dinero ya entró entero en la
// cuenta de la plataforma y hay que devolvérselo a cada una.
//
// LAS TRES REGLAS QUE SOSTIENEN ESTO, y ninguna es técnica:
//
//  1. ES DINERO AJENO. La deuda se apunta en el momento del cobro, no cuando
//     alguien se acuerda; dice desde el primer segundo cuándo vence; y solo
//     pasa a «pagada» cuando el proveedor de pago confirma la transferencia y
//     nos da su identificador. «Está pagada» tiene que ser un hecho
//     comprobable, no una palabra nuestra.
//
//  2. LA COMISIÓN ES LA DEL DÍA DE LA VENTA. Se guarda en la fila (`comision_bps`)
//     y no se vuelve a leer del panel. Si Eugenio sube la comisión mañana, lo
//     vendido ayer se liquida con la de ayer: lo contrario sería cambiar el
//     precio de algo que ya se vendió.
//
//  3. NADA SE BORRA. Una devolución o un contracargo no borran la deuda: la
//     retienen o la cancelan, con su motivo. El día que alguien pregunte «¿y
//     esos 40 euros?», la respuesta está escrita.
//
// NACE APAGADO (`COBRO_AGREGADO=off`), como todo lo que mueve dinero en esta
// casa. Con el interruptor apagado nada de esto llega a ejecutarse.
import { sql } from 'drizzle-orm';
import { numeroSincrono } from './ajustes.js';

export const cobroAgregadoActivo = () =>
  String(process.env.COBRO_AGREGADO || 'off').toLowerCase() === 'on';

const nuevoId = () => 'LIQ' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();

/** Cuándo se le paga a la tienda: los días del contrato, contados desde la entrega. */
export function venceEl(entregado: boolean, desde: Date = new Date()): Date {
  const dias = entregado ? numeroSincrono('LIQUIDACION_DIAS') : numeroSincrono('LIQUIDACION_DIAS_SIN_ENTREGA');
  const d = new Date(desde);
  d.setDate(d.getDate() + Math.max(0, Math.floor(dias || 0)));
  return d;
}

/**
 * Apunta lo que se le debe a una tienda por un pedido cobrado por la
 * plataforma. Se llama justo después de crear el pedido, dentro del mismo
 * flujo: una deuda que se apunta «luego» es una deuda que algún día no se
 * apunta.
 */
export async function anotarLiquidacion(db: any, a: {
  pedidoId: string; vendedorId: string; brutoCentimos: number; envioCentimos: number;
  moneda?: string; entregado?: boolean;
}): Promise<{ neto: number; comision: number } | null> {
  const bps = Math.max(0, Math.min(10000, Math.round(numeroSincrono('COMISION_BPS'))));
  // La comisión va sobre los productos, nunca sobre el porte: el porte no es
  // margen de la tienda, es un coste que adelanta.
  const base = Math.max(0, a.brutoCentimos - a.envioCentimos);
  const comision = Math.round((base * bps) / 10000);
  const neto = Math.max(0, a.brutoCentimos - comision);
  try {
    await db.execute(sql`
      INSERT INTO liquidaciones (id, pedido_id, vendedor_user_id, bruto_centimos, envio_centimos,
                                 comision_centimos, comision_bps, neto_centimos, moneda, estado, vence_el)
      VALUES (${nuevoId()}, ${a.pedidoId}, ${a.vendedorId}, ${a.brutoCentimos}, ${a.envioCentimos},
              ${comision}, ${bps}, ${neto}, ${(a.moneda || 'EUR').toUpperCase()}, 'pendiente', ${venceEl(!!a.entregado).toISOString()})
    `);
  } catch (e: any) {
    // El índice único: el aviso del proveedor de pago llegó dos veces. No es
    // un fallo, es la garantía de que no se debe dos veces lo mismo.
    const t = `${e?.message || ''} ${e?.cause?.message || ''}`;
    if (/liquidaciones_una_por_pedido_idx|duplicate key/i.test(t)) return null;
    throw e;
  }
  return { neto, comision };
}

/** Retiene lo que se le debía por un pedido: hay devolución o reclamación. */
export async function retenerLiquidacion(db: any, pedidoId: string, motivo: string) {
  await db.execute(sql`
    UPDATE liquidaciones SET estado = 'retenida', motivo_retencion = ${motivo.slice(0, 300)}, updated_at = now()
    WHERE pedido_id = ${pedidoId} AND estado IN ('pendiente', 'lista')
  `);
}
/** Cancela la deuda (devolución aceptada antes de pagar a la tienda). */
export async function cancelarLiquidacion(db: any, pedidoId: string, motivo: string) {
  await db.execute(sql`
    UPDATE liquidaciones SET estado = 'cancelada', motivo_retencion = ${motivo.slice(0, 300)}, updated_at = now()
    WHERE pedido_id = ${pedidoId} AND estado IN ('pendiente', 'lista', 'retenida')
  `);
}

/**
 * El barrido: marca «listas» las vencidas y transfiere el dinero a cada
 * tienda. Con el interruptor apagado calcula y canta, pero no mueve nada.
 * Devuelve lo que hizo y lo que habría hecho.
 */
export async function pagarLiquidaciones(db: any, stripeDe: () => any): Promise<{
  activo: boolean; vencidas: number; pagadas: number; sin_cuenta: number; total_centimos: number; detalle: any[];
}> {
  // Vencen las de pedidos que no están devueltos ni cancelados.
  await db.execute(sql`
    UPDATE liquidaciones l SET estado = 'lista', updated_at = now()
    FROM pedidos p
    WHERE l.pedido_id = p.id AND l.estado = 'pendiente' AND l.vence_el <= now()
      AND p.estado NOT IN ('devuelto', 'cancelado')
  `);
  const listas = (await db.execute(sql`
    SELECT l.*, sa.stripe_account_id, sa.charges_enabled
    FROM liquidaciones l
    LEFT JOIN stripe_accounts sa ON sa.user_id = l.vendedor_user_id
    WHERE l.estado = 'lista'
    ORDER BY l.vence_el
    LIMIT 100
  `)).rows as any[];

  const activo = cobroAgregadoActivo();
  const detalle: any[] = [];
  let pagadas = 0, sinCuenta = 0, total = 0;

  for (const l of listas) {
    if (!l.stripe_account_id) {
      sinCuenta++;
      detalle.push({ id: l.id, vendedor: l.vendedor_user_id, neto: l.neto_centimos, estado: 'sin_cuenta_de_cobro' });
      continue;
    }
    total += Number(l.neto_centimos);
    if (!activo) {
      detalle.push({ id: l.id, vendedor: l.vendedor_user_id, neto: l.neto_centimos, estado: 'se_pagaria' });
      continue;
    }
    try {
      const stripe = stripeDe();
      const t = await stripe.transfers.create({
        amount: Number(l.neto_centimos),
        currency: String(l.moneda || 'EUR').toLowerCase(),
        destination: l.stripe_account_id,
        description: `Liquidación del pedido ${l.pedido_id}`,
        metadata: { liquidacion_id: l.id, pedido_id: l.pedido_id },
      }, { idempotencyKey: `liq_${l.id}` });   // el mismo id nunca paga dos veces
      await db.execute(sql`
        UPDATE liquidaciones SET estado = 'pagada', pagada_en = now(), transferencia_ref = ${t.id}, updated_at = now()
        WHERE id = ${l.id}
      `);
      pagadas++;
      detalle.push({ id: l.id, vendedor: l.vendedor_user_id, neto: l.neto_centimos, estado: 'pagada', ref: t.id });
    } catch (e: any) {
      console.error(`[liquidaciones] no se ha podido pagar ${l.id}: ${e?.message}`);
      detalle.push({ id: l.id, vendedor: l.vendedor_user_id, neto: l.neto_centimos, estado: 'fallida', error: String(e?.message || '').slice(0, 200) });
    }
  }
  if (listas.length) {
    console.log(`[liquidaciones] ${listas.length} vencidas · ${activo ? `${pagadas} pagadas` : 'interruptor apagado: no se ha movido nada'} · ${sinCuenta} sin cuenta de cobro`);
  }
  return { activo, vencidas: listas.length, pagadas, sin_cuenta: sinCuenta, total_centimos: total, detalle };
}
