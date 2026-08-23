// ============================================================================
// AVISOS POR WHATSAPP (2026-08-24, prog7) — comercio F6
// ============================================================================
// Eugenio: «les mandamos un whatsapp, no un email, que es más moderno,
// montémoslo». Esto es el canal, y nace con DOS capas a propósito:
//
//  1. LO QUE FUNCIONA HOY, SIN NINGUNA CUENTA NI CLAVE: un enlace `wa.me` con
//     el texto ya escrito. El vendedor pulsa y se abre su WhatsApp con el
//     mensaje redactado para el comprador (y al revés). No lo manda la
//     plataforma: lo manda la persona, desde su número. Cero coste, cero
//     permisos, funciona esta tarde.
//
//  2. EL ENVÍO AUTOMÁTICO, APAGADO: la API oficial de WhatsApp (Cloud API de
//     Meta). Para que esto envíe de verdad hacen falta cosas que NO son
//     programación y que solo puede hacer Eugenio:
//       · una cuenta de Meta Business verificada,
//       · un número dedicado a la plataforma (no su móvil personal),
//       · y PLANTILLAS APROBADAS por Meta: un negocio no puede escribir el
//         primero con texto libre; solo con plantillas revisadas («utility»,
//         que es justo la categoría de «tu pedido va en camino»).
//     Mientras falte cualquiera de esas tres, `WHATSAPP_ENVIO` se queda en
//     `off`: aquí se calcula el mensaje, se anota en `whatsapp_enviados` como
//     `simulado` y NO sale nada. Así el día que estén las tres, se enciende un
//     interruptor y empieza a enviar sin tocar una línea.
//
// NUNCA se envía a quien no dio su número para esto, y nunca dos veces el
// mismo aviso (índice único de la 0112).
import { sql } from 'drizzle-orm';
import { normalizarTelefono } from '../utils/telefono.js';

/** La versión de la API de Meta contra la que se habla. */
const VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

export type MotivoWhatsApp =
  | 'compra_hecha'      // al comprador: su código y dónde ver el pedido
  | 'venta_nueva'       // al vendedor: te han comprado
  | 'pedido_enviado'    // al comprador: ha salido (+ seguimiento)
  | 'pedido_entregado'  // al comprador: consta entregado
  | 'devolucion';       // al comprador: se ha devuelto

/**
 * Las plantillas de Meta, por motivo. El NOMBRE tiene que coincidir con el de
 * la plantilla aprobada en el panel de Meta; los parámetros van en orden.
 * Si Eugenio las nombra de otra forma, se cambian aquí y en ningún otro sitio.
 */
export const PLANTILLAS: Record<MotivoWhatsApp, string> = {
  compra_hecha: process.env.WHATSAPP_PLANTILLA_COMPRA || 'compra_hecha',
  venta_nueva: process.env.WHATSAPP_PLANTILLA_VENTA || 'venta_nueva',
  pedido_enviado: process.env.WHATSAPP_PLANTILLA_ENVIADO || 'pedido_enviado',
  pedido_entregado: process.env.WHATSAPP_PLANTILLA_ENTREGADO || 'pedido_entregado',
  devolucion: process.env.WHATSAPP_PLANTILLA_DEVOLUCION || 'pedido_devuelto',
};

export const modoWhatsApp = (): 'off' | 'on' =>
  String(process.env.WHATSAPP_ENVIO || 'off').toLowerCase() === 'on' ? 'on' : 'off';

/** ¿Está todo lo que hace falta para enviar de verdad? Se dice, no se adivina. */
export function estadoWhatsApp() {
  const token = !!process.env.WHATSAPP_TOKEN;
  const numero = !!process.env.WHATSAPP_PHONE_ID;
  const modo = modoWhatsApp();
  return {
    modo,
    tiene_token: token,
    tiene_numero: numero,
    envia: modo === 'on' && token && numero,
    // Lo que falta, en palabras de quien tiene que hacerlo.
    falta: [
      !token ? 'la clave de la API (WHATSAPP_TOKEN)' : null,
      !numero ? 'el identificador del número (WHATSAPP_PHONE_ID)' : null,
      modo !== 'on' ? 'encender WHATSAPP_ENVIO=on' : null,
    ].filter(Boolean) as string[],
  };
}

const nuevoId = () => 'WA' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();

/**
 * Manda un aviso por WhatsApp — o lo anota sin mandarlo, si está apagado.
 * Devuelve qué pasó, y NUNCA lanza: un aviso que falla no puede tumbar una
 * compra que ya está pagada.
 */
export async function avisarPorWhatsApp(db: any, a: {
  telefono: string | null | undefined;
  userId?: string | null;
  motivo: MotivoWhatsApp;
  entidadTipo?: string | null;
  entidadId?: string | null;
  /** El texto legible: es lo que se guarda y lo que se enviaría sin plantilla. */
  texto: string;
  /** Los huecos de la plantilla, en orden. */
  parametros?: string[];
}): Promise<{ estado: 'sin_telefono' | 'repetido' | 'simulado' | 'enviado' | 'fallido'; detalle?: string }> {
  const numero = normalizarTelefono(a.telefono);
  if (!numero) return { estado: 'sin_telefono' };
  const { envia } = estadoWhatsApp();
  let respuesta: string | null = null;
  let estado: 'simulado' | 'enviado' | 'fallido' = envia ? 'enviado' : 'simulado';

  if (envia) {
    try {
      const r = await fetch(`https://graph.facebook.com/${VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: numero,
          type: 'template',
          template: {
            name: PLANTILLAS[a.motivo],
            language: { code: process.env.WHATSAPP_IDIOMA || 'es' },
            components: (a.parametros && a.parametros.length)
              ? [{ type: 'body', parameters: a.parametros.map(t => ({ type: 'text', text: String(t).slice(0, 200) })) }]
              : [],
          },
        }),
      });
      const cuerpo = await r.text();
      respuesta = cuerpo.slice(0, 500);
      if (!r.ok) estado = 'fallido';
    } catch (e: any) {
      estado = 'fallido';
      respuesta = String(e?.message || e).slice(0, 500);
    }
  }

  try {
    await db.execute(sql`
      INSERT INTO whatsapp_enviados (id, user_id, telefono, motivo, entidad_tipo, entidad_id, plantilla, texto, estado, respuesta)
      VALUES (${nuevoId()}, ${a.userId || null}, ${numero}, ${a.motivo}, ${a.entidadTipo || null}, ${a.entidadId || null},
              ${PLANTILLAS[a.motivo]}, ${a.texto}, ${estado}, ${respuesta})
    `);
  } catch (e: any) {
    // El índice único: ese aviso ya se mandó. No es un fallo, es la garantía.
    const texto = `${e?.message || ''} ${e?.cause?.message || ''}`;
    if (/whatsapp_enviados_una_vez_idx|duplicate key/i.test(texto)) return { estado: 'repetido' };
    console.error('[whatsapp] no se ha podido anotar el aviso:', e?.message);
  }
  if (estado === 'fallido') console.error(`[whatsapp] fallo al enviar «${a.motivo}» a ${numero}: ${respuesta}`);
  return { estado, detalle: respuesta || undefined };
}

/**
 * El enlace `wa.me` — la capa que funciona HOY. Abre el WhatsApp de quien
 * pulsa con el texto ya escrito. No manda nada la plataforma.
 */
export function enlaceWa(telefono: string | null | undefined, texto: string): string | null {
  const numero = normalizarTelefono(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto.slice(0, 900))}`;
}
